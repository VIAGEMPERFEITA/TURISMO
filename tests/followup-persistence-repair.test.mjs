import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync("supabase/migrations/202611090001_fix_sales_followup_persistence.sql","utf8");
const panel=readFileSync("components/admin-campaigns.tsx","utf8");

test("cadência real persiste e continua governada",()=>{
  assert.match(migration,/grant select, insert, update on public\.sales_followup_policies to authenticated/);
  assert.match(migration,/approved_template_required/);
  assert.match(migration,/purpose='marketing'.*granted/s);
  assert.match(migration,/contact_suppressions/);
  assert.match(migration,/'template_id',\(select template_id from policy\)/);
});

test("painel só confirma ativação retornada pelo banco",()=>{
  assert.match(panel,/Cadência não confirmada pelo banco\. Nenhuma ativação foi realizada\./);
  assert.match(panel,/else if\(preview\)setFollowup/);
  assert.match(panel,/setFollowup\(\{enabled:preview\.enabled/);
});
