import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const webhook = fs.readFileSync("supabase/functions/whatsapp-webhook/index.ts", "utf8");
const orchestrator = fs.readFileSync("supabase/functions/whatsapp-ai-orchestrator/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/202608070001_whatsapp_ai_orchestration.sql", "utf8");
const runtimeMigration = fs.readFileSync("supabase/migrations/202608060001_whatsapp_multiagent_foundation.sql", "utf8");

test("webhook starts AI only after persisting the inbound message", () => {
  const persisted = webhook.indexOf('.select("id").single()');
  const invoked = webhook.indexOf("whatsapp-ai-orchestrator");
  assert.ok(persisted > 0 && invoked > persisted);
  assert.match(webhook, /EdgeRuntime/);
  assert.match(webhook, /sourceMessageId: inserted\.data\.id/);
});

test("AI jobs and outbound replies are idempotent by inbound message", () => {
  assert.match(migration, /unique\(source_message_id\)/);
  assert.match(migration, /'ai-reply:' \|\| source_message\.id::text/);
  assert.match(runtimeMigration, /unique\(organization_id,idempotency_key\)/);
  assert.match(orchestrator, /jobInsert\.error\.code !== "23505"/);
});

test("AI cannot answer after a human takes control", () => {
  for (const guard of ["control_mode === \"ia\"", "ai_managed === true", "requires_human !== true", "!conversation.assigned_to"]) {
    assert.match(orchestrator, new RegExp(guard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(migration, /c\.control_mode<>'ia'/);
  assert.match(migration, /c\.requires_human/);
  assert.match(migration, /c\.assigned_to is not null/);
});

test("commercial answers use confirmed CRM data and human handoff", () => {
  assert.match(orchestrator, /status_internal", "confirmada"/);
  assert.match(orchestrator, /caravan_pricing/);
  assert.match(orchestrator, /payment_plan_rules/);
  assert.match(orchestrator, /caravan_itinerary_days/);
  assert.match(orchestrator, /handoff_to_human/);
  assert.match(orchestrator, /ai_handoffs/);
});

test("provider credentials remain server-side", () => {
  assert.match(orchestrator, /OPENAI_API_KEY/);
  assert.match(orchestrator, /WHATSAPP_WORKER_SECRET/);
  assert.doesNotMatch(orchestrator, /EA[A-Za-z0-9]{50,}/);
  assert.doesNotMatch(orchestrator, /Deno\.env\.get\("NEXT_PUBLIC_/);
});
