import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const auth = readFileSync("lib/crm-auth.ts", "utf8");
const shell = readFileSync("components/admin-shell.tsx", "utf8");
const team = readFileSync("components/admin-team-management.tsx", "utf8");
const tenantFunction = readFileSync("supabase/functions/create-tenant-organization/index.ts", "utf8");

test("sessão valida também a empresa ativa do usuário", () => {
  assert.match(auth, /from\("organizations"\)/);
  assert.match(auth, /!organization\?\.active/);
  assert.match(auth, /organization: CrmOrganization/);
});

test("painel exibe a identidade da empresa autenticada", () => {
  assert.match(shell, /organization\?\.name/);
  assert.doesNotMatch(shell, /<small>Viagem Perfeita<\/small>/);
});

test("cadastro de empresa usa função segura e envia convite inicial", () => {
  assert.match(team, /functions\.invoke\("create-tenant-organization"/);
  assert.match(tenantFunction, /platform_administrators/);
  assert.match(tenantFunction, /create_tenant_organization/);
  assert.match(tenantFunction, /inviteUserByEmail/);
  assert.match(tenantFunction, /admin\/redefinir-senha/);
});
