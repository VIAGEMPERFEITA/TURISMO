import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const site = readFileSync(new URL("../supabase/functions/ai-commercial-assistant/index.ts", import.meta.url), "utf8");
const whatsapp = readFileSync(new URL("../supabase/functions/whatsapp-ai-orchestrator/index.ts", import.meta.url), "utf8");

test("site e WhatsApp preservam contexto amplo e conversa contínua", () => {
  for (const source of [site, whatsapp]) {
    assert.match(source, /\.limit\(24\)/);
    assert.match(source, /Conduza uma conversa contínua/);
    assert.match(source, /não reinicie o atendimento a cada mensagem/);
    assert.match(source, /Avance gradualmente até a intenção de fechamento/);
  }
});

test("site consulta somente condições comerciais aprovadas para a IA", () => {
  assert.match(site, /caravan_commercial_terms/);
  assert.match(site, /\.eq\("status", "aprovado"\)\.eq\("ai_can_quote", true\)/);
  assert.match(site, /approved_payment_options/);
  assert.match(site, /\.eq\("ai_usable", true\)\.eq\("status", "aprovado"\)/);
});

test("IA não transfere cedo quando há preço ou pagamento aprovado", () => {
  for (const source of [site, whatsapp]) assert.match(source, /Não transfira apenas porque o cliente perguntou preço ou pagamento/);
  assert.match(site, /Para valores e formas de pagamento, use os dados aprovados retornados pelo CRM/);
});

test("atendimento segue padrões humanos de concisão, confirmação e escalada progressiva", () => {
  for (const source of [site, whatsapp]) {
    assert.match(source, /Prefira respostas de até 100 palavras/);
    assert.match(source, /confirme de modo contextual se aquilo resolveu a dúvida/);
    assert.match(source, /faça uma tentativa objetiva de esclarecimento/);
    assert.match(source, /no segundo sinal sem resolução, transfira/);
    assert.match(source, /para o cliente não precisar repetir a história/);
  }
});
