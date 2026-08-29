import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const sql=readFileSync(new URL("../supabase/migrations/202608280003_daily_ai_learning.sql",import.meta.url),"utf8");
test("daily learning is anonymized, scheduled and never auto-publishes",()=>{for(const s of ["ai_learning_cycles","anonymized_metrics","run_daily_ai_learning","cron.schedule","'auto_publish',false"])assert.match(sql,new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});
test("failures create governed findings, scenarios and suggestions",()=>{for(const s of ["ai_learning_findings","daily-","improvement_suggestions","daily-learning-guardian"])assert.match(sql,new RegExp(s))});
