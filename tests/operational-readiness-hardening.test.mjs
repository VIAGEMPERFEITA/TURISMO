import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/202608220001_operational_readiness_hardening.sql",import.meta.url),"utf8");
const worker=readFileSync(new URL("../supabase/functions/campaign-worker/index.ts",import.meta.url),"utf8");
const webhook=readFileSync(new URL("../supabase/functions/whatsapp-webhook/index.ts",import.meta.url),"utf8");
const campaigns=readFileSync(new URL("../components/admin-campaigns.tsx",import.meta.url),"utf8");
const inbox=readFileSync(new URL("../components/whatsapp-inbox.tsx",import.meta.url),"utf8");

test("ciclo de campanha é governado por transições e auditoria",()=>{
 assert.match(migration,/manage_campaign/);
 assert.match(migration,/invalid_campaign_transition/);
 assert.match(migration,/campaign_audit_logs/);
 assert.match(campaigns,/Aprovar/);
 assert.match(campaigns,/Pausar/);
});

test("worker aplica lotes, intervalo e pausa automática",()=>{
 assert.match(worker,/interval_seconds/);
 assert.match(worker,/error_pause_threshold/);
 assert.match(worker,/limite_automatico_de_falhas/);
 assert.match(worker,/next_batch_at/);
});

test("webhook propaga entrega, leitura e resposta para campanha",()=>{
 assert.match(webhook,/campaign_recipients/);
 assert.match(webhook,/provider_\$\{nextStatus/);
 assert.match(webhook,/customer_replied/);
 assert.match(webhook,/replied_at/);
});

test("modelos aprovados são imutáveis e caixa controla não lidas",()=>{
 assert.match(migration,/approved_template_is_immutable_create_new_version/);
 assert.match(migration,/track_inbound_unread/);
 assert.match(inbox,/mark_conversation_read/);
 assert.match(inbox,/Resumo da IA para transferência|Leitura rápida da IA/);
});

test("painel mostra consentimento importado e saúde operacional",()=>{
 assert.match(migration,/operational_readiness_center/);
 assert.match(migration,/Importação VCF/);
 assert.match(campaigns,/Importados aptos/);
 assert.match(campaigns,/Alertas abertos/);
});
