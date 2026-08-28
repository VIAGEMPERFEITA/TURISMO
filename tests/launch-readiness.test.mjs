import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/admin-launch-readiness.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../components/admin-yoav-foundation.tsx", import.meta.url), "utf8");
const runbook = readFileSync(new URL("../OPERACAO-LANCAMENTO-OMNICHANNEL.md", import.meta.url), "utf8");

test("central de prontidão consolida segurança sem ativar envios externos", () => {
  for (const signal of ["operational_readiness_center", "ai_release_gate", "5531995285665", "coexistence_enabled", "webhook_subscription", "aprovado"]) assert.match(component, new RegExp(signal));
  assert.match(component, /sem executar mensagens ou ativações externas/i);
  assert.match(route, /AdminLaunchReadiness/);
});

test("runbook cobre as sete etapas e preserva coexistência e idempotência", () => {
  for (const heading of ["## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6.", "## 7.", "## Reversão"]) assert.match(runbook, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(runbook, /coexistência/);
  assert.match(runbook, /idempotência/);
  assert.match(runbook, /simulation_mode = true/);
});
