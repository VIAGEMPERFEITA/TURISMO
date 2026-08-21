import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/202608210004_campaign_imported_contacts_audience.sql","utf8");
const ui=fs.readFileSync("components/admin-campaigns.tsx","utf8");

test("lista VCF pode ser escolhida como público completo sem ignorar consentimento",()=>{
  assert.match(ui,/Todos os contatos importados \(VCF\)/);
  assert.match(ui,/prepare_campaign_audience/);
  assert.match(migration,/l\.source='Importação VCF'/);
  assert.match(migration,/has_marketing_consent/);
  assert.match(migration,/cc\.purpose='marketing'/);
  assert.match(migration,/cc\.granted=true/);
});

test("materialização exclui supressões, inválidos e duplicados antes da fila",()=>{
  assert.match(migration,/contact_suppressions/);
  assert.match(migration,/phone_rank=1/);
  assert.match(migration,/is_valid_phone/);
  assert.match(migration,/status=case when eligible_count=0 then 'rascunho'/);
  assert.match(migration,/campaign_audit_logs/);
});
