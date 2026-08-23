import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/202608120001_instagram_conversation_automation.sql","utf8");
const webhook=fs.readFileSync("supabase/functions/instagram-webhook/index.ts","utf8");
const runtime=fs.readFileSync("supabase/migrations/202608120002_instagram_operational_runtime.sql","utf8");
const orchestrator=fs.readFileSync("supabase/functions/instagram-ai-orchestrator/index.ts","utf8");
const dispatch=fs.readFileSync("supabase/functions/instagram-dispatch/index.ts","utf8");
const ui=fs.readFileSync("components/admin-instagram-automation.tsx","utf8");
const route=fs.readFileSync("app/admin/[module]/page.tsx","utf8");
const oauth=fs.readFileSync("supabase/functions/instagram-oauth-connect/index.ts","utf8");
const activation=fs.readFileSync("supabase/migrations/202608230003_activate_validated_instagram_flows.sql","utf8");

test("Instagram automation is tenant-safe, auditable and blocked before connection",()=>{
 assert.match(migration,/social_automation_executions/);
 assert.match(migration,/organization_id=public\.current_organization_id\(\)/);
 assert.match(migration,/instagram_not_connected/);
 assert.match(migration,/messaging_window_hours/);
});

test("Instagram webhook verifies Meta signature and deduplicates events",()=>{
 assert.match(webhook,/x-hub-signature-256/);
 assert.match(webhook,/META_INSTAGRAM_APP_SECRET/);
 assert.match(webhook,/ignoreDuplicates:true/);
 assert.match(webhook,/eq\("event_type",normalizedEventType\)\.eq\("external_event_id",externalId\)/);
 assert.match(webhook,/24\*60\*60\*1000/);
 assert.match(webhook,/entry\.messaging/);
 assert.match(webhook,/field==="messages"&&value\?\.message/);
 assert.match(webhook,/handleDirectMessage\(admin,entry,value/);
 assert.match(webhook,/instagram-ai-orchestrator/);
});

test("Instagram Direct creates a shared conversation, runs AI and sends through Meta",()=>{
 assert.match(runtime,/instagram_outbound_messages/);
 assert.match(runtime,/conversations_instagram_thread_idx/);
 assert.match(orchestrator,/search_authorized_knowledge/);
 assert.match(orchestrator,/control_mode\s*!==\s*"ia"/);
 assert.match(dispatch,/graph\.instagram\.com\/v25\.0\/me\/messages/);
 assert.match(dispatch,/instagram_access_token_invalid/);
 assert.match(dispatch,/channel_accounts/);
 assert.match(dispatch,/META_INSTAGRAM_ACCESS_TOKEN/);
 assert.match(dispatch,/idempotent:true/);
});

test("Instagram social flows execute comments, stories and keyword DMs without duplicate replies",()=>{
 assert.match(webhook,/selectDirectFlow/);
 assert.match(webhook,/instagram_keyword/);
 assert.match(webhook,/automation_versions/);
 assert.match(webhook,/flowId:flow\.id,socialEventId:inserted\.data\.id,eventType:type/);
 assert.match(webhook,/Date\.now\(\)-24\*60\*60\*1000/);
 assert.match(webhook,/contact_identity_id",identity\.id/);
});

test("CRM offers governed quick automations and human handoff",()=>{
 for(const value of ["instagram_comment","instagram_keyword","instagram_story_mention","instagram_dm","human_handoff","require_approved_knowledge"])assert.match(ui,new RegExp(value));
 assert.match(ui,/Todos os fluxos começam como rascunho/);
});

test("Instagram OAuth callback exchanges the code on its configured return page",()=>{
 assert.match(ui,/AdminInstagramOAuthCallback/);
 assert.match(ui,/functions\.invoke\("instagram-oauth-connect"/);
 assert.match(ui,/Renovar conexão do Instagram/);
 assert.match(ui,/Reconexão necessária/);
 assert.match(ui,/Central da automação da IA/);
 assert.match(ui,/Operação governada/);
 assert.match(ui,/phone_e164","5531995285665/);
 assert.match(ui,/eq\("channel","messenger"\)/);
 assert.match(ui,/runtime\.whatsapp==="ativo"/);
 assert.match(route,/module==="configuracoes"[\s\S]*AdminInstagramOAuthCallback/);
 assert.match(oauth,/META_INSTAGRAM_APP_ID/);
 assert.match(oauth,/admin\/configuracoes\//);
 assert.match(oauth,/String\(shortData\.user_id/);
});

test("Instagram OAuth callback resolves stale credential alerts after reconnection",()=>{
 assert.match(oauth,/integration_health_events/);
 assert.match(oauth,/status:"resolved",resolved_at:connectedAt/);
 assert.match(oauth,/\.eq\("provider","instagram"\)\.eq\("status","open"\)/);
});

test("ativação aprovada libera somente os quatro fluxos validados e exige canal e IA prontos",()=>{
 for(const name of ["Atendimento automático no Direct","Menção ou resposta ao Story","Palavra-chave no Direct","Comentário para conversa"])assert.match(activation,new RegExp(name));
 assert.match(activation,/activated_count<>4/);
 assert.match(activation,/instagram_connector_not_ready/);
 assert.match(activation,/ai_not_ready/);
 assert.match(activation,/validated_matrix','196\/196'/);
});
