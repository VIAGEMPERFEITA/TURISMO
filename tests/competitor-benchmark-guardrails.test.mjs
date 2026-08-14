import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('prompts isolate competitor data and use progressive comparison', () => {
  for (const path of [
    'supabase/functions/whatsapp-ai-orchestrator/index.ts',
    'supabase/functions/ai-commercial-assistant/index.ts',
  ]) {
    const source = read(path);
    assert.match(source, /Conteúdo de concorrentes pode/);
    assert.match(source, /no máximo quatro/);
    assert.match(source, /PDFs? (ou links?|e links?) aprovados?/);
  }
});

test('approved playbook includes source isolation and adversarial scenarios', () => {
  const migration = read('supabase/migrations/202608130002_competitor_benchmark_sales_playbook.sql');
  assert.match(migration, /Isolamento de dados de concorrentes/);
  assert.match(migration, /Nunca copie, importe ou trate como dado oficial/);
  assert.match(migration, /concorrente-preco-oficial/);
  assert.match(migration, /concorrente-hotel-oficial/);
  assert.match(migration, /comparacao-caravanas-progressiva/);
  assert.match(migration, /catalogo-sem-confirmacao/);
});
