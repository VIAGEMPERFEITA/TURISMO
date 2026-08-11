import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const auth = readFileSync(new URL("../lib/crm-auth.ts", import.meta.url), "utf8");
const team = readFileSync(new URL("../components/admin-team-management.tsx", import.meta.url), "utf8");
const invite = readFileSync(new URL("../supabase/functions/invite-organization-member/index.ts", import.meta.url), "utf8");
const inbox = readFileSync(new URL("../supabase/migrations/202608110010_team_role_inbox_alignment.sql", import.meta.url), "utf8");

test("todos os perfis operacionais estão disponíveis no convite", () => {
  for (const role of ["administrador", "gestor", "consultor", "atendimento", "marketing", "financeiro", "visualizador"]) {
    assert.match(auth, new RegExp(`"${role}"`));
    assert.match(invite, new RegExp(`"${role}"`));
  }
  assert.match(team, /crmRoles\.map/);
});

test("perfil de atendimento entra na caixa compartilhada", () => {
  assert.match(inbox, /'administrador','gestor','consultor','atendimento'/);
  assert.match(inbox, /inbox_queue_members/);
  assert.match(inbox, /on conflict\(queue_id, profile_id\)/);
});
