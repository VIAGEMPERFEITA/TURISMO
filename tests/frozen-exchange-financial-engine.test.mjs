import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const sql=readFileSync(new URL("../supabase/migrations/202609030003_frozen_exchange_financial_engine.sql",import.meta.url),"utf8");
const tenPercent=readFileSync(new URL("../supabase/migrations/202609030004_use_ten_percent_entry.sql",import.meta.url),"utf8");
const panel=readFileSync(new URL("../components/admin-commercial-automation.tsx",import.meta.url),"utf8");

test("ativa preços em USD com câmbio inicial e corrige a entrada para 10%",()=>{
  assert.match(sql,/reference_exchange_rate=5\.40/);assert.match(tenPercent,/entry_amount=round\(item\.reference_brl_total\*0\.10,2\)/);
  assert.match(tenPercent,/minimum_entry_type,minimum_entry[\s\S]*'percentual',10/);
  assert.match(sql,/settlement_days_before_departure=30/);assert.match(sql,/card_max_installments=10/);
});
test("boleto é dinâmico até o mês anterior e ajusta centavos na última parcela",()=>{
  assert.match(sql,/simulate_frozen_exchange_plan/);assert.match(sql,/settlement_month:=\(make_date\(c\.year,c\.month,1\)-interval '1 month'\)/);
  assert.match(sql,/balance-installment\*\(month_count-1\)/);assert.match(sql,/external_charge_created',false/);
});
test("cartão exige taxa administrativa e nunca inventa percentual",()=>{
  assert.match(sql,/card_machine_fee_configurations/);assert.match(sql,/requer_taxa_maquininha/);
  assert.match(sql,/card_count:=least\(greatest[\s\S]*10\)/);
});
test("acerto cambial registra crédito ou diferença e exige aprovação",()=>{
  assert.match(sql,/preview_exchange_adjustment/);assert.match(sql,/credit_to_customer/);
  assert.match(sql,/additional_balance/);assert.match(sql,/aprovacao administrativa obrigatoria/);
});
test("contrato fica coerente com a entrada de 10% e mantém revisão jurídica formal",()=>{
  assert.match(tenPercent,/operationally_reviewed=true/);assert.match(tenPercent,/respeita a cláusula 4\.1: entrada mínima de 10%/);
  assert.match(tenPercent,/legal_review_required=true,status='em_revisao'/);
});
test("painel utiliza o simulador congelado e avisa que não cria cobrança",()=>{
  assert.match(panel,/simulate_frozen_exchange_plan/);assert.match(panel,/Mês de ingresso/);
  assert.match(panel,/Nenhuma cobrança é criada pela simulação/);assert.match(panel,/Boleto \+ cartão/);
});
