import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/202608060001_whatsapp_multiagent_foundation.sql", import.meta.url);
const sql = await readFile(migrationUrl, "utf8");

test("WhatsApp multiagent foundation reuses conversations and webhook events", () => {
  assert.match(sql, /alter table public\.conversations/);
  assert.match(sql, /alter table public\.messages/);
  assert.match(sql, /webhook_events.*já existente/i);
  assert.doesNotMatch(sql, /create table if not exists public\.whatsapp_webhook_events/);
});

test("shared inbox creates accounts queues presence and immutable histories", () => {
  for (const table of [
    "whatsapp_accounts",
    "inbox_queues",
    "inbox_queue_members",
    "agent_presence",
    "conversation_assignments",
    "conversation_transfers",
    "human_takeovers",
    "whatsapp_templates",
    "whatsapp_outbound_messages",
    "whatsapp_message_status_history",
  ]) assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql, /conversation_one_active_assignment_idx/);
  assert.match(sql, /human_takeovers_one_active_idx/);
});

test("AI and human state transitions are atomic and explicit", () => {
  for (const fn of ["claim_conversation","transfer_conversation","return_conversation_to_ai","route_conversation_to_agent","resume_due_ai_conversations"])
    assert.match(sql, new RegExp(`function public\\.${fn}`));
  for (const mode of ["ia","humano","assistida","pausada"]) assert.match(sql, new RegExp(`'${mode}'`));
  assert.match(sql, /for update/);
  assert.match(sql, /lock_version=lock_version\+1/);
});

test("Meta secrets never enter the database", () => {
  assert.match(sql, /token_secret_name/);
  assert.match(sql, /O token real nunca é persistido no banco/);
  assert.doesNotMatch(sql, /EA[A-Za-z0-9]{40,}/);
});

test("RLS and restricted RPC grants protect the inbox", () => {
  for (const table of ["whatsapp_accounts","inbox_queues","agent_presence","conversation_assignments","human_takeovers","whatsapp_outbound_messages"])
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql, /revoke insert,update,delete on public\.conversation_assignments/);
  assert.match(sql, /grant execute on function public\.route_conversation_to_agent\(uuid,uuid\),public\.resume_due_ai_conversations\(\) to service_role/);
  assert.doesNotMatch(sql, /grant execute on function public\.route_conversation_to_agent[^;]+to anon/);
});

test("new official WhatsApp number is seeded consistently", () => {
  assert.match(sql, /5531995285665/);
  assert.doesNotMatch(sql, /5531999547699/);
});
