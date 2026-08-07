import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const inbox=readFileSync(new URL("../components/whatsapp-inbox.tsx",import.meta.url),"utf8");
const sender=readFileSync(new URL("../supabase/functions/whatsapp-agent-send/index.ts",import.meta.url),"utf8");
const shell=readFileSync(new URL("../components/admin-shell.tsx",import.meta.url),"utf8");
const membership=readFileSync(new URL("../supabase/migrations/202608060004_default_inbox_membership.sql",import.meta.url),"utf8");

test("caixa compartilhada integra assumir, transferir, devolver e enviar",()=>{
  for(const action of ["claim_conversation","transfer_conversation","return_conversation_to_ai","whatsapp-agent-send"]){
    assert.match(inbox,new RegExp(action));
  }
  assert.doesNotMatch(inbox,/META_WHATSAPP_ACCESS_TOKEN|WHATSAPP_WORKER_SECRET/);
});

test("envio passa por sessão autenticada e dispatcher protegido",()=>{
  assert.match(sender,/auth\.getUser\(\)/);
  assert.match(sender,/enqueue_whatsapp_text/);
  assert.match(sender,/x-worker-secret/);
  assert.match(sender,/WHATSAPP_WORKER_SECRET/);
});

test("módulo atendimento aparece no CRM apenas para equipe comercial",()=>{
  assert.match(shell,/\/admin\/atendimento/);
  assert.match(membership,/administrador','gestor','consultor/);
});

test("equipe ativa entra automaticamente na fila padrão",()=>{
  assert.match(membership,/sync_default_inbox_membership/);
  assert.match(membership,/administrador','gestor','consultor/);
  assert.match(membership,/is_default=true/);
});
