import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const orchestrator = fs.readFileSync("supabase/functions/whatsapp-ai-orchestrator/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/202608100007_ai_destination_research.sql", "utf8");

test("web search is opt-in and controlled by organization policy", () => {
  assert.match(orchestrator, /enabledToolNames\.has\("web_search"\)/);
  assert.match(orchestrator, /researchPolicy\?\.enabled === true/);
  assert.match(orchestrator, /type: "web_search", search_context_size: "low"/);
});

test("commercial caravan facts remain CRM-only", () => {
  assert.match(orchestrator, /O roteiro, datas, preço, disponibilidade, voos, hotéis/);
  assert.match(orchestrator, /CRM sempre prevalece/);
  assert.match(migration, /preco_e_cambio/);
  assert.match(migration, /contrato_e_reserva/);
});

test("web citations are visible and research is audited", () => {
  assert.match(orchestrator, /annotation\?\.type !== "url_citation"/);
  assert.match(orchestrator, /Fontes oficiais consultadas/);
  assert.match(orchestrator, /from\("ai_research_events"\)\.insert/);
  assert.match(migration, /create table if not exists public\.ai_research_events/);
  assert.match(migration, /enable row level security/);
});

test("adversarial research scenarios protect CRM and prompt boundaries", () => {
  assert.match(migration, /pesquisa-conflito-crm/);
  assert.match(migration, /pesquisa-preco-proibida/);
  assert.match(migration, /pesquisa-injecao-pagina/);
  assert.match(migration, /citations_required/);
});
