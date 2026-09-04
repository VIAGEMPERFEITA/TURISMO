import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202608100001_ai_qualification_release_safety.sql", import.meta.url), "utf8");
const reconciliation = readFileSync(new URL("../supabase/migrations/202608230002_reconcile_ai_matrix_and_health.sql", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/ai-commercial-assistant/index.ts", import.meta.url), "utf8");
const contact = readFileSync(new URL("../lib/company-contact.ts", import.meta.url), "utf8");
const siteConfig = readFileSync(new URL("../lib/site-config.ts", import.meta.url), "utf8");

test("matriz de homologação contém pelo menos 150 cenários", () => {
  assert.match(migration, /generate_series\(1,10\)/);
  assert.equal((migration.match(/^\+? \('?[a-z_]+','/gm) ?? []).length >= 15, true);
  assert.match(migration, /critical_failures=0/);
});

test("produção reconcilia a matriz ampliada e encerra alertas Meta já recuperados", () => {
 assert.match(reconciliation,/generate_series\(1,10\)/);
 assert.match(reconciliation,/on conflict\(organization_id,scenario_code\)/);
 assert.match(reconciliation,/integration_health_events/);
 assert.match(reconciliation,/h\.provider in\('instagram','messenger'\)/);
 assert.match(reconciliation,/ca\.status='connected'/);
});

test("IA registra qualificação, fontes e preserva handoff humano", () => {
  assert.match(edge, /update_lead_qualification/);
  assert.match(edge, /ai_qualification_profiles/);
  assert.match(edge, /usedSources/);
  assert.match(edge, /simulationMode/);
  assert.match(edge, /Nunca invente preço, vaga, data/);
});

test("IA transfere dúvidas operacionais sem fonte oficial", () => {
  for (const guardedIntent of [
    "boleto", "pix", "bagagem", "voo", "documenta", "hospedagem",
    "hotel", "inclus", "grupo", "guia", "experi",
  ]) assert.match(edge, new RegExp(guardedIntent));
  assert.match(edge, /requiresApprovedSource && usedSources\.length === 0/);
  assert.match(edge, /Não encontrei uma fonte oficial suficiente/);
});

test("número oficial está centralizado", () => {
  assert.match(contact, /siteConfig\.contact\.phoneInternational/);
  assert.match(siteConfig, /5531995285665/);
  assert.doesNotMatch(`${contact}\n${siteConfig}`, /5531999547699/);
});
