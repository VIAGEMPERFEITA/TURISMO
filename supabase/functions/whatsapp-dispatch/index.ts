import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const clean = (value: unknown, max = 4096) => typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async request => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const workerSecret = Deno.env.get("WHATSAPP_WORKER_SECRET") || "";
  if (!workerSecret || request.headers.get("x-worker-secret") !== workerSecret) return json({ error: "unauthorized" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceKey || !accessToken) return json({ error: "service_unavailable" }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const outboundId = clean((await request.json().catch(() => ({})))?.outboundId, 64);
  if (!outboundId) return json({ error: "outbound_id_required" }, 400);
  const { data: outbound, error } = await admin.from("whatsapp_outbound_messages")
    .select("id,conversation_id,message_id,recipient_wa_id,payload,status,attempts,whatsapp_accounts!inner(phone_number_id,api_version,status)")
    .eq("id", outboundId).single();
  if (error || !outbound) return json({ error: "outbound_not_found" }, 404);
  if (["enviado", "entregue", "lido", "cancelado"].includes(outbound.status)) return json({ status: outbound.status, idempotent: true });
  const account: any = Array.isArray(outbound.whatsapp_accounts) ? outbound.whatsapp_accounts[0] : outbound.whatsapp_accounts;
  if (!account?.phone_number_id || !["teste", "ativo"].includes(account.status)) return json({ error: "account_not_active" }, 409);
  if (outbound.attempts >= 5) return json({ error: "retry_limit_reached" }, 409);

  const claimed = await admin.from("whatsapp_outbound_messages").update({
    status: "processando",
    processing_at: new Date().toISOString(),
    attempts: outbound.attempts + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", outbound.id).in("status", ["pendente", "falhou"]).select("id").maybeSingle();
  if (!claimed.data) return json({ error: "already_processing" }, 409);

  try {
    const payload = { messaging_product: "whatsapp", recipient_type: "individual", to: outbound.recipient_wa_id, ...outbound.payload };
    const response = await fetch(`https://graph.facebook.com/${account.api_version || "v23.0"}/${account.phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`meta_${response.status}_${clean(result?.error?.code, 40)}_${clean(result?.error?.message, 240)}`);
    const externalId = clean(result?.messages?.[0]?.id, 256);
    const now = new Date().toISOString();
    await admin.from("whatsapp_outbound_messages").update({ status: "enviado", external_message_id: externalId || null, sent_at: now, last_error: null, updated_at: now }).eq("id", outbound.id);
    if (outbound.message_id) await admin.from("messages").update({ external_message_id: externalId || null, provider: "meta_whatsapp", delivery_status: "enviado" }).eq("id", outbound.message_id);
    return json({ status: "enviado", externalMessageId: externalId });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "dispatch_failed";
    const delayMinutes = Math.min(60, 2 ** Math.min(outbound.attempts, 5));
    const nextAttempt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
    await admin.from("whatsapp_outbound_messages").update({ status: "falhou", last_error: message, next_attempt_at: nextAttempt, updated_at: new Date().toISOString() }).eq("id", outbound.id);
    if (outbound.message_id) await admin.from("messages").update({ delivery_status: "falhou", error_message: message }).eq("id", outbound.message_id);
    return json({ status: "falhou", retryAt: nextAttempt }, 502);
  }
});
