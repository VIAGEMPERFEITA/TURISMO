import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const origins = new Set([
  "https://viagemperfeita.github.io",
  "https://viagemperfeitaturismo.com.br",
  "https://www.viagemperfeitaturismo.com.br",
  "http://localhost:3000",
]);

const clean = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);
const cors = (request: Request) => {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": origins.has(origin) ? origin : "https://www.viagemperfeitaturismo.com.br",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};
const reply = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors(request), "Content-Type": "application/json" },
});
const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
};
const encryptionKey = async (secret: string) => crypto.subtle.importKey(
  "raw",
  await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  { name: "AES-GCM" },
  false,
  ["encrypt"],
);

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(request) });
  if (request.method !== "POST") return reply(request, { error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("TRAVELER_DATA_ENCRYPTION_KEY");
  if (!supabaseUrl || !serviceKey || !secret) return reply(request, { error: "service_unavailable" }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await request.json().catch(() => ({}));
  const action = clean(body.action, 30);
  const token = clean(body.token, 200);
  if (!token) return reply(request, { error: "invalid_link" }, 400);
  const tokenHash = await sha256(token);
  const result = await admin.from("secure_traveler_intakes")
    .select("id,organization_id,conversation_id,lead_id,status,traveler_count,expires_at")
    .eq("token_hash", tokenHash).maybeSingle();
  const intake = result.data;
  if (!intake || intake.status !== "pendente" || new Date(intake.expires_at).getTime() < Date.now()) {
    return reply(request, { error: "invalid_or_expired_link" }, 410);
  }
  if (action === "context") {
    return reply(request, { traveler_count: intake.traveler_count, expires_at: intake.expires_at });
  }
  if (action !== "submit") return reply(request, { error: "invalid_action" }, 400);
  const travelers = Array.isArray(body.travelers) ? body.travelers.slice(0, intake.traveler_count) : [];
  if (travelers.length !== intake.traveler_count) return reply(request, { error: "invalid_travelers" }, 400);
  const normalized = travelers.map((traveler: any) => ({
    full_name: clean(traveler.full_name, 160),
    birth_date: clean(traveler.birth_date, 10),
    rg: clean(traveler.rg, 30),
    cpf: clean(traveler.cpf, 14),
    passport_number: clean(traveler.passport_number, 30),
    address: clean(traveler.address, 240),
    postal_code: clean(traveler.postal_code, 12),
    email: clean(traveler.email, 320).toLowerCase(),
    phone: clean(traveler.phone, 24),
  }));
  if (normalized.some((item: any) => !item.full_name || !item.birth_date || !item.cpf || !item.email || !item.phone)) {
    return reply(request, { error: "required_fields_missing" }, 400);
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(JSON.stringify({ travelers: normalized, consented_at: new Date().toISOString() })),
  );
  const update = await admin.from("secure_traveler_intakes").update({
    status: "preenchido",
    payload_ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    payload_iv: bytesToBase64(iv),
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", intake.id).eq("status", "pendente");
  if (update.error) return reply(request, { error: "submit_failed" }, 500);
  const staff = await admin.from("profiles").select("id")
    .eq("organization_id", intake.organization_id).eq("active", true)
    .in("role", ["administrador", "gestor", "consultor"]);
  if ((staff.data || []).length) await admin.from("notifications").insert((staff.data || []).map((profile: any) => ({
    organization_id: intake.organization_id,
    user_id: profile.id,
    type: "cadastro_reserva_recebido",
    title: "Formulário seguro recebido",
    body: "Os dados de viajante foram recebidos com segurança e aguardam conferência da equipe.",
    metadata: { conversation_id: intake.conversation_id, lead_id: intake.lead_id, intake_id: intake.id, sensitive_data_included: false },
  })));
  await admin.from("tasks").insert({
    organization_id: intake.organization_id,
    lead_id: intake.lead_id,
    conversation_id: intake.conversation_id,
    title: "Conferir cadastro seguro e concluir reserva",
    description: "Abrir o cadastro protegido, validar os viajantes e prosseguir com contrato e pagamento.",
    task_type: "reserva",
    priority: "urgente",
    status: "pendente",
    due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
  return reply(request, { success: true });
});
