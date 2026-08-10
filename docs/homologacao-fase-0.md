# Homologação — Fase 0

Data: 4 de agosto de 2026  
Ambiente: produção

## Base técnica

- Lint do projeto ativo: aprovado sem erros.
- Testes automatizados: 41 aprovados, 0 falhas.
- Build estático do GitHub Pages: aprovado.
- Páginas geradas: 105.
- Cópias históricas, relatórios, builds e pacotes anteriores foram retirados do escopo do lint sem exclusão de arquivos.

## Fluxo comercial homologado

Foi criado o lead controlado `TESTE HOMOLOGAÇÃO FASE 0`, telefone `31999990001`, pelo formulário publicado.

Resultado da primeira solicitação:

- lead salvo antes do e-mail;
- 1 interesse criado;
- 2 atividades registradas;
- notificação enviada para `viagemperfeitatrip@gmail.com`;
- status do e-mail: `enviado`;
- tentativas: 1;
- erro de entrega: nenhum.

Resultado da repetição com o mesmo telefone:

- leads: 1 — não houve duplicação do contato;
- interesses: 2 — o novo interesse foi preservado;
- atividades: 4 — o histórico foi ampliado;
- notificações: 2.

O navegador de homologação bloqueou a abertura visual da nova aba externa do WhatsApp. A aplicação concluiu a persistência e executou o mesmo gerador central de URL coberto pelos testes automatizados, que valida o número oficial `5531995285665` e a mensagem codificada.

## Infraestrutura

- Supabase: conectado e recebendo leads em produção.
- RLS: ativo nas tabelas do CRM, conforme migrations e testes.
- Edge Function de notificação: operacional.
- Cloudflare: domínio ativo, tráfego protegido e SSL disponível.
- Domínio oficial: `https://www.viagemperfeitaturismo.com.br/` operacional.
- GitHub Pages: `https://viagemperfeita.github.io/TURISMO/` operacional como fallback.
- Monitoramento: workflow diário adicionado em `.github/workflows/monitoramento.yml`.

## Autenticação do e-mail

Registros adicionados na Cloudflare:

- DKIM: `resend._domainkey`;
- SPF: TXT em `send`;
- retorno SPF: MX em `send`, prioridade 10;
- DMARC: TXT em `_dmarc`, política inicial `p=none`.

Após a inclusão, o Resend avançou de `not started` para `pending`. A ativação definitiva depende apenas da propagação DNS. Até a validação do domínio, o envio já funciona pelo remetente temporário verificado do Resend.

## Backup

O projeto Supabase está no plano Free, que não oferece a mesma retenção automática de backups dos planos pagos. As migrations versionadas protegem integralmente o esquema e as políticas, mas não substituem backup dos dados comerciais. Antes de operação comercial contínua, é necessário escolher uma destas opções:

1. habilitar um plano Supabase com backups automáticos; ou
2. cadastrar uma URL de conexão exclusiva como segredo do GitHub e ativar exportação criptografada agendada.

Nenhuma contratação paga ou armazenamento externo foi ativado sem autorização.
