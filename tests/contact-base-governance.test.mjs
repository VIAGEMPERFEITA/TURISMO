import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const migration=readFileSync(new URL("../supabase/migrations/202608310001_contact_base_governance.sql",import.meta.url),"utf8");
const panel=readFileSync(new URL("../components/admin-campaigns.tsx",import.meta.url),"utf8");
test("contact quality consolidates imported base without sending messages",()=>{for(const signal of ["contact_base_quality","unique_phones","duplicate_records","with_email","suppressed"])assert.match(migration,new RegExp(signal))});
test("consent requires individual evidence, valid phone and an authenticated operator",()=>{for(const signal of ["consent_evidence_required","invalid_phone","auth.uid()","manual_documented","marketing_consent_recorded"])assert.match(migration,new RegExp(signal));assert.match(migration,/length\(trim\(coalesce\(evidence,''\)\)\)<10/)});
test("campaign panel exposes governed consent workflow",()=>{for(const signal of ["Base e consentimento","Registrar consentimento comprovado","Nunca marque toda a agenda como consentida","record_marketing_consent"])assert.match(panel,new RegExp(signal))});
