import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const clean = (value: unknown, max = 4096) => typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async request => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const authorization = request.headers.get("authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const workerSecret = Deno.env.get("WHATSAPP_WORKER_SECRET");
  if (!authorization.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey || !workerSecret) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "invalid_session" }, 401);
  const body = await request.json().catch(() => ({}));
  const conversationId = clean(body?.conversationId, 64);
  const message = clean(body?.message, 4096);
  const idempotencyKey = clean(body?.idempotencyKey, 128);
  if (!conversationId || !message || !idempotencyKey) return json({ error: "invalid_request" }, 400);
  const { data: outboundId, error: queueError } = await userClient.rpc("enqueue_whatsapp_text", { target_conversation_id: conversationId, message_body: message, target_idempotency_key: idempotencyKey });
  if (queueError || !outboundId) return json({ error: queueError?.message || "queue_failed" }, 403);
  const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatch`, { method: "POST", headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json", "x-worker-secret": workerSecret }, body: JSON.stringify({ outboundId }) });
  const result = await response.json().catch(() => ({}));
  return json(result, response.status);
});
