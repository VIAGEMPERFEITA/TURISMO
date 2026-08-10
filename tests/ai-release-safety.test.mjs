import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202608100001_ai_qualification_release_safety.sql", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/ai-commercial-assistant/index.ts", import.meta.url), "utf8");
const contact = readFileSync(new URL("../lib/company-contact.ts", import.meta.url), "utf8");
const siteConfig = readFileSync(new URL("../lib/site-config.ts", import.meta.url), "utf8");

test("matriz de homologação contém pelo menos 150 cenários", () => {
  assert.match(migration, /generate_series\(1,10\)/);
  assert.equal((migration.match(/^\+? \('?[a-z_]+','/gm) ?? []).length >= 15, true);
  assert.match(migration, /critical_failures=0/);
});

test("IA registra qualificação, fontes e preserva handoff humano", () => {
  assert.match(edge, /update_lead_qualification/);
  assert.match(edge, /ai_qualification_profiles/);
  assert.match(edge, /usedSources/);
  assert.match(edge, /simulationMode/);
  assert.match(edge, /Nunca invente preço, vaga, data/);
});

test("número oficial está centralizado", () => {
  assert.match(contact, /siteConfig\.contact\.phoneInternational/);
  assert.match(siteConfig, /5531995285665/);
  assert.doesNotMatch(`${contact}\n${siteConfig}`, /5531999547699/);
});
