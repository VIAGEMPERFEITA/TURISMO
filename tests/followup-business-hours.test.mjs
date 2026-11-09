import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync("supabase/migrations/202611090002_extend_followup_hours.sql","utf8");
const panel=readFileSync("components/admin-campaigns.tsx","utf8");

test("retomadas da Viagem Perfeita usam a janela de 08h às 22h",()=>{
  assert.match(migration,/business_hour_start=8/);
  assert.match(migration,/business_hour_end=22/);
  assert.match(migration,/o\.slug='viagem-perfeita'/);
  assert.match(migration,/America\/Sao_Paulo/);
  assert.match(panel,/business_hour_start:8,business_hour_end:22/);
});

test("ampliação não remove governança de consentimento",()=>{
  assert.match(migration,/controla somente retomadas proativas e mantém consentimento obrigatório/);
});
