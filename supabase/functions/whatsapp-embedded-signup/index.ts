import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const clean = (value: unknown, max = 256) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const appId = Deno.env.get("META_WHATSAPP_APP_ID") || "1295731149305805";
  const appSecret = Deno.env.get("META_WHATSAPP_APP_SECRET") || "";
  if (!supabaseUrl || !anonKey || !serviceKey || !appSecret) {
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

  const body = await request.json().catch(() => ({}));
  const code = clean(body.code, 2048);
  const wabaId = clean(body.waba_id);
  const phoneNumberId = clean(body.phone_number_id);
  if (!code || !wabaId || !phoneNumberId) {
    return json({ error: "incomplete_signup_data" }, 400);
  }

  const tokenUrl = new URL("https://graph.facebook.com/v25.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);
  const tokenResponse = await fetch(tokenUrl);
  const tokenData = await tokenResponse.json().catch(() => ({}));
  const accessToken = clean(tokenData.access_token, 4096);
  if (!tokenResponse.ok || !accessToken) {
    return json({ error: "meta_token_exchange_failed" }, 502);
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const [phoneResponse, wabaResponse] = await Promise.all([
    fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: authHeaders },
    ),
    fetch(`https://graph.facebook.com/v25.0/${wabaId}/phone_numbers?fields=id`, {
      headers: authHeaders,
    }),
  ]);
  const phone = await phoneResponse.json().catch(() => ({}));
  const waba = await wabaResponse.json().catch(() => ({}));
  if (!phoneResponse.ok) return json({ error: "meta_phone_validation_failed" }, 502);
  if (!wabaResponse.ok || !Array.isArray(waba.data)) {
    return json({ error: "meta_waba_validation_failed" }, 502);
  }
  if (!waba.data.some((item: { id?: string }) => item.id === phoneNumberId)) {
    return json({ error: "phone_does_not_belong_to_waba" }, 409);
  }

  const digits = clean(phone.display_phone_number).replace(/\D/g, "");
  if (!/^[1-9][0-9]{9,14}$/.test(digits)) {
    return json({ error: "invalid_phone_number" }, 409);
  }

  const { data: conflictingAccount } = await admin
    .from("whatsapp_accounts")
    .select("organization_id")
    .eq("phone_number_id", phoneNumberId)
    .neq("organization_id", profile.organization_id)
    .maybeSingle();
  if (conflictingAccount) return json({ error: "phone_already_connected" }, 409);

  const secretName = `meta_whatsapp_${profile.organization_id}_${phoneNumberId}`;
  const { error: vaultError } = await admin.rpc("store_whatsapp_access_token", {
    target_secret_name: secretName,
    target_access_token: accessToken,
  });
  if (vaultError) return json({ error: "token_vault_failed" }, 500);

  const connectedAt = new Date().toISOString();
  const account = {
    organization_id: profile.organization_id,
    name: clean(phone.verified_name) || "WhatsApp principal",
    phone_e164: digits,
    display_phone: clean(phone.display_phone_number),
    waba_id: wabaId,
    phone_number_id: phoneNumberId,
    meta_app_id: appId,
    api_version: "v25.0",
    status: "ativo",
    coexistence_enabled: true,
    verified_name: clean(phone.verified_name),
    quality_rating: clean(phone.quality_rating),
    token_secret_name: secretName,
    metadata: { signup: "embedded", session_info_version: 3, connected_at: connectedAt },
    updated_at: connectedAt,
  };
  const { data: updatedAccount, error: updateError } = await admin
    .from("whatsapp_accounts")
    .upsert(account, { onConflict: "organization_id,phone_e164" })
    .select("id")
    .single();
  if (updateError || !updatedAccount) return json({ error: "account_update_failed" }, 500);

  await admin.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: authData.user.id,
    action: "whatsapp_account_connected",
    entity_type: "whatsapp_account",
    entity_id: updatedAccount.id,
    after_data: { phone_number_id: phoneNumberId, waba_id: wabaId, phone_e164: digits },
  });

  return json({
    connected: true,
    phoneNumberId,
    wabaId,
    displayPhone: phone.display_phone_number,
  });
});
