import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const migration=readFileSync(new URL("../supabase/migrations/202608100009_travel_growth_engine.sql",import.meta.url),"utf8");
const acquisition=readFileSync(new URL("../components/admin-acquisition.tsx",import.meta.url),"utf8");
const shell=readFileSync(new URL("../components/admin-shell.tsx",import.meta.url),"utf8");
const auth=readFileSync(new URL("../lib/crm-auth.ts",import.meta.url),"utf8");

test("growth engine creates the acquisition and attribution foundation",()=>{
 for(const table of ["acquisition_channels","keyword_clusters","lead_touchpoints","lead_scores","sales_cadences","sales_cadence_steps","lead_cadence_enrollments","acquisition_goals","acquisition_experiments"]){
  assert.match(migration,new RegExp(`create table if not exists public\\.${table}`));
 }
 assert.match(migration,/enable row level security/);
 assert.match(migration,/current_organization_id\(\)/);
});

test("paid acquisition is seeded in simulation and requires explicit approval",()=>{
 assert.match(migration,/simulation_mode boolean not null default true/);
 assert.match(migration,/real_activation_approved boolean not null default false/);
 assert.match(migration,/check\(not real_activation_approved or credentials_configured\)/);
 assert.match(migration,/Google Ads/);
 assert.match(migration,/Meta Ads/);
});

test("new interests trigger scoring, attribution and a priority task",()=>{
 assert.match(migration,/growth_interest_trigger/);
 assert.match(migration,/recalculate_lead_acquisition_score/);
 assert.match(migration,/Atender lead prioritário/);
 assert.match(migration,/lead_touchpoints/);
});

test("admin exposes the accelerator with governance and forecast",()=>{
 assert.match(acquisition,/Acelerador de viagens/);
 assert.match(acquisition,/Captação segura em modo simulação/);
 assert.match(acquisition,/Previsibilidade/);
 assert.match(shell,/\/admin\/aquisicao/);
 assert.match(auth,/aquisicao:/);
});
