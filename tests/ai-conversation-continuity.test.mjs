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

test("WhatsApp faz descoberta humana antes de recomendar caravanas no primeiro contato", () => {
  assert.match(whatsapp, /No primeiro contato, não comece despejando uma lista de caravanas/);
  assert.match(whatsapp, /cumprimente conforme o horário local informado/);
  assert.match(whatsapp, /faça uma única pergunta de descoberta/);
  assert.match(whatsapp, /Não presuma Israel/);
  assert.match(whatsapp, /timeZone: "America\/Sao_Paulo"/);
  assert.match(whatsapp, /history\.length === 0/);
});

test("WhatsApp vende a experiência com imersão antes de agir como catálogo", () => {
  assert.match(whatsapp, /Atenda como consultora de experiências, não como catálogo/);
  assert.match(whatsapp, /transforme o detalhe pessoal trazido pelo cliente/);
  assert.match(whatsapp, /Crie uma visualização breve e verdadeira da viagem/);
  assert.match(whatsapp, /Não responda automaticamente com três ou quatro opções/);
  assert.match(whatsapp, /pedido explícito de comparação/);
  assert.match(whatsapp, /o que mais toca vocês/);
  assert.match(whatsapp, /Evite “o que pesa mais\?”/);
  assert.match(whatsapp, /conte a experiência destino por destino/);
  assert.match(whatsapp, /subida opcional ao Monte Sinai/);
  assert.match(whatsapp, /fábrica de papiros/);
  assert.match(whatsapp, /Evite generalidades vazias/);
  assert.match(whatsapp, /itinerário oficial completo em ordem cronológica/);
  assert.match(whatsapp, /todas as etapas diárias, cidades, visitas e experiências/);
  assert.match(whatsapp, /Narre o roteiro como uma jornada vivida/);
  assert.match(whatsapp, /retome do dia seguinte, sem repetir nem pular etapas/);
  assert.match(whatsapp, /Nunca transforme possibilidade em garantia/);
});

test("WhatsApp mostra catálogo completo sob pedido e qualifica por líder espiritual", () => {
  assert.match(whatsapp, /todas as caravanas.*todas as opções/);
  assert.match(whatsapp, /sem limitar a quatro/);
  assert.match(whatsapp, /nome, mês e ano de saída/);
  assert.match(whatsapp, /pastor ou líder espiritual específico/);
  assert.match(whatsapp, /nunca associe o nome por suposição/);
  assert.match(whatsapp, /priorize essa pergunta sobre pastor ou líder espiritual/);
  assert.match(whatsapp, /vocês preferem/);
  assert.match(whatsapp, /Qual dessas opções mais chamou a atenção de vocês/);
  assert.match(whatsapp, /evite “prefere que eu compare\?”/);
});
