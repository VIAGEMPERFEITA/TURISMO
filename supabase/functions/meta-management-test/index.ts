import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const metaAccessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") || "";
  if (!supabaseUrl || !anonKey || !serviceKey || !metaAccessToken) {
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
    .select("waba_id")
    .eq("organization_id", profile.organization_id)
    .not("waba_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // The test WABA is used only until the official number finishes Embedded Signup.
  const wabaId = account?.waba_id || "1077957561405552";
  const response = await fetch(
    `https://graph.facebook.com/v25.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${metaAccessToken}` } },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(
      {
        error: "meta_management_call_failed",
        status: response.status,
        metaCode: result.error?.code,
        metaType: result.error?.type,
      },
      502,
    );
  }

  return json({
    ok: true,
    status: response.status,
    count: Array.isArray(result.data) ? result.data.length : 0,
    checkedAt: new Date().toISOString(),
  });
});
