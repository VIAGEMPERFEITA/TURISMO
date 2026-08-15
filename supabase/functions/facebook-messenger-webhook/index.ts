import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveMetaChannelAccount } from "../_shared/meta-account.ts";
import { captureWhatsAppConsent } from "../_shared/whatsapp-consent.ts";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "content-type": "application/json" },
  });
const clean = (v: unknown, n = 4000) =>
  typeof v === "string" ? v.trim().slice(0, n) : "";
async function signature(raw: string, sig: string, secret: string) {
  if (!sig.startsWith("sha256=") || !secret) return false;
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const d = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw));
  const e = `sha256=${[...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  if (e.length !== sig.length) return false;
  let m = 0;
  for (let i = 0; i < e.length; i++) m |= e.charCodeAt(i) ^ sig.charCodeAt(i);
  return m === 0;
}
Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (req.method === "GET") {
    const t =
      Deno.env.get("META_MESSENGER_VERIFY_TOKEN") ||
      Deno.env.get("META_FACEBOOK_VERIFY_TOKEN") ||
      "";
    return u.searchParams.get("hub.mode") === "subscribe" &&
      t &&
      u.searchParams.get("hub.verify_token") === t
      ? new Response(u.searchParams.get("hub.challenge") || "")
      : json({ error: "verification_failed" }, 403);
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const raw = await req.text();
  if (
    !(await signature(
      raw,
      req.headers.get("x-hub-signature-256") || "",
      Deno.env.get("META_FACEBOOK_APP_SECRET") || "",
    ))
  )
    return json({ error: "invalid_signature" }, 401);
  const base = Deno.env.get("SUPABASE_URL")!,
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    worker = Deno.env.get("WHATSAPP_WORKER_SECRET") || "";
  if (!base || !key) return json({ error: "service_unavailable" }, 503);
  const db = createClient(base, key, { auth: { persistSession: false } });
  try {
    const p = JSON.parse(raw);
    if (p.object !== "page") return json({ received: true, ignored: true });
    for (const entry of p.entry || []) {
      const account = await resolveMetaChannelAccount(
        db,
        "messenger",
        clean(entry.id, 180),
      );
      if (!account) continue;
      for (const ev of entry.messaging || []) {
        const msg = ev.message || {};
        if (msg.is_echo) continue;
        const sender = clean(ev.sender?.id, 180),
          mid = clean(msg.mid, 220),
          text = clean(msg.text);
        if (!sender || !mid) continue;
        const se = await db
          .from("social_events")
          .upsert(
            {
              organization_id: account.organization_id,
              channel_account_id: account.id,
              event_type: "messenger_dm",
              external_event_id: mid,
              payload_redacted: {
                sender_id: sender,
                text: text || null,
                has_media: Array.isArray(msg.attachments),
              },
              received_at: new Date().toISOString(),
            },
            {
              onConflict: "organization_id,event_type,external_event_id",
              ignoreDuplicates: true,
            },
          )
          .select("id")
          .maybeSingle();
        if (!se.data) continue;
        const ir = await db
          .from("contact_identities")
          .select("id,lead_id,customer_id")
          .eq("organization_id", account.organization_id)
          .eq("identity_type", "facebook")
          .eq("external_id", sender)
          .maybeSingle();
        let ident = ir.data;
        if (!ident) {
          const l = await db
            .from("leads")
            .insert({
              organization_id: account.organization_id,
              name: "Contato do Facebook",
              phone: `facebook:${sender}`,
              phone_normalized: `fb:${sender}`,
              source: "Facebook",
              source_detail: "Messenger",
              consent: false,
            })
            .select("id")
            .single();
          if (l.error) throw l.error;
          const c = await db
            .from("contact_identities")
            .insert({
              organization_id: account.organization_id,
              lead_id: l.data.id,
              channel_account_id: account.id,
              identity_type: "facebook",
              external_id: sender,
              normalized_value: sender,
              display_name: "Contato do Facebook",
              metadata: { source: "messenger" },
            })
            .select("id,lead_id,customer_id")
            .single();
          if (c.error) throw c.error;
          ident = c.data;
        }
        await db
          .from("social_events")
          .update({ contact_identity_id: ident.id })
          .eq("id", se.data.id);
        const cr = await db
          .from("conversations")
          .select("id")
          .eq("organization_id", account.organization_id)
          .eq("channel_account_id", account.id)
          .eq("channel", "facebook")
          .eq("external_thread_id", sender)
          .maybeSingle();
        let conv = cr.data;
        if (!conv) {
          const c = await db
            .from("conversations")
            .insert({
              organization_id: account.organization_id,
              lead_id: ident.lead_id,
              customer_id: ident.customer_id,
              channel: "facebook",
              channel_account_id: account.id,
              external_thread_id: sender,
              status: "ia_ativa",
              control_mode: "ia",
              ai_managed: true,
              last_message_at: new Date().toISOString(),
              customer_service_window_expires_at: new Date(
                Date.now() + 86400000,
              ).toISOString(),
            })
            .select("id")
            .single();
          if (c.error) throw c.error;
          conv = c.data;
        }
        const im = await db
          .from("messages")
          .insert({
            conversation_id: conv.id,
            direction: "entrada",
            message_type: text ? "texto" : "sistema",
            body: text || "Mídia recebida pelo Messenger",
            external_message_id: mid,
            provider: "meta_messenger",
            author_type: "cliente",
            delivery_status: "entregue",
            metadata: { facebook_sender_id: sender },
          })
          .select("id")
          .single();
        if (im.error) {
          if (im.error.code === "23505") continue;
          throw im.error;
        }
        const consent = await captureWhatsAppConsent(db, {
          organizationId: account.organization_id,
          leadId: ident.lead_id,
          conversationId: conv.id,
          text,
          source: "facebook_messenger",
        });
        const ex = await db
          .from("social_automation_executions")
          .insert({
            organization_id: account.organization_id,
            social_event_id: se.data.id,
            contact_identity_id: ident.id,
            channel_account_id: account.id,
            conversation_id: conv.id,
            source_message_id: im.data.id,
            status: "queued",
            current_step: "ai_queued",
            messaging_window_expires_at: new Date(
              Date.now() + 86400000,
            ).toISOString(),
            input_redacted: { event_type: "messenger_dm", sender_id: sender },
          })
          .select("id")
          .single();
        if (ex.error) throw ex.error;
        const h = {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "x-worker-secret": worker,
          "Content-Type": "application/json",
        };
        fetch(`${base}/functions/v1/omnichannel-whatsapp-router`, {
          method: "POST",
          headers: h,
          body: JSON.stringify({
            sourceChannel: "facebook",
            sourceEventId: se.data.id,
            sourceConversationId: conv.id,
            sourceMessageId: im.data.id,
            leadId: ident.lead_id,
            consentConfirmed: consent.captured,
            summary: text || "Mídia recebida pelo Messenger",
          }),
        }).catch(() => {});
        if (text)
          fetch(`${base}/functions/v1/facebook-ai-orchestrator`, {
            method: "POST",
            headers: h,
            body: JSON.stringify({ executionId: ex.data.id }),
          }).catch(() => {});
      }
    }
    return json({ received: true });
  } catch (e) {
    console.error(e);
    return json({ received: true, error: "event_processing_failed" });
  }
});
