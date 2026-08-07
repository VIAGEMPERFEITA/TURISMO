import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const webhook = fs.readFileSync("supabase/functions/whatsapp-webhook/index.ts", "utf8");
const dispatch = fs.readFileSync("supabase/functions/whatsapp-dispatch/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/202608060002_whatsapp_cloud_api_runtime.sql", "utf8");
const testAccount = fs.readFileSync("supabase/migrations/202608060003_register_meta_test_account.sql", "utf8");

test("webhook validates Meta verification and request signature", () => {
  assert.match(webhook, /META_WHATSAPP_VERIFY_TOKEN/);
  assert.match(webhook, /x-hub-signature-256/);
  assert.match(webhook, /META_WHATSAPP_APP_SECRET/);
  assert.match(webhook, /crypto\.subtle\.sign\("HMAC"/);
});

test("incoming messages are idempotent and persisted in the CRM", () => {
  assert.match(webhook, /webhook_events/);
  assert.match(webhook, /message:\$\{externalId\}/);
  assert.match(webhook, /phone_normalized/);
  assert.match(webhook, /customer_service_window_expires_at/);
});

test("delivery failures from Meta dashboard remain diagnosable without a local outbound row", () => {
  assert.match(webhook, /event_type: "message_status"/);
  assert.match(webhook, /status:\$\{externalId\}/);
  assert.match(webhook, /if \(outbound\) await admin\.from\("whatsapp_message_status_history"\)/);
});

test("dispatcher keeps the token server-side and sends only queued records", () => {
  assert.match(dispatch, /META_WHATSAPP_ACCESS_TOKEN/);
  assert.match(dispatch, /WHATSAPP_WORKER_SECRET/);
  assert.match(dispatch, /whatsapp_outbound_messages/);
  assert.doesNotMatch(dispatch, /Deno\.env\.get\("VITE_/);
});

test("human sends are atomic, authorized and respect the 24-hour window", () => {
  assert.match(migration, /create or replace function public\.enqueue_whatsapp_text/);
  assert.match(migration, /template_required_outside_service_window/);
  assert.match(migration, /not_conversation_owner/);
  assert.match(migration, /grant execute .* to authenticated/si);
});

test("Meta test account is explicitly isolated from the official number", () => {
  assert.match(testAccount, /1203237242880072/);
  assert.match(testAccount, /1077957561405552/);
  assert.match(testAccount, /'teste'/);
  assert.match(testAccount, /'15556752315'/);
  assert.doesNotMatch(testAccount, /'5531995285665'/);
});
