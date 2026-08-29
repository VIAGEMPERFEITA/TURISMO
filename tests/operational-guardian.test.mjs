import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql=readFileSync(new URL("../supabase/migrations/202608280002_operational_guardian.sql",import.meta.url),"utf8");
test("guardian covers alerts, SLA-adjacent queues, governance and metrics",()=>{for(const s of ["run_operational_guardian","integration_health_events","audit_contact_governance","channel_delivery_metrics"])assert.match(sql,new RegExp(s))});
test("simulation does not send externally and emergency stop locks campaigns",()=>{for(const s of ["simulate_omnichannel_preflight","'external_send',false","emergency_stop_omnichannel","real_send_locked=true","simulation_mode=true"])assert.match(sql,new RegExp(s))});
test("recovery is preview-only and WhatsApp templates remain drafts",()=>{assert.match(sql,/preview_operational_recovery/);assert.match(sql,/requires_explicit_restore/);assert.match(sql,/'rascunho'/)});
