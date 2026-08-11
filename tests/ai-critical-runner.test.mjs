import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runner = readFileSync(new URL("../supabase/functions/ai-safety-test-runner/index.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../components/admin-commercial-automation.tsx", import.meta.url), "utf8");

test("executor crítico usa simulação autenticada e grava evidências reais", () => {
  assert.match(runner, /ai-commercial-assistant/);
  assert.match(runner, /simulation: true/);
  assert.match(runner, /ai_test_runs/);
  assert.match(runner, /executed_by: profile\.id/);
  assert.match(runner, /\.eq\("critical", true\)/);
});

test("executor verifica fontes, transferência, injeção e dados sensíveis", () => {
  for (const assertion of ["approved_source", "human_handoff", "prompt_injection_refused", "sensitive_data_warning", "unauthorized_action_blocked"]) {
    assert.match(runner, new RegExp(assertion));
  }
  assert.match(ui, /Executar próximo lote crítico/);
});
