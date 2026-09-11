import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const officialPhone = "5531995285665";
const metaAppId = "1295731149305805";
const digitsOnly = (value: unknown) => String(value || "").replace(/\D/g, "");
const normalizedPhone = (value: unknown) => {
  const digits = digitsOnly(value);
  return digits.startsWith("55") && digits.length === 12
    ? `${digits.slice(0, 4)}9${digits.slice(4)}`
    : digits;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "service_not_configured" }, 503);
  }

  const authorization = request.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) return json({ error: "authentication_required" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await admin
    .from("profiles")
    .select("role,organization_id,active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!profile?.active || !["administrador", "gestor"].includes(profile.role)) {
    return json({ error: "forbidden" }, 403);
  }

  const { data: account } = await admin
    .from("whatsapp_accounts")
    .select("waba_id,token_secret_name")
    .eq("organization_id", profile.organization_id)
    .eq("status", "ativo")
    .not("phone_number_id", "is", null)
    .not("waba_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: vaultToken } = account?.token_secret_name
    ? await admin.rpc("get_whatsapp_access_token", {
        target_secret_name: account.token_secret_name,
      })
    : { data: null };
  const metaAccessToken = String(vaultToken || Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || "");
  if (!metaAccessToken) return json({ error: "meta_token_not_configured" }, 503);

  // The test WABA remains an authorized fallback until the definitive account
  // is available. The connected production account is always attempted first.
  const candidates = [...new Set([account?.waba_id, "1077957561405552"].filter(Boolean))];
  const attempts: Array<{ status: number; metaCode?: number; metaType?: string }> = [];

  for (const wabaId of candidates) {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${metaAccessToken}` } },
    );
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      const phones = Array.isArray(result.data) ? result.data : [];
      const official = phones.find(
        (phone: { display_phone_number?: string }) =>
          normalizedPhone(phone.display_phone_number) === officialPhone,
      );
      if (!official) {
        attempts.push({ status: 409, metaType: "official_phone_not_found" });
        continue;
      }

      const subscriptionResponse = await fetch(
        `https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${metaAccessToken}` },
        },
      );
      const subscription = await subscriptionResponse.json().catch(() => ({}));
      if (!subscriptionResponse.ok || subscription.success !== true) {
        attempts.push({
          status: subscriptionResponse.status,
          metaCode: subscription.error?.code,
          metaType: subscription.error?.type || "waba_subscription_failed",
        });
        continue;
      }

      return json({
        ok: true,
        status: response.status,
        count: phones.length,
        wabaId,
        phoneNumberId: official.id,
        officialNumberMatched: true,
        webhookSubscribed: true,
        subscribedAppConfirmed: subscription.success === true,
        subscribedAppId: metaAppId,
        checkedAt: new Date().toISOString(),
      });
    }

    attempts.push({
      status: response.status,
      metaCode: result.error?.code,
      metaType: result.error?.type,
    });
  }

  console.error("meta-management-test failed", attempts);
  return json({ error: "meta_management_call_failed", attempts }, 502);
});
