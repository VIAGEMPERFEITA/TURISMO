import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/202608100002_multi_tenant_onboarding.sql",
  "utf8",
);

test("usuário sem convite não é associado à Viagem Perfeita", () => {
  const handler = migration.slice(migration.indexOf("create or replace function public.handle_new_user"));
  assert.doesNotMatch(handler, /default_organization_id\s*\(/);
  assert.match(handler, /if invitation\.id is null then\s+return new;/);
});

test("convite define organização e função sem confiar em metadados do navegador", () => {
  assert.match(migration, /invitation\.organization_id/);
  assert.match(migration, /invitation\.role/);
  assert.doesNotMatch(migration, /raw_user_meta_data->>'(?:role|organization_id)'/);
  assert.match(migration, /accepted_at=now\(\), accepted_by=new\.id/);
});

test("somente administrador da própria organização gerencia convites", () => {
  assert.match(migration, /organization_id = public\.current_organization_id\(\)/);
  assert.match(migration, /public\.has_role\('administrador'\)/);
  assert.match(migration, /revoke all on public\.organization_invitations from public, anon/);
});

test("operador da plataforma provisiona tenant com pipeline, fila e administrador", () => {
  assert.match(migration, /create table if not exists public\.platform_administrators/);
  assert.match(migration, /create_tenant_organization/);
  assert.match(migration, /Pipeline comercial/);
  assert.match(migration, /Atendimento geral/);
  assert.match(migration, /normalized_email,'administrador'/);
});
