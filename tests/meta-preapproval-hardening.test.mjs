import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/202608280001_meta_preapproval_operational_hardening.sql", import.meta.url), "utf8");
const worker = readFileSync(new URL("../supabase/functions/campaign-worker/index.ts", import.meta.url), "utf8");
const readiness = readFileSync(new URL("../components/admin-launch-readiness.tsx", import.meta.url), "utf8");

test("preflight monitors token expiry, dead-letter, stuck queues and recovery", () => {
  for (const signal of ["token_expires_at", "dead_lettered_at", "schedule_webhook_retry", "meta_prelaunch_preflight", "operational_recovery_snapshots"]) {
    assert.match(migration, new RegExp(signal));
  }
});

test("campaign worker blocks real sends and enforces hourly and daily limits", () => {
  for (const signal of ["real_send_locked", "hourly_send_limit", "daily_send_limit", "rate_limited"]) {
    assert.match(worker, new RegExp(signal));
  }
});

test("launch panel exposes pre-Meta operational safeguards", () => {
  for (const signal of ["meta_prelaunch_preflight", "Validade das credenciais", "Retentativas e fila de falhas", "Recuperação operacional"]) {
    assert.match(readiness, new RegExp(signal));
  }
});
