# Assistente comercial supervisionado

Edge Function server-side baseada na Responses API. A chave OpenAI nunca é enviada ao navegador.

Segredos necessários no Supabase:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (padrão: `gpt-5.6-sol`)

O assistente permanece indisponível enquanto `ai_configurations.enabled = false`.
Antes de ativar, publique a migration `202608040010_ai_runtime_security.sql`, configure os segredos e execute os testes de homologação.
