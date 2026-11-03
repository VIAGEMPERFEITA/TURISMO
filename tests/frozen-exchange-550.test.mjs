import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202611030001_standardize_frozen_exchange_550.sql", import.meta.url), "utf8");
const whatsapp = readFileSync(new URL("../supabase/functions/whatsapp-ai-orchestrator/index.ts", import.meta.url), "utf8");

test("padroniza câmbio congelado em 5,50 e recalcula entrada de 10%", () => {
  assert.match(migration, /reference_exchange_rate=5\.50/);
  assert.match(migration, /reference_brl_total=round\(base_price\*5\.50,2\)/);
  assert.match(migration, /entry_amount=round\(base_price\*5\.50\*0\.10,2\)/);
  assert.match(migration, /initial_exchange_rate.*5\.50/s);
});

test("resposta financeira usa texto simples e as duas modalidades aprovadas", () => {
  assert.match(whatsapp, /evite negrito, itálico e excesso de símbolos/);
  assert.match(whatsapp, /boletos mensais até um mês antes do embarque/);
  assert.match(whatsapp, /saldo restante em até 10 vezes no cartão de crédito/);
  assert.match(whatsapp, /acerto cambial conforme o contrato da viagem/);
});
