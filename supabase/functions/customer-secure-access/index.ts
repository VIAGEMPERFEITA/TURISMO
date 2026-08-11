import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://viagemperfeita.github.io",
  "https://viagemperfeitaturismo.com.br",
  "https://www.viagemperfeitaturismo.com.br",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
  "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://www.viagemperfeitaturismo.com.br",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  };
}

function reply(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });
}

function normalize(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "POST") return reply(request, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pepper = Deno.env.get("CUSTOMER_ACCESS_PEPPER");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("CRM_FROM_EMAIL") || "Viagem Perfeita <onboarding@resend.dev>";
  if (!supabaseUrl || !serviceKey || !pepper) return reply(request, { error: "service_unavailable" }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await request.json().catch(() => ({}));
  const action = normalize(body.action, 40);

  if (action === "request_code") {
    const email = normalize(body.email, 320).toLowerCase();
    const generic = { accepted: true, message: "Se o cadastro for localizado, enviaremos um código de acesso." };
    if (!email || !email.includes("@")) return reply(request, generic);
    const customerResult = await admin.from("customers").select("id,organization_id,name,email").ilike("email", email).eq("status", "ativo").is("archived_at", null).maybeSingle();
    const customer = customerResult.data;
    if (!customer) return reply(request, generic);
    const recent = await admin.from("customer_access_challenges").select("id", { count: "exact", head: true }).eq("customer_id", customer.id).gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
    if ((recent.count || 0) >= 3) return reply(request, generic);
    const code = randomCode();
    const challenge = await admin.from("customer_access_challenges").insert({
      organization_id: customer.organization_id,
      customer_id: customer.id,
      channel: "email",
      destination_hash: await hash(`${pepper}:${email}`),
      code_hash: await hash(`${pepper}:${customer.id}:${code}`),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }).select("id").single();
    if (challenge.error) return reply(request, { error: "request_failed" }, 500);
    let delivered = false;
    if (resendKey) {
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: [email], subject: "Código de acesso — Viagem Perfeita", html: `<p>Olá, ${normalize(customer.name, 120)}.</p><p>Seu código de acesso é <strong>${code}</strong>.</p><p>Ele expira em 10 minutos. Não compartilhe este código.</p>` }),
      });
      delivered = sent.ok;
      if (!sent.ok) await admin.from("customer_access_events").insert({ organization_id: customer.organization_id, customer_id: customer.id, event_type: "challenge_delivery_failed", success: false, metadata: { challenge_id: challenge.data.id } });
    }
    await admin.from("customer_access_events").insert({ organization_id: customer.organization_id, customer_id: customer.id, event_type: "challenge_requested", success: delivered, metadata: { challenge_id: challenge.data.id, channel: "email" } });
    if (!delivered) await admin.from("customer_access_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.data.id);
    return reply(request, generic);
  }

  if (action === "verify_code") {
    const challengeId = normalize(body.challenge_id, 64);
    const email = normalize(body.email, 320).toLowerCase();
    const code = normalize(body.code, 6);
    let challengeQuery = admin.from("customer_access_challenges").select("id,organization_id,customer_id,code_hash,expires_at,attempts,consumed_at").is("consumed_at", null).order("created_at", { ascending: false }).limit(1);
    if (challengeId) challengeQuery = challengeQuery.eq("id", challengeId);
    else {
      const customerResult = await admin.from("customers").select("id").ilike("email", email).eq("status", "ativo").is("archived_at", null).maybeSingle();
      if (!customerResult.data) return reply(request, { error: "invalid_or_expired_code" }, 401);
      challengeQuery = challengeQuery.eq("customer_id", customerResult.data.id);
    }
    const challengeResult = await challengeQuery.maybeSingle();
    const challenge = challengeResult.data;
    if (!challenge || challenge.consumed_at || new Date(challenge.expires_at).getTime() < Date.now() || challenge.attempts >= 5) return reply(request, { error: "invalid_or_expired_code" }, 401);
    const valid = challenge.code_hash === await hash(`${pepper}:${challenge.customer_id}:${code}`);
    await admin.from("customer_access_challenges").update({ attempts: challenge.attempts + 1, consumed_at: valid ? new Date().toISOString() : null }).eq("id", challenge.id);
    await admin.from("customer_access_events").insert({ organization_id: challenge.organization_id, customer_id: challenge.customer_id, event_type: "challenge_verified", success: valid, metadata: { challenge_id: challenge.id } });
    if (!valid) return reply(request, { error: "invalid_or_expired_code" }, 401);
    const token = randomToken();
    await admin.from("customer_access_sessions").insert({ organization_id: challenge.organization_id, customer_id: challenge.customer_id, token_hash: await hash(`${pepper}:${token}`), expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
    return reply(request, { token, expires_in: 1800 });
  }

  if (action === "context") {
    const token = normalize(body.token, 200);
    const sessionResult = await admin.from("customer_access_sessions").select("id,organization_id,customer_id,expires_at,revoked_at").eq("token_hash", await hash(`${pepper}:${token}`)).maybeSingle();
    const session = sessionResult.data;
    if (!session || session.revoked_at || new Date(session.expires_at).getTime() < Date.now()) return reply(request, { error: "invalid_session" }, 401);
    const reservations = await admin.from("reservations").select("id,reservation_code,status,payment_status,travelers_count,caravans(name,destination,departure_date,return_date)").eq("customer_id", session.customer_id).is("archived_at", null).order("created_at", { ascending: false }).limit(10);
    const reservationIds = (reservations.data || []).map((item: any) => item.id);
    const payments = reservationIds.length ? await admin.from("payments").select("reservation_id,description,amount,due_date,status,payment_method").in("reservation_id", reservationIds).in("status", ["pendente", "atrasado"]).order("due_date", { ascending: true }).limit(20) : { data: [] };
    const documents = reservationIds.length ? await admin.from("documents").select("reservation_id,document_type,status,expires_at").in("reservation_id", reservationIds).limit(30) : { data: [] };
    await admin.from("customer_access_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", session.id);
    await admin.from("customer_access_events").insert({ organization_id: session.organization_id, customer_id: session.customer_id, event_type: "private_context_accessed", success: true, metadata: {} });
    return reply(request, { reservations: reservations.data || [], pending_payments: payments.data || [], documents: documents.data || [] });
  }

  return reply(request, { error: "invalid_action" }, 400);
});
