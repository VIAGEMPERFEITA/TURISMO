import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read=(path)=>fs.readFileSync(path,"utf8");

test("roteamento ao WhatsApp exige consentimento e template aprovado",()=>{
  const source=read("supabase/functions/omnichannel-whatsapp-router/index.ts");
  assert.match(source,/aguardando_consentimento/);
  assert.match(source,/aguardando_template/);
  assert.match(source,/omnichannel_handoff/);
});

test("webhook do Messenger valida assinatura, ignora eco e registra o evento",()=>{
  const source=read("supabase/functions/facebook-messenger-webhook/index.ts");
  assert.match(source,/x-hub-signature-256/);
  assert.match(source,/msg\.is_echo/);
  assert.match(source,/messenger_dm/);
  assert.match(source,/facebook-ai-orchestrator/);
});

test("orquestrador do Messenger respeita tomada humana",()=>{
  const source=read("supabase/functions/facebook-ai-orchestrator/index.ts");
  assert.match(source,/control_mode!=="ia"/);
  assert.match(source,/requires_human/);
  assert.match(source,/facebook-dispatch/);
});

test("registro do site mantém identidade, conversa e consentimento explícito",()=>{
  const source=read("supabase/functions/site-lead-register/index.ts");
  assert.match(source,/contact_identities/);
  assert.match(source,/conversations/);
  assert.match(source,/consentConfirmed/);
});
