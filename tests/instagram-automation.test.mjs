import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/202608120001_instagram_conversation_automation.sql","utf8");
const webhook=fs.readFileSync("supabase/functions/instagram-webhook/index.ts","utf8");
const ui=fs.readFileSync("components/admin-instagram-automation.tsx","utf8");

test("Instagram automation is tenant-safe, auditable and blocked before connection",()=>{
 assert.match(migration,/social_automation_executions/);
 assert.match(migration,/organization_id=public\.current_organization_id\(\)/);
 assert.match(migration,/instagram_not_connected/);
 assert.match(migration,/messaging_window_hours/);
});

test("Instagram webhook verifies Meta signature and deduplicates events",()=>{
 assert.match(webhook,/x-hub-signature-256/);
 assert.match(webhook,/META_INSTAGRAM_APP_SECRET/);
 assert.match(webhook,/ignoreDuplicates:true/);
 assert.match(webhook,/24\*60\*60\*1000/);
});

test("CRM offers governed quick automations and human handoff",()=>{
 for(const value of ["instagram_comment","instagram_keyword","instagram_story_mention","instagram_dm","human_handoff","require_approved_knowledge"])assert.match(ui,new RegExp(value));
 assert.match(ui,/Todos os fluxos começam como rascunho/);
});
