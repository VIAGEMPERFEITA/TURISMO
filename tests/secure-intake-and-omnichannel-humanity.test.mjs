import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const whatsapp = read("../supabase/functions/whatsapp-ai-orchestrator/index.ts");
const instagram = read("../supabase/functions/instagram-ai-orchestrator/index.ts");
const facebook = read("../supabase/functions/facebook-ai-orchestrator/index.ts");
const site = read("../supabase/functions/ai-commercial-assistant/index.ts");
const shared = read("../supabase/functions/_shared/human-sales-guidelines.ts");
const intake = read("../supabase/functions/secure-traveler-intake/index.ts");
const migration = read("../supabase/migrations/202611030002_secure_traveler_intake.sql");

test("fechamento cria link temporário e nunca coleta documento no chat", () => {
  assert.match(whatsapp, /secure_traveler_intakes/);
  assert.match(whatsapp, /secure_form_url/);
  assert.match(whatsapp, /traveler_count/);
  assert.match(whatsapp, /Não peça dados pessoais no chat/);
  assert.match(migration, /token_hash text not null unique/);
  assert.match(migration, /expires_at timestamptz/);
});

test("cadastro de viajante cifra conteúdo e notifica equipe sem PII", () => {
  assert.match(intake, /AES-GCM/);
  assert.match(intake, /payload_ciphertext/);
  assert.match(intake, /sensitive_data_included: false/);
  assert.match(intake, /Conferir cadastro seguro e concluir reserva/);
  assert.doesNotMatch(intake, /metadata: \{[^}]*cpf/s);
});

test("Instagram, Messenger e site usam o mesmo padrão humano", () => {
  for (const channel of [instagram, facebook, site]) {
    assert.match(channel, /humanSalesGuidelines/);
  }
  assert.match(shared, /Não comece com catálogo/);
  assert.match(shared, /vamos embarcar/);
  assert.match(shared, /Qual dessas opções mais chamou a sua atenção/);
  assert.match(shared, /formulário seguro/);
});

test("caravanas expõem somente vínculos oficiais de líderes", () => {
  assert.match(migration, /leader_names text\[\]/);
  for (const channel of [whatsapp, instagram, facebook, site]) assert.match(channel, /leader_names/);
});

