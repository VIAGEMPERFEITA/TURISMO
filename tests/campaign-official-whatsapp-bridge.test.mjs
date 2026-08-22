import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("supabase/functions/campaign-worker/index.ts","utf8");
const campaigns=fs.readFileSync("components/admin-campaigns.tsx","utf8");
const connection=fs.readFileSync("components/admin-whatsapp-connection.tsx","utf8");

test("campanha real só usa a conta oficial ativa em coexistência",()=>{
 assert.match(worker,/officialPhone="5531995285665"/);
 assert.match(worker,/coexistence_enabled!==true/);
 assert.match(worker,/official_whatsapp_not_connected/);
 assert.match(worker,/campaign_not_released/);
});

test("worker revalida consentimento e supressão imediatamente antes da fila",()=>{
 assert.match(worker,/contact_consents/);
 assert.match(worker,/purpose","marketing/);
 assert.match(worker,/revoked_at/);
 assert.match(worker,/contact_suppressions/);
 assert.match(worker,/marketing_consent_missing/);
 assert.match(worker,/contact_suppressed/);
 assert.match(worker,/dispatch_blocked/);
});

test("ponte cria fila oficial idempotente e chama o dispatcher homologado",()=>{
 assert.match(worker,/from\("whatsapp_outbound_messages"\)\.insert/);
 assert.match(worker,/idempotencyKey=`campaign:/);
 assert.match(worker,/official_queue_created/);
 assert.match(worker,/functions\/v1\/whatsapp-dispatch/);
 assert.match(worker,/queued_for_official_dispatch/);
});

test("envio real exige modelo aprovado nas duas camadas",()=>{
 assert.match(worker,/approved_template_required/);
 assert.match(worker,/approved_meta_template_required/);
 assert.match(worker,/approved_operational_template_required/);
 assert.match(worker,/whatsapp_templates/);
 assert.match(campaigns,/Modelo aprovado/);
 assert.match(campaigns,/template_id:selectedTemplateId\|\|null/);
});

test("painel distingue aprovação da Meta do número de teste",()=>{
 assert.match(connection,/OFFICIAL_PHONE_E164 = "5531995285665"/);
 assert.match(connection,/Aguardando aprovação da Meta/);
 assert.match(connection,/Webhook \{readiness\.webhook/);
 assert.match(connection,/modelo\(s\) aprovado\(s\)/);
});
