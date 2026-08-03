# Envio de notificações do CRM

Esta função é chamada somente depois que `upsert_public_lead` confirma a gravação do lead, do interesse, da atividade e do item de fila.

Segredos necessários no ambiente da Supabase Function: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRM_NOTIFICATION_EMAIL`, `CRM_FROM_EMAIL` e `APP_URL`. O destinatário é fixado no servidor e nunca é aceito do navegador.

O retorno do provedor não controla a persistência do lead. Sucesso ou falha são registrados em `email_notifications`, `leads` e `lead_activities`, com limite de três tentativas.
