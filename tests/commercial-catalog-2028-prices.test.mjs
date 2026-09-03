import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration=readFileSync(new URL("../supabase/migrations/202609030001_reconcile_2028_catalog_and_private_prices.sql",import.meta.url),"utf8");
const whatsappAssistant=readFileSync(new URL("../supabase/functions/whatsapp-ai-orchestrator/index.ts",import.meta.url),"utf8");
const siteAssistant=readFileSync(new URL("../supabase/functions/ai-commercial-assistant/index.ts",import.meta.url),"utf8");

test("replica todas as caravanas de 2027 para 2028 preservando roteiro",()=>{
  assert.match(migration,/where year=2027 and published=true/);
  assert.match(migration,/target\.slug=replace\(source\.slug,'2027','2028'\)/);
  assert.match(migration,/insert into public\.caravan_itinerary_days/);
});

test("mantém datas exatas nulas e registra a regra de três meses",()=>{
  assert.match(migration,/departure_date=null/);
  assert.match(migration,/três meses antes da viagem/);
  assert.match(whatsappAssistant,/datas exatas de saída e retorno são definidas três meses antes/);
  assert.match(siteAssistant,/datas exatas de saída e retorno são definidas três meses antes/);
});

test("registra todos os oito preços privados por roteiro para 2027 e 2028",()=>{
  for(const [slug,price] of [
    ["egito-jordania-israel-novembro-2026",4790],
    ["paris-egito-israel-marco-2027",4490],
    ["turquia-grecia-2027",5490],
    ["jordania-israel-2027",4790],
    ["italia-2027",3990],
    ["israel-2027",5290],
    ["emirados-egito-2027",4290],
    ["israel-egito-2027",3590],
  ]) assert.match(migration,new RegExp(`\\('${slug}',${price}::numeric\\)`));
  assert.match(migration,/ai_can_quote=true,ai_can_simulate=false/);
});

test("replica o preço de Israel e Egito em 2027 e 2028",()=>{
  assert.match(migration,/\('israel-egito-2027',3590::numeric\)/);
  assert.match(migration,/\('israel-egito-2028',3590::numeric\)/);
});

test("câmbio informado fica congelado durante a validade da proposta",()=>{
  assert.match(migration,/câmbio, quando informado pela Central Comercial, fica congelado/);
  assert.match(whatsappAssistant,/cotação de câmbio aprovada[\s\S]*congelada para aquela proposta/);
  assert.match(siteAssistant,/cotação de câmbio aprovada[\s\S]*congelada para aquela proposta/);
});
