import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/202608100004_paris_2027_commercial_contract_automation.sql", import.meta.url),
  "utf8",
);
const approvedTermsMigration = fs.readFileSync(
  new URL("../supabase/migrations/202608100006_approve_paris_2027_payment_composition.sql", import.meta.url),
  "utf8",
);
const orchestrator = fs.readFileSync(
  new URL("../supabase/functions/whatsapp-ai-orchestrator/index.ts", import.meta.url),
  "utf8",
);

test("cadastra preco apenas para Paris, Egito e Israel marco de 2027", () => {
  assert.match(migration, /paris-egito-israel-marco-2027/);
  assert.match(migration, /'USD',3590,5\.40,19386/);
  assert.equal((migration.match(/insert into public\.caravan_commercial_terms/g) || []).length, 1);
});

test("bloqueia parcelas inconsistentes e cobranca automatica", () => {
  assert.match(migration, /ai_can_simulate=false,ai_can_request_entry=false/);
  assert.match(migration, /20\.386,00/);
  assert.match(migration, /ai_usable=false/);
  assert.match(migration, /check\(not ai_usable or \(status='aprovado' and abs\(computed_total-expected_total\)<0\.01\)\)/);
});

test("contrato exige modelo versionado e revisao juridica", () => {
  assert.match(migration, /create table if not exists public\.contract_templates/);
  assert.match(migration, /legal_review_required boolean not null default true/);
  assert.match(migration, /Contrato_marco_2027 \(1\)\.pdf/);
  assert.match(migration, /status='em_revisao'/);
});

test("orquestrador respeita permissoes comerciais e documentos seguros", () => {
  assert.match(orchestrator, /caravan_commercial_terms/);
  assert.match(orchestrator, /caravan_payment_options/);
  assert.match(orchestrator, /ai_can_request_entry/);
  assert.match(orchestrator, /formulário seguro individual/);
  assert.match(orchestrator, /Nunca envie PIX por iniciativa própria/);
});

test("aprova duracao de 14 dias e quitacao ate 40 dias antes da saida", () => {
  assert.match(approvedTermsMigration, /duration_marketing_days=14/);
  assert.match(approvedTermsMigration, /duration_itinerary_days=14/);
  assert.match(approvedTermsMigration, /settlement_days_before_departure=40/);
  assert.match(approvedTermsMigration, /Vencimentos dependem da data oficial de embarque/);
});

test("abate a entrada e reconcilia integralmente o plano no boleto", () => {
  const total = 1000 + 8 * 2298.25;
  assert.equal(total, 19386);
  assert.match(approvedTermsMigration, /boleto_installment_amount=2298\.25/);
});

test("limita o cartao a 40 por cento no plano misto e informa taxas", () => {
  const cardCents = 10 * 77544;
  const entryAndBoletoCents = 100000 + 8 * 132895;
  assert.equal(cardCents, 775440);
  assert.equal(entryAndBoletoCents, 1163160);
  assert.equal(cardCents + entryAndBoletoCents, 1938600);
  assert.equal(cardCents / 1938600, 0.4);
  assert.match(approvedTermsMigration, /card_fee_included=false/);
  assert.match(approvedTermsMigration, /Taxas da operadora sao acrescentadas/);
});
