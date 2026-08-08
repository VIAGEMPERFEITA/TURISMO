# Campanhas e Disparos

Módulo do CRM para campanhas oficiais de WhatsApp com consentimento, segmentação, fila, auditoria e métricas.

## Segurança operacional

- Toda organização inicia em `simulation_mode = true`.
- Nenhum teste envia mensagem real.
- O navegador nunca recebe tokens da Meta.
- Contatos sem consentimento, inválidos, repetidos ou suprimidos são excluídos.
- `SAIR`, `PARAR`, `CANCELAR`, `REMOVER` e `DESCADASTRAR` devem revogar o consentimento e criar uma supressão.
- Administrador e Gestor podem operar; Consultor cria rascunhos; Visualizador não acessa o módulo.

## Secrets do Supabase

Configure somente em Edge Functions > Secrets:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_APP_SECRET`
- `META_WHATSAPP_VERIFY_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

IDs públicos de conta e telefone ficam em `whatsapp_accounts`. Não registre valores de secrets em Git, logs ou tabelas.

## Ativação segura

1. Aplicar a migration `202608080001_campaigns_and_broadcasts.sql`.
2. Confirmar webhook oficial e assinatura da Meta.
3. Sincronizar e aprovar os modelos no WhatsApp Manager.
4. Homologar com um público interno consentido.
5. Conferir entregas, leituras, falhas, respostas e descadastros.
6. Somente então, um administrador altera a integração para envio real.

O processamento real deve permanecer em Edge Function/worker, usando lotes, retentativas com backoff, chave de idempotência e pausa automática quando a taxa de falhas ultrapassar o limite configurado.

## Estrutura criada

`contact_consents`, `contact_suppressions`, `message_templates`, `campaigns`, `campaign_audiences`, `campaign_recipients`, `campaign_messages`, `message_events`, `campaign_audit_logs` e `integration_settings`, todas com RLS.
