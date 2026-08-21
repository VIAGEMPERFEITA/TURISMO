import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

type Contact = { name?: string; phone?: string; phone_normalized?: string; email?: string | null };

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const expected = Deno.env.get("CRM_VCF_IMPORT_TOKEN") || "";
  const provided = request.headers.get("x-import-token") || "";
  if (!expected || provided !== expected) return json({ error: "unauthorized" }, 401);
  try {
    const payload = await request.json() as { batch_id?: string; contacts?: Contact[] };
    const batchId = String(payload.batch_id || "").slice(0, 80);
    const contacts = Array.isArray(payload.contacts) ? payload.contacts.slice(0, 150) : [];
    if (!batchId || contacts.length === 0) return json({ error: "invalid_payload" }, 400);
    const cleaned = contacts.map((contact) => {
      const phoneNormalized = String(contact.phone_normalized || "").replace(/\D/g, "");
      return {
        name: String(contact.name || "Contato importado").trim().slice(0, 160) || "Contato importado",
        phone: String(contact.phone || phoneNormalized).trim().slice(0, 40),
        phone_normalized: phoneNormalized,
        email: String(contact.email || "").trim().toLowerCase().slice(0, 320) || null,
      };
    }).filter((contact) => /^\d{12,15}$/.test(contact.phone_normalized));
    const unique = [...new Map(cleaned.map((contact) => [contact.phone_normalized, contact])).values()];
    if (unique.length === 0) return json({ inserted: 0, existing: 0, rejected: contacts.length });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: organization, error: organizationError } = await admin.from("organizations").select("id").eq("slug", "viagem-perfeita").single();
    if (organizationError || !organization) throw organizationError || new Error("organization_not_found");
    const { data: pipeline } = await admin.from("pipelines").select("id,pipeline_stages!inner(id,code)")
      .eq("organization_id", organization.id).eq("entity_type", "lead").eq("is_default", true).maybeSingle();
    const stages = (pipeline?.pipeline_stages || []) as Array<{ id: string; code: string }>;
    const stageId = stages.find((stage) => stage.code === "novo_lead")?.id || null;
    const phones = unique.map((contact) => contact.phone_normalized);
    const { data: existingRows, error: existingError } = await admin.from("leads").select("phone_normalized")
      .eq("organization_id", organization.id).is("deleted_at", null).in("phone_normalized", phones);
    if (existingError) throw existingError;
    const existing = new Set((existingRows || []).map((row) => row.phone_normalized));
    const newContacts = unique.filter((contact) => !existing.has(contact.phone_normalized));
    let insertedRows: Array<{ id: string }> = [];
    if (newContacts.length) {
      const { data, error } = await admin.from("leads").insert(newContacts.map((contact) => ({
        organization_id: organization.id,
        ...contact,
        source: "Importação VCF",
        source_detail: `Lista de contatos importada com segurança (${batchId})`,
        consent: false,
        pipeline_id: pipeline?.id || null,
        pipeline_stage_id: stageId,
        notes_summary: "Contato importado. Não realizar disparos sem consentimento válido.",
      }))).select("id");
      if (error) throw error;
      insertedRows = data || [];
      if (insertedRows.length) {
        const { error: activityError } = await admin.from("lead_activities").insert(insertedRows.map((row) => ({
          lead_id: row.id,
          activity_type: "contact_imported",
          title: "Contato importado de arquivo VCF",
          metadata: { batch_id: batchId, consent: false, automated_outreach: false },
        })));
        if (activityError) throw activityError;
      }
    }
    return json({ inserted: insertedRows.length, existing: existing.size, rejected: contacts.length - unique.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message.slice(0, 300) : "unknown_error" }, 500);
  }
});
