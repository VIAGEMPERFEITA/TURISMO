import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const sql=readFileSync(new URL("../supabase/migrations/202608280003_daily_ai_learning.sql",import.meta.url),"utf8");
const refresh=readFileSync(new URL("../supabase/migrations/202611010001_refresh_learning_and_recovery.sql",import.meta.url),"utf8");
test("daily learning is anonymized, scheduled and never auto-publishes",()=>{for(const s of ["ai_learning_cycles","anonymized_metrics","run_daily_ai_learning","cron.schedule","'auto_publish',false"])assert.match(sql,new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});
test("operational refresh updates learning and creates a secret-free recovery snapshot",()=>{
  for(const signal of ["run_daily_ai_learning_for_org","operational_refresh","contains_secrets","credential_secret_name","webhook_secret_name"]) assert.match(refresh,new RegExp(signal));
  assert.doesNotMatch(refresh,/insert\s+into\s+public\.messages/i);
});
test("failures create governed findings, scenarios and suggestions",()=>{for(const s of ["ai_learning_findings","daily-","improvement_suggestions","daily-learning-guardian"])assert.match(sql,new RegExp(s))});
