import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/202608100008_all_caravans_commercial_operations.sql", import.meta.url),
  "utf8",
);
const secureAccess = readFileSync(
  new URL("../supabase/functions/customer-secure-access/index.ts", import.meta.url),
  "utf8",
);
const orchestrator = readFileSync(
  new URL("../supabase/functions/whatsapp-ai-orchestrator/index.ts", import.meta.url),
  "utf8",
);

test("padroniza todas as caravanas confirmadas em USD 3.590", () => {
  assert.match(migration, /where c\.organization_id=org_id and c\.published=true and c\.status_internal='confirmada'/);
  assert.match(migration, /values\(org_id,caravan\.id,'USD',3590,1000,10/);
  assert.match(migration, /base_currency='USD',base_price=3590/);
  assert.match(migration, /reference_brl_total=19386/);
});

test("não inventa roteiro e remove associação histórica incompatível", () => {
  assert.match(migration, /delete from public\.caravan_itinerary_days/);
  assert.match(migration, /'pendente_validacao'/);
  assert.match(migration, /não completar por inferência/i);
});

test("contrato permanece rascunho, revisável e nunca é enviado automaticamente", () => {
  assert.match(migration, /legal_review_required/);
  assert.match(migration, /'revisao_juridica_pendente'/);
  assert.match(migration, /'auto_sent',false/);
});

test("cronograma financeiro não cria cobrança externa", () => {
  assert.match(migration, /external_charge_created',false/);
  assert.match(migration, /live_charges_enabled boolean not null default false/);
  assert.match(migration, /values\(org_id,'manual','homologacao',false,false,false/);
  assert.match(migration, /settlement_days_before_departure=40/);
});

test("área privada usa OTP com hash, expiração e resposta anti-enumeração", () => {
  assert.match(secureAccess, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(secureAccess, /expira em 10 minutos/i);
  assert.match(secureAccess, /Se o cadastro for localizado/);
  assert.match(secureAccess, /CUSTOMER_ACCESS_PEPPER/);
  assert.match(secureAccess, /allowedOrigins/);
});

test("IA respeita orçamento, registra uso e transfere quando bloqueada", () => {
  assert.match(orchestrator, /reserve_ai_budget/);
  assert.match(orchestrator, /ai_usage_events/);
  assert.match(orchestrator, /ai_operational_alerts/);
  assert.match(orchestrator, /monthly_limit|rate_limit|budget/i);
});

test("matriz inclui preço, pagamento, roteiro, reserva e cenários críticos", () => {
  for (const marker of [
    "caravana-preco-",
    "caravana-pagamento-",
    "caravana-roteiro-",
    "caravana-reserva-",
    "operacao-sem-cobranca-real",
    "operacao-contrato-rascunho",
    "operacao-dado-privado",
    "operacao-prompt-injection",
    "operacao-limite-custo",
  ]) assert.ok(migration.includes(marker), `cenário ausente: ${marker}`);
});
