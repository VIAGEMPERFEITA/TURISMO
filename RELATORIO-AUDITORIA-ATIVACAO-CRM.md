# Auditoria e ativação segura do CRM

Data: 3 de agosto de 2026

## Diagnóstico do CRM encontrado

O projeto já possuía uma base real preparada para Supabase, sem `localStorage`, JSON ou dados em memória como fonte oficial. Foram preservados: Supabase Auth, perfis e papéis, RLS, deduplicação de telefone/e-mail, leads, interesses, atividades, notas, tarefas, clientes, reservas, passageiros, pagamentos, documentos privados, tags, auditoria, pipeline e cadastro de caravanas.

O site público é estático no GitHub Pages. Por isso, segredos, envio de e-mail e operações privilegiadas não podem rodar no navegador. A parte sensível foi implementada como Supabase Edge Function.

## Correção prioritária: banco antes do e-mail

O novo fluxo é:

1. O formulário é validado com Zod.
2. O telefone é normalizado.
3. `upsert_public_lead` grava ou atualiza o lead.
4. O interesse e a atividade são gravados.
5. Uma notificação pendente é criada em `email_notifications`.
6. Somente após o RPC confirmar sucesso, o navegador solicita a Edge Function.
7. A função envia a cópia para `viagemperfeitatrip@gmail.com` por Resend.
8. Sucesso ou falha ficam registrados na fila, no lead e no histórico.
9. Independentemente da entrega do e-mail, o lead permanece salvo e o WhatsApp pode ser aberto.

O envio tem no máximo três tentativas. O painel `/admin/configuracoes/notificacoes/` mostra pendências, falhas, sucessos e permite reenvio controlado.

## Arquivos principais

- Migração: `supabase/migrations/202608030005_email_notification_queue.sql`
- Função: `supabase/functions/send-crm-notification/index.ts`
- Integração pública: `lib/lead-service.ts`
- Painel da fila: `components/admin-email-notifications.tsx`
- Variáveis documentadas: `.env.example`

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` existem somente na função de servidor.
- O destinatário é fixado no servidor e não é aceito do visitante.
- RLS impede leitura pública dos leads e da fila.
- Documentos continuam em bucket privado.
- Falhas não expõem tokens, chaves, senhas, cartão ou documentos.

## Logo oficial

As duas imagens enviadas foram preservadas como fonte e convertidas em PNG de alta resolução com transparência. O site usa a versão branca em superfícies escuras e a colorida em superfícies claras. A proposta alternativa anterior continua somente no painel administrativo.

## Validação local realizada

- Testes automatizados de ordem banco → e-mail.
- Testes de ausência de segredos no frontend.
- Testes da fila, estados e limite de tentativas.
- Testes de deduplicação, RLS e WhatsApp já existentes.
- Build estático completo do GitHub Pages.

## Ativação externa necessária

Não foi possível afirmar que um e-mail real chegou ou que a persistência ocorreu no Supabase de produção porque este workspace não possui as credenciais e os projetos externos configurados. Para ativar:

1. Aplicar todas as migrações no Supabase em ordem.
2. Publicar a função `send-crm-notification`.
3. Configurar os segredos indicados em `.env.example` no Supabase/Vercel, nunca no GitHub Pages.
4. Validar o domínio remetente no Resend e preencher `CRM_FROM_EMAIL`.
5. Criar o primeiro usuário no Supabase Auth e alterar seu perfil para `administrador` diretamente pelo SQL Editor.
6. Publicar o CRM em Vercel ou outra infraestrutura compatível com sessões e backend. O site público pode continuar no GitHub Pages.
7. Executar o roteiro de testes de produção com um lead de teste, repetição do telefone, falha forçada do Resend e reenvio pelo painel.

## Backup

Ativar backups do projeto Supabase, definir retenção adequada e testar restauração periodicamente. Arquivos do bucket privado devem seguir política própria de retenção. Exportações manuais devem ser limitadas a administradores e armazenadas de forma segura.

## Pendências honestas

- Entrega real no Gmail depende da configuração do Supabase e Resend.
- Resumo diário possui configuração persistida, mas o agendamento deve ser criado no ambiente Supabase após a definição do horário operacional.
- O GitHub Pages não deve hospedar o CRM oficial com dados reais; ele continua adequado apenas para o site público estático.
