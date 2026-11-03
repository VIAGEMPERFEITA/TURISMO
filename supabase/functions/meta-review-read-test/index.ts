import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const clean = (value: unknown, max = 4096) => typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "service_not_configured" }, 503);

  const authorization = request.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) return json({ error: "authentication_required" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await admin.from("profiles").select("role,organization_id,active")
    .eq("id", authData.user.id).maybeSingle();
  if (!profile?.active || !["administrador", "gestor"].includes(profile.role)) return json({ error: "forbidden" }, 403);

  const checkedAt = new Date().toISOString();
  const result: Record<string, unknown> = { ok: true, checkedAt, readOnly: true };

  const { data: instagram } = await admin.from("channel_accounts")
    .select("id,external_account_id,credential_secret_name,settings")
    .eq("organization_id", profile.organization_id).eq("channel", "instagram").eq("status", "connected")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (instagram?.credential_secret_name) {
    const { data: vaultToken } = await admin.rpc("get_instagram_access_token", {
      target_secret_name: instagram.credential_secret_name,
    });
    const token = clean(vaultToken);
    const accountId = clean(instagram.settings?.graph_account_id || instagram.external_account_id, 180);
    if (token && accountId) {
      const mediaUrl = new URL(`https://graph.instagram.com/v25.0/${encodeURIComponent(accountId)}/media`);
      mediaUrl.searchParams.set("fields", "id");
      mediaUrl.searchParams.set("limit", "1");
      const mediaResponse = await fetch(mediaUrl, { headers: { Authorization: `Bearer ${token}` } });
      const mediaBody = await mediaResponse.json().catch(() => ({}));
      const mediaId = clean(mediaBody?.data?.[0]?.id, 180);
      let commentsStatus: number | null = null;
      let commentsCount = 0;
      if (mediaResponse.ok && mediaId) {
        const commentsUrl = new URL(`https://graph.instagram.com/v25.0/${encodeURIComponent(mediaId)}/comments`);
        commentsUrl.searchParams.set("fields", "id");
        commentsUrl.searchParams.set("limit", "1");
        const commentsResponse = await fetch(commentsUrl, { headers: { Authorization: `Bearer ${token}` } });
        const commentsBody = await commentsResponse.json().catch(() => ({}));
        commentsStatus = commentsResponse.status;
        commentsCount = Array.isArray(commentsBody?.data) ? commentsBody.data.length : 0;
      }
      result.instagram = {
        account: instagram.settings?.username || "viagemperfeitatrip",
        mediaStatus: mediaResponse.status,
        mediaFound: Boolean(mediaId),
        commentsStatus,
        commentsCount,
        permissionCallCompleted: mediaResponse.ok && commentsStatus === 200,
      };
    } else result.instagram = { error: "credential_or_account_missing" };
  } else result.instagram = { error: "connected_account_missing" };

  const { data: messenger } = await admin.from("channel_accounts")
    .select("id,external_account_id,credential_secret_name")
    .eq("organization_id", profile.organization_id).eq("channel", "messenger").eq("status", "connected")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (messenger?.external_account_id) {
    let token = clean(Deno.env.get("META_FACEBOOK_PAGE_ACCESS_TOKEN"));
    if (messenger.credential_secret_name) {
      const { data: vaultToken } = await admin.rpc("get_facebook_access_token", {
        target_secret_name: messenger.credential_secret_name,
      });
      token = clean(vaultToken) || token;
    }
    if (token) {
      const conversationsUrl = new URL(`https://graph.facebook.com/v25.0/${encodeURIComponent(messenger.external_account_id)}/conversations`);
      conversationsUrl.searchParams.set("fields", "id");
      conversationsUrl.searchParams.set("limit", "1");
      const conversationsResponse = await fetch(conversationsUrl, { headers: { Authorization: `Bearer ${token}` } });
      const conversationsBody = await conversationsResponse.json().catch(() => ({}));
      result.messenger = {
        status: conversationsResponse.status,
        conversationsFound: Array.isArray(conversationsBody?.data) ? conversationsBody.data.length : 0,
        permissionCallCompleted: conversationsResponse.ok,
      };
    } else result.messenger = { error: "credential_missing" };
  } else result.messenger = { error: "connected_account_missing" };

  await admin.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: authData.user.id,
    action: "meta_review_read_test",
    entity_type: "integration",
    after_data: result,
  });

  const instagramOk = (result.instagram as { permissionCallCompleted?: boolean })?.permissionCallCompleted === true;
  const messengerOk = (result.messenger as { permissionCallCompleted?: boolean })?.permissionCallCompleted === true;
  result.ok = instagramOk && messengerOk;
  return json(result, result.ok ? 200 : 502);
});
