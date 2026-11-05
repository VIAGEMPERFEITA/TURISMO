import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const migrationUrl=new URL("../supabase/migrations/202611050001_governed_sales_followups.sql",import.meta.url);
const uiUrl=new URL("../components/admin-campaigns.tsx",import.meta.url);

test("retomadas exigem consentimento, respeitam supressão e param após resposta",async()=>{
 const sql=await readFile(migrationUrl,"utf8");
 assert.match(sql,/contact_consents[\s\S]*purpose='marketing'[\s\S]*granted[\s\S]*revoked_at is null/);
 assert.match(sql,/contact_suppressions[\s\S]*scope in \('marketing','todos'\)/);
 assert.match(sql,/select m\.direction[\s\S]*='saida'/);
 assert.match(sql,/converted_customer_id is null/);
 assert.match(sql,/max_attempts integer not null default 3/);
 assert.match(sql,/approved_template_required/);
});

test("painel mostra prévia e mantém modo seguro por padrão",async()=>{
 const ui=await readFile(uiUrl,"utf8");
 assert.match(ui,/Retomada de clientes inativos/);
 assert.match(ui,/Simulação segura/);
 assert.match(ui,/Elegíveis agora/);
 assert.match(ui,/Uma resposta do cliente, fechamento, descadastro ou supressão cancela imediatamente/);
});
