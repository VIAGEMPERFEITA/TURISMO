import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});
const clean = (value: unknown, max = 2000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const digits = (value: unknown) => clean(value, 32).replace(/\D/g, "");
type WhatsAppMessage = Record<string, unknown> & {
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { caption?: string; id?: string };
  video?: { caption?: string; id?: string };
  audio?: { caption?: string; id?: string };
  document?: { caption?: string; id?: string };
};
type WhatsAppContact = { wa_id?: string; profile?: { name?: string } };

async function validSignature(rawBody: string, signature: string, secret: string) {
  if (!signature.startsWith("sha256=") || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}

function messageContent(message: WhatsAppMessage) {
  const type = clean(message?.type, 32) || "texto";
  if (type === "text") return { type: "texto", body: clean(message?.text?.body, 4096), mediaId: null };
  if (type === "button") return { type: "texto", body: clean(message?.button?.text, 4096), mediaId: null };
  if (type === "interactive") return {
    type: "texto",
    body: clean(message?.interactive?.button_reply?.title || message?.interactive?.list_reply?.title, 4096),
    mediaId: null,
  };
  const mapped: Record<string, string> = { image: "imagem", video: "video", audio: "audio", document: "documento" };
  return {
    type: mapped[type] || "sistema",
    body: clean((message[type] as { caption?: string } | undefined)?.caption || `[${type}]`, 4096),
    mediaId: clean((message[type] as { id?: string } | undefined)?.id, 256) || null,
  };
}

Deno.serve(async request => {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") || "";
    const verifyToken = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") || "";
    if (mode === "subscribe" && verifyToken && token === verifyToken) return new Response(challenge, { status: 200 });
    return json({ error: "verification_failed" }, 403);
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";
  const appSecret = Deno.env.get("META_WHATSAPP_APP_SECRET") || "";
  if (!await validSignature(rawBody, signature, appSecret)) return json({ error: "invalid_signature" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const workerSecret = Deno.env.get("WHATSAPP_WORKER_SECRET") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "service_unavailable" }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const payload = JSON.parse(rawBody);
    if (payload?.object !== "whatsapp_business_account") return json({ received: true, ignored: true });

    for (const entry of payload.entry || []) for (const change of entry.changes || []) {
      if (change?.field !== "messages") continue;
      const value = change.value || {};
      const phoneNumberId = clean(value?.metadata?.phone_number_id, 128);
      const { data: account } = await admin.from("whatsapp_accounts")
        .select("id,organization_id,status")
        .eq("phone_number_id", phoneNumberId)
        .in("status", ["teste", "ativo"])
        .maybeSingle();
      if (!account) continue;

      for (const status of value.statuses || []) {
        const externalId = clean(status?.id, 256);
        if (!externalId) continue;
        const providerStatus: Record<string, string> = { sent: "enviado", delivered: "entregue", read: "lido", failed: "falhou", deleted: "excluido" };
        const normalizedStatus = providerStatus[clean(status?.status, 32)] || "aceito";
        const statusEventId = `status:${externalId}:${clean(status?.status, 32)}:${clean(status?.timestamp, 32)}`;
        await admin.from("webhook_events").upsert({
          organization_id: account.organization_id,
          provider: "meta_whatsapp",
          external_id: statusEventId,
          event_type: "message_status",
          status: "processado",
          payload: { phone_number_id: phoneNumberId, status },
          attempts: 1,
          processed_at: new Date().toISOString(),
        }, { onConflict: "provider,external_id", ignoreDuplicates: true });
        const { data: outbound } = await admin.from("whatsapp_outbound_messages").select("id,message_id").eq("external_message_id", externalId).maybeSingle();
        if (outbound) await admin.from("whatsapp_message_status_history").insert({
            organization_id: account.organization_id,
            outbound_id: outbound.id,
            message_id: outbound.message_id || null,
            external_message_id: externalId,
            status: normalizedStatus,
            error_code: clean(status?.errors?.[0]?.code, 80) || null,
            error_message: clean(status?.errors?.[0]?.title || status?.errors?.[0]?.message, 500) || null,
            provider_timestamp: status?.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : null,
            metadata: { recipient_id: status?.recipient_id, conversation: status?.conversation, pricing: status?.pricing },
          });
        const deliveryStatus = normalizedStatus === "excluido" ? null : normalizedStatus;
        if (outbound?.id && deliveryStatus) await admin.from("whatsapp_outbound_messages").update({ status: deliveryStatus, updated_at: new Date().toISOString() }).eq("id", outbound.id);
        if (outbound?.message_id && deliveryStatus) await admin.from("messages").update({ delivery_status: deliveryStatus }).eq("id", outbound.message_id);
      }

      for (const message of value.messages || []) {
        const externalId = clean(message?.id, 256);
        const waId = digits(message?.from);
        if (!externalId || !waId) continue;
        const eventExternalId = `message:${externalId}`;
        const { data: claimedEvent, error: claimError } = await admin.from("webhook_events").insert({
          organization_id: account.organization_id,
          provider: "meta_whatsapp",
          external_id: eventExternalId,
          event_type: "message_received",
          status: "processando",
          payload: { entry_id: entry?.id, phone_number_id: phoneNumberId, message },
          attempts: 1,
        }).select("id").maybeSingle();
        if (claimError || !claimedEvent) continue;

        try {
          const contact = (value.contacts || []).find((item: WhatsAppContact) => digits(item?.wa_id) === waId);
          const contactName = clean(contact?.profile?.name, 160) || `WhatsApp ${waId.slice(-4)}`;
          let { data: lead } = await admin.from("leads").select("id").eq("organization_id", account.organization_id).eq("phone_normalized", waId).is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (!lead) {
            const created = await admin.from("leads").insert({
              organization_id: account.organization_id,
              name: contactName,
              phone: waId,
              phone_normalized: waId,
              source: "WhatsApp",
              source_detail: "WhatsApp Cloud API",
              consent: true,
              consent_at: new Date().toISOString(),
              whatsapp_started: true,
            }).select("id").single();
            if (created.error) throw created.error;
            lead = created.data;
          }

          let { data: conversation } = await admin.from("conversations").select("id,status,control_mode")
            .eq("organization_id", account.organization_id).eq("channel", "whatsapp")
            .eq("whatsapp_account_id", account.id).eq("external_thread_id", waId)
            .neq("status", "encerrada").order("updated_at", { ascending: false }).limit(1).maybeSingle();
          if (!conversation) {
            const { data: defaultQueue } = await admin.from("inbox_queues").select("id").eq("organization_id", account.organization_id).eq("is_default", true).eq("active", true).maybeSingle();
            const created = await admin.from("conversations").insert({
              organization_id: account.organization_id,
              lead_id: lead.id,
              channel: "whatsapp",
              external_thread_id: waId,
              whatsapp_account_id: account.id,
              queue_id: defaultQueue?.id || null,
              contact_wa_id: waId,
              status: "ia_ativa",
              control_mode: "ia",
              ai_managed: true,
              consent_at: new Date().toISOString(),
            }).select("id,status,control_mode").single();
            if (created.error) throw created.error;
            conversation = created.data;
          }

          const content = messageContent(message as WhatsAppMessage);
          const providerTimestamp = message?.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString();
          const inserted = await admin.from("messages").insert({
            conversation_id: conversation.id,
            direction: "entrada",
            message_type: content.type,
            body: content.body,
            external_message_id: externalId,
            provider: "meta_whatsapp",
            whatsapp_account_id: account.id,
            author_type: "cliente",
            provider_timestamp: providerTimestamp,
            reply_to_external_message_id: clean(message?.context?.id, 256) || null,
            metadata: { media_id: content.mediaId, raw_type: message?.type },
            sent_at: providerTimestamp,
          }).select("id").single();
          if (inserted.error) throw inserted.error;
          await admin.from("conversations").update({
            last_customer_message_at: providerTimestamp,
            last_message_at: providerTimestamp,
            customer_service_window_expires_at: new Date(new Date(providerTimestamp).getTime() + 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", conversation.id);
          await admin.from("webhook_events").update({ status: "processado", processed_at: new Date().toISOString() }).eq("id", claimedEvent.id);

          if (workerSecret && inserted.data?.id) {
            const orchestration = fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-orchestrator`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                apikey: serviceKey,
                "x-worker-secret": workerSecret,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                conversationId: conversation.id,
                sourceMessageId: inserted.data.id,
              }),
            }).catch(() => undefined);
            const edgeRuntime = (globalThis as any).EdgeRuntime;
            if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(orchestration);
            else void orchestration;
          }
        } catch (error) {
          await admin.from("webhook_events").update({
            status: "falhou",
            last_error: error instanceof Error ? error.message.slice(0, 500) : "processing_failed",
            processed_at: new Date().toISOString(),
          }).eq("id", claimedEvent.id);
        }
      }
    }
    return json({ received: true });
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
});
