import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration=readFileSync(new URL("../supabase/migrations/202609030002_safe_ai_conversation_library.sql",import.meta.url),"utf8");
const site=readFileSync(new URL("../supabase/functions/ai-commercial-assistant/index.ts",import.meta.url),"utf8");
const whatsapp=readFileSync(new URL("../supabase/functions/whatsapp-ai-orchestrator/index.ts",import.meta.url),"utf8");

test("biblioteca contém trinta intenções governadas",()=>{
  const block=migration.slice(migration.indexOf("for row_data in"),migration.indexOf(") as x(intent"));
  assert.equal((block.match(/^\s*\('[a-z_]+',/gm)||[]).length,30);
  assert.match(migration,/jsonb_array_length\(sample_utterances\)>=10/);
});

test("cada intenção recebe dez variações e metadados operacionais",()=>{
  assert.equal((migration.slice(migration.indexOf("samples:=jsonb_build_array"),migration.indexOf("insert into public.ai_intent_definitions")).match(/row_data\.topic/g)||[]).length,10);
  for(const field of ["required_context","answer_templates","official_data_source","freshness_rule","handoff_rule","next_best_question"]) assert.ok(migration.includes(field));
});

test("prompts preservam contexto, conversa humanizada e transferência segura",()=>{
  for(const source of [site,whatsapp]){
    assert.match(source,/apenas uma pergunta por vez/);
    assert.match(source,/Preserve o contexto/);
    assert.match(source,/após três tentativas sem compreender/);
    assert.match(source,/Matheus Oliveira ou Tamara Scarllat/);
  }
});

test("roteiro resumido, contrato e pagamento não são liberados por inferência",()=>{
  assert.match(migration,/Não transformar resumo em roteiro definitivo/);
  assert.match(migration,/Interpretação, exceção ou alteração jurídica exige humano/);
  assert.match(migration,/Só detalhar entrada, parcelas, taxas e vencimentos quando todos estiverem aprovados/);
});
