import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const catalog=readFileSync(new URL("../lib/official-itineraries.ts",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/202609030005_complete_official_caravan_itineraries.sql",import.meta.url),"utf8");

const expected={
  "egito-jordania-israel-novembro-2026":14,"paris-egito-israel-marco-2027":14,
  "turquia-grecia-2027":14,"jordania-israel-2027":13,"italia-2027":10,
  "israel-2027":11,"emirados-egito-2027":13,"israel-egito-2027":12,
};

test("site contém os oito roteiros oficiais com a quantidade correta de dias",()=>{
  for(const [slug,days] of Object.entries(expected)){
    const start=catalog.indexOf(`\"${slug}\":[`);
    assert.ok(start>=0,`roteiro ausente: ${slug}`);
    const end=catalog.indexOf("\n  ],",start)>=0?catalog.indexOf("\n  ],",start):catalog.indexOf("\n  ]\n};",start);
    const block=catalog.slice(start,end);
    assert.equal((block.match(/\bday\(/g)||[]).length,days,`dias incorretos: ${slug}`);
  }
});

test("migração substitui resumos, replica 2028 e publica snapshots detalhados",()=>{
  assert.match(migration,/delete from public\.caravan_itinerary_days/);
  assert.match(migration,/replace\(source\.slug,'2027','2028'\)/);
  assert.match(migration,/'detalhado'/);
  assert.match(migration,/must_not_mix_caravans/);
});

test("roteiro incompatível da Reforma Protestante não volta às fontes oficiais",()=>{
  for(const marker of ["Berlim","Wittenberg","Genebra","Edimburgo","Londres"]){
    assert.doesNotMatch(catalog,new RegExp(marker,"i"));
    assert.doesNotMatch(migration,new RegExp(`'[^']*${marker}`,"i"));
  }
});
