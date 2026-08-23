import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const instagram=readFileSync(new URL("../supabase/functions/instagram-dispatch/index.ts",import.meta.url),"utf8");
const facebook=readFileSync(new URL("../supabase/functions/facebook-dispatch/index.ts",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/202608220002_reconcile_meta_channel_health.sql",import.meta.url),"utf8");
test("falha de credencial degrada Instagram e abre alerta",()=>{assert.match(instagram,/status:"degraded"/);assert.match(instagram,/integration_health_events/);assert.doesNotMatch(instagram,/status:"error"/)});
test("falha de credencial degrada Messenger e abre alerta",()=>{assert.match(facebook,/messenger_access_token_invalid/);assert.match(facebook,/integration_health_events/)});
test("migração reconcilia falha histórica do Instagram",()=>{assert.match(migration,/instagram_outbound_messages/);assert.match(migration,/integration_connectors/);assert.match(migration,/credential_invalid/)});
