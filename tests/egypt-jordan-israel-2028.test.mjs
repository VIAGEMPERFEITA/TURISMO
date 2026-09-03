import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const trips=readFileSync(new URL("../lib/trips.ts",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/202609030006_add_egypt_jordan_israel_2028.sql",import.meta.url),"utf8");

test("Egito, Jordânia e Israel também existe em 2028 com roteiro completo",()=>{
  assert.match(trips,/egito-jordania-israel-novembro-2028/);
  assert.match(migration,/source\.slug='egito-jordania-israel-novembro-2026'/);
  assert.match(migration,/target\.slug='egito-jordania-israel-novembro-2028'/);
  assert.match(migration,/'expected_days',14/);
});

test("versão 2028 preserva preço privado, câmbio congelado e entrada de 10%",()=>{
  assert.match(migration,/base_price,minimum_entry[\s\S]*'USD',4790,2586\.60/);
  assert.match(migration,/reference_exchange_rate=5\.40,reference_brl_total=25866/);
  assert.match(migration,/'percentual',10/);
});
