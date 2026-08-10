# Auditoria da Plataforma Viagem Perfeita Turismo

Data da auditoria: 4 de agosto de 2026  
Escopo: repositório atual, publicação no GitHub Pages e projeto Supabase de produção.  
Objetivo: estabelecer a situação real antes de evoluir o sistema para uma plataforma completa de turismo internacional.

## 1. Resumo executivo

O projeto atual não é apenas um protótipo. Ele já possui:

- site público completo em Next.js;
- catálogo estático de caravanas, destinos, experiências e blog;
- captura de leads integrada ao Supabase;
- autenticação administrativa com Supabase Auth;
- banco relacional com 46 tabelas;
- RLS, políticas, funções, triggers, índices e auditoria;
- CRM comercial básico, pipeline, clientes, reservas, pagamentos e documentos;
- fila de notificações por e-mail e uma Edge Function publicada;
- fundações para relatórios, automações e IA auditada.

Entretanto, o sistema ainda não é comparável a HubSpot ou Salesforce em operação. Parte relevante do painel é uma listagem simples ou tela informativa. Não existem ainda portal do passageiro, financeiro completo, operação logística completa, gestão real de líderes, caixa de entrada omnichannel, pesquisas/NPS e automações executáveis configuráveis.

Situação objetiva:

- **Banco:** estruturalmente avançado e aplicado em produção.
- **Integração pública:** configurada e publicada.
- **Dados de produção:** as tabelas `leads` e `email_notifications` estavam vazias durante a auditoria.
- **Validação:** 41 testes automatizados passaram; o build estático de 105 páginas passou.
- **Qualidade:** o lint falhou com 24 erros e 80 avisos, incluindo arquivos antigos duplicados dentro do workspace.
- **Conclusão:** base preservável, mas ainda não pronta para ser declarada uma plataforma operacional completa.

## 2. Infraestrutura atual

| Item | Situação atual | Classificação |
|---|---|---|
| Framework | Next.js 16.2.6, App Router, React 19.2.6, TypeScript | Funcionando |
| UI | CSS próprio, Framer Motion, Lucide Icons, React Hook Form e Zod | Funcionando |
| Site público | Exportação estática para GitHub Pages | Funcionando |
| Hospedagem atual | `viagemperfeita.github.io/TURISMO/` | Funcionando |
| GitHub Actions | Workflow com build e deploy; execução mais recente auditada com sucesso | Funcionando |
| Domínio | Migração de DNS para Cloudflare iniciada; propagação pendente durante esta auditoria | Parcial |
| CDN/DNS | Cloudflare Free; registros web importados e registro de e-mail em DNS only | Parcial |
| Banco | Supabase PostgreSQL, projeto `acitaazihlxdowfcxkqo` | Funcionando |
| Autenticação | Supabase Auth; login, logout e recuperação de senha | Funcionando |
| Storage | `private-documents` privado e `site-media` público | Parcial |
| Funções de servidor | `send-crm-notification` publicada | Funcionando parcialmente |
| E-mail | Resend configurado; domínio remetente definitivo ainda depende do DNS | Parcial |
| WhatsApp | Link oficial `5531995285665`, mensagem contextual e rastreamento | Funcionando |
| Vercel | Não é a hospedagem operacional atual | Inexistente no fluxo atual |
| Analytics/Meta | Estrutura e checklist visual; IDs e validação operacional não comprovados | Parcial |

### Variáveis e segredos

Confirmados no GitHub Actions:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Confirmados nos segredos das Edge Functions:

- `RESEND_API_KEY`;
- `CRM_NOTIFICATION_EMAIL`;
- `CRM_FROM_EMAIL`;
- `APP_URL`.

Segredos de servidor não aparecem no frontend. O fluxo público utiliza apenas URL e chave publicável, protegido por RLS e RPC controlada.

## 3. Frontend público

### Rotas funcionando

- Home;
- caravanas e página individual;
- caravanas realizadas;
- destinos e página individual;
- experiências e landing pages por intenção;
- quem somos;
- viagens personalizadas;
- líderes de caravanas;
- depoimentos e histórias;
- blog, artigos e categorias;
- documentação e FAQ;
- contato;
- políticas, termos, cookies, sitemap, robots e 404.

### Integração pública com o CRM

O formulário:

1. valida os dados com Zod;
2. normaliza o telefone;
3. chama `upsert_public_lead`;
4. grava o lead ou identifica duplicidade;
5. cria um novo interesse e uma atividade;
6. cria uma notificação pendente;
7. invoca a função de e-mail após a persistência;
8. abre o WhatsApp somente após o fluxo ou mediante fallback informado.

Classificação: **implementado, mas ainda sem evidência de uma transação real completa em produção**, pois `leads` e `email_notifications` estavam com zero registros no momento da inspeção.

## 4. Área administrativa atual

### Funcionalidades reais

- login, logout, recuperação e redefinição de senha;
- proteção de rotas no cliente e autorização por perfil;
- dashboard com métricas do Supabase;
- leads com busca, filtros, criação, edição e conversão em cliente;
- pipeline com etapas do banco, drag and drop e setas no celular;
- clientes com CRUD básico;
- reservas com CRUD básico e relacionamentos;
- pagamentos/parcelas com CRUD básico;
- documentos com CRUD e upload privado;
- caravanas com cadastro e edição;
- relatórios resumidos e exportação CSV;
- fila de e-mail com consulta e reenvio;
- listagens de tarefas, equipe e conteúdo.

### Funcionalidades parciais ou somente visuais

- configurações gerais: placeholder;
- IA: página informativa; provedor e execução não conectados;
- Google/marketing: checklist, não integração operacional completa;
- relatórios: resumo comercial/financeiro, não suíte completa;
- tarefas: listagem genérica, sem agenda completa;
- líderes: conteúdo institucional, não gestão operacional de líderes;
- conteúdo: várias telas são apenas listagens sem CRUD completo;
- passageiros: tabela existe como `reservation_travelers`, mas não há módulo 360°;
- operações: estruturas pontuais, sem cockpit operacional completo.

## 5. Modelo de dados atual

### Tabelas existentes

Organização e acesso:

- `organizations`, `profiles`, `teams`, `team_members`.

Comercial:

- `pipelines`, `pipeline_stages`, `leads`, `lead_interests`, `lead_notes`, `lead_activities`, `lead_status_history`, `lead_assignments`, `tasks`, `tags`, `lead_tags`.

Clientes, reservas e passageiros:

- `customers`, `reservations`, `reservation_travelers`, `reservation_status_history`.

Financeiro:

- `payments`, `payment_transactions`.

Documentos:

- `documents`, `document_requests`.

Comunicação:

- `contact_channels`, `conversations`, `messages`, `email_notifications`, `notifications`, `webhook_events`.

Caravanas e conteúdo:

- `caravans`, `caravan_itinerary_days`, `destinations_content`, `experiences_content`, `faqs_content`, `articles_content`, `media_content`, `testimonials_content`, `leaders_content`, `partners_content`.

Automação, relatórios e governança:

- `automation_rules`, `automation_runs`, `saved_reports`, `ai_query_audit`, `system_settings`, `audit_logs`.

### Objetos de banco

- 41 índices nomeados encontrados nas migrations;
- 134 políticas RLS declaradas;
- triggers para perfil, integridade, histórico, auditoria, códigos de reserva, pagamentos, atribuições e automações;
- funções para ingestão pública, conversão, anonimização, relatórios, contexto de IA e busca de caravanas;
- buckets `private-documents` e `site-media`.

### Pontos fortes

- separação por organização;
- chaves estrangeiras e regras de exclusão explícitas;
- RLS ativado para os domínios principais;
- deduplicação pública por telefone/e-mail;
- histórico de status e auditoria;
- transações e funções `security definer` com `search_path` controlado;
- documentos em bucket privado;
- lead salvo antes do envio de e-mail.

### Limitações e riscos

1. O enum `user_role` possui somente `administrador`, `gestor`, `consultor` e `visualizador`. Não existem ainda superadministrador, comercial, financeiro, operacional, documentação, líder e passageiro como papéis distintos.
2. Permissões ainda são orientadas principalmente a papel; falta RBAC granular com `roles`, `permissions` e associação configurável.
3. Não há portal do passageiro nem política RLS para acesso do cliente aos próprios registros.
4. O bucket privado permite leitura a administrador, gestor e consultor; será necessário separar o acesso documental por função e por reserva/grupo.
5. Não foi comprovado MFA obrigatório para administradores.
6. Retenção, exportação LGPD e processo de exclusão estão apenas parcialmente cobertos pela função de anonimização.
7. Não foram encontrados testes reais contra o banco remoto para todas as políticas; os testes atuais verificam principalmente estrutura e código.
8. Há várias pastas históricas duplicadas no workspace, que contaminam lint e aumentam o risco de edição/publicação do conjunto errado.

## 6. Modelo de dados proposto

Preservar as 46 tabelas atuais e adicionar somente o que faltar:

- RBAC: `roles`, `permissions`, `role_permissions`, `profile_roles`;
- líderes: `leaders`, `leader_groups`, `leader_group_members`, `leader_commissions`;
- passageiros: ampliar `reservation_travelers` ou renomear de forma compatível, sem tabela paralela;
- financeiro: `payment_installments` apenas se `payments` não permanecer como parcela; `refunds`, `financial_adjustments`, `exchange_rates`;
- operação: `suppliers`, `caravan_suppliers`, `hotels`, `caravan_hotels`, `flights`, `transfers`, `rooms`, `room_assignments`, `operational_checklists`, `operational_checklist_items`;
- comunicação: especializar `conversations` e `messages`, preservando as tabelas; acrescentar templates e consentimentos;
- pesquisas: `surveys`, `survey_questions`, `survey_invitations`, `survey_responses`, `survey_answers`, `referrals`;
- portal: vínculos seguros entre `auth.users`, cliente e passageiro;
- IA: `knowledge_documents`, `knowledge_chunks`, `ai_sessions`, mantendo `ai_query_audit`;
- LGPD: `privacy_requests`, `data_retention_policies`, `consent_history`.

Antes de qualquer migration nova, deve ser decidido se `payments` representa uma parcela. A recomendação é preservar essa semântica e não criar `payment_installments` redundante.

## 7. Quadro de maturidade

| Módulo | Existe | Funciona | Qualidade | Segurança | O que falta | Prioridade |
|---|---|---|---|---|---|---|
| Site público | Sim | Sim | Boa | Boa | E2E recorrente, performance e domínio final | Média |
| Captura de leads | Sim | Parcialmente comprovado | Boa | Boa | Teste real ponta a ponta e antispam/rate limit | Crítica |
| Autenticação | Sim | Sim | Boa | Parcial | MFA, URLs finais, revisão de sessão estática | Alta |
| Usuários e perfis | Sim | Sim | Parcial | Parcial | RBAC granular e novos papéis | Crítica |
| CRM comercial | Sim | Parcial | Média | Boa | campos completos, lote, metas, SLA e perda | Alta |
| Pipeline | Sim | Sim básico | Boa | Boa | configuração de funil, filtros e lote | Alta |
| Agenda e tarefas | Parcial | Listagem | Baixa | Boa | calendário, lembretes e relações completas | Alta |
| Clientes | Sim | CRUD básico | Média | Boa | visão 360° | Alta |
| Reservas | Sim | CRUD básico | Média | Boa | contrato, condições, histórico visual e workflow | Alta |
| Passageiros | Parcial | Banco apenas | Baixa | Parcial | módulo 360°, rooming list e portal | Crítica |
| Financeiro | Parcial | CRUD básico | Média | Boa | câmbio, ajustes, reembolsos, conciliação e relatórios | Crítica |
| Documentos | Sim | Parcial | Média | Parcial | URL assinada, revisão, expiração e perfis específicos | Crítica |
| Caravanas | Sim | Parcial | Média | Boa | visão operacional, ocupação, receita e fornecedores | Alta |
| Líderes | Visual | Não operacional | Baixa | Não aplicável | modelo, portal, grupos, metas e RLS | Alta |
| Operação | Parcial | Funções isoladas | Baixa | Parcial | fornecedores, voos, hotéis, transfers e cockpit | Crítica |
| WhatsApp | Sim via link | Sim | Média | Boa | Cloud API oficial, webhook, inbox e templates | Alta |
| E-mail | Sim | Parcial | Boa | Boa | domínio Resend, teste real, templates e automações | Crítica |
| IA | Fundação | Não | Boa conceitualmente | Boa conceitualmente | provedor, RAG, ferramentas e supervisão | Média |
| Automações | Fundação | Parcial no banco | Média | Boa | executor, agendamento, editor e monitoramento | Alta |
| Relatórios | Sim | Resumo básico | Média | Boa | suíte por módulo, agenda e exportações | Alta |
| Dashboard executivo | Parcial | Métricas básicas | Média | Boa | KPIs completos e filtros | Alta |
| Pós-venda | Não | Não | Inexistente | Não aplicável | módulo completo | Média |
| Pesquisas/NPS | Não | Não | Inexistente | Não aplicável | questionários, links seguros e relatórios | Média |
| Portal passageiro | Não | Não | Inexistente | Crítico | autenticação e RLS por titularidade | Crítica |
| Auditoria/LGPD | Parcial | Parcial | Média | Boa base | retenção, solicitações, exportação e revisão operacional | Alta |

## 8. Testes executados

### Resultado

- `node --test tests/*.test.mjs`: **41 aprovados, 0 falhas**;
- build GitHub Pages: **aprovado**;
- páginas estáticas geradas: **105**;
- lint: **reprovado**, com 24 erros e 80 avisos.

### Cobertura real dos testes atuais

Os testes validam migrations, presença de RLS, deduplicação, ordem banco/e-mail, autenticação, pipeline, WhatsApp, catálogo e requisitos estruturais. Eles não substituem:

- testes RLS contra o Supabase remoto com cada perfil;
- E2E autenticado do painel;
- teste real de lead, deduplicação, fila, Resend e WhatsApp;
- teste de upload/download assinado;
- testes financeiros e de concorrência;
- testes de recuperação de desastre.

## 9. Riscos técnicos e de segurança

### Críticos

1. Ausência de teste real ponta a ponta em produção.
2. CRM de negócio servido como exportação estática: funciona com Supabase, mas limita proteção no servidor, middleware e operações sensíveis.
3. Papéis insuficientes para segregação financeira, operacional, documental, líder e passageiro.
4. Portal do passageiro inexistente.
5. Lint reprovado e workspace com cópias antigas completas.

### Altos

- Supabase está no plano Free e pode pausar após inatividade;
- backups automáticos e retenção são insuficientes no Free;
- e-mail definitivo depende do domínio validado;
- ausência de rate limiting/CAPTCHA específico na ingestão pública;
- ausência de caixa oficial da Meta e webhooks verificados;
- acesso documental precisa de granularidade adicional;
- não há monitoramento/alerta de falhas operacionalmente comprovado.

## 10. Dependências externas e credenciais

| Serviço | Necessidade |
|---|---|
| Supabase | projeto, URL, chave publicável, segredo de servidor, Auth, Storage e Edge Functions |
| Resend | API key e domínio remetente verificado |
| Cloudflare | DNS, SSL e proteção do domínio |
| GitHub | repositório, Actions e Pages |
| Vercel | recomendado para o CRM/portal dinâmico, se adotado |
| Meta | Business Manager, WABA, número, token, app e webhook para WhatsApp oficial |
| OpenAI ou outro provedor | chave de API, política de dados e limites para IA |
| Analytics | GA4, Search Console, Meta Pixel e consentimento |

Nunca colocar segredos no repositório ou no bundle público.

## 11. Custos mensais prováveis

Valores em USD, sem impostos e sujeitos a câmbio/uso.

### Piloto controlado

- Supabase Free: US$ 0;
- Cloudflare Free: US$ 0;
- GitHub Pages: US$ 0 no uso atual;
- Resend Free: US$ 0, até 3.000 e-mails/mês e 100/dia;
- total-base: US$ 0, inadequado para operação crítica contínua.

### Produção recomendada inicial

- Supabase Pro: a partir de US$ 25/mês;
- Resend Pro: a partir de US$ 20/mês;
- Cloudflare Free ou Pro: US$ 0 ou US$ 20/mês anual;
- Vercel Pro para CRM/portal: US$ 20/mês por assento, caso adotado;
- total típico: US$ 45 a US$ 85/mês, antes de WhatsApp, IA e excedentes.

Custos variáveis não estimáveis sem volume:

- conversas/templates da Meta;
- tokens de IA;
- armazenamento e egress;
- usuários adicionais da hospedagem;
- observabilidade, backups avançados e PITR.

## 12. Arquitetura-alvo

```text
Site público
  -> Supabase RPC pública controlada
  -> CRM Comercial

Aplicação administrativa e portais
  -> camada de autorização
  -> serviços modulares
  -> Supabase/PostgreSQL + RLS
  -> Storage privado
  -> filas e Edge Functions

Módulos
  Comercial | Reservas | Passageiros | Financeiro | Operacional
  Documentos | Líderes | Comunicação | Automações | IA
  Pós-venda | Pesquisas | Relatórios | Segurança
```

Recomendação: manter o site público estático, mas hospedar CRM e portais em uma aplicação dinâmica própria, preferencialmente em subdomínio como `app.viagemperfeitaturismo.com.br`.

## 13. Roadmap recomendado

### Fase 0 — Saneamento obrigatório

- isolar/remover do lint as cópias históricas;
- corrigir os 24 erros de lint do projeto ativo;
- teste real de captura, deduplicação, e-mail e WhatsApp;
- concluir Cloudflare/Resend;
- configurar monitoramento e backup.

Complexidade: média. Prioridade: crítica.

### Fase 1 — Base para aprovação

- expandir RBAC sem quebrar os quatro papéis atuais;
- criar permissões granulares;
- adicionar perfis financeiro, operacional, documentação, líder e passageiro;
- revisar RLS tabela por tabela;
- MFA para administradores;
- separar aplicação administrativa dinâmica;
- testes remotos de RLS e autenticação.

Complexidade: alta. Prioridade: crítica.

### Fase 2 — Comercial

- completar lead 360°, pipeline, tarefas, metas, SLA, filtros, lote e exportação;
- concluir e-mail e WhatsApp comercial.

Complexidade: alta.

### Fase 3 — Reservas, passageiros, líderes e caravanas

- visão 360°, rooming, grupos de líder e fluxos de reserva.

Complexidade: alta.

### Fase 4 — Financeiro

- parcelas, câmbio, ajustes, conciliação, inadimplência e relatórios.

Complexidade: alta.

### Fase 5 — Operação e documentos

- fornecedores, voos, hotéis, transfers, checklists, vouchers e documentos.

Complexidade: muito alta.

### Fase 6 — Comunicação

- WhatsApp Cloud API, e-mail, templates, webhooks e inbox unificada.

Complexidade: muito alta; depende de aprovação da Meta.

### Fase 7 — IA e automações

- conhecimento, ferramentas autorizadas, agente supervisionado, regras e jobs.

Complexidade: muito alta.

### Fase 8 — Passageiro e pós-venda

- portal, pesquisas, NPS, depoimentos, suporte e recompra.

Complexidade: muito alta.

### Fase 9 — Executivo

- dashboards, relatórios completos, indicadores, agendamento e governança.

Complexidade: alta.

## 14. Ordem recomendada

1. Aprovar esta auditoria.
2. Executar Fase 0.
3. Aprovar o modelo RBAC da Fase 1.
4. Executar Fase 1 com migrations aditivas.
5. Fazer homologação com usuários de cada perfil.
6. Avançar módulo a módulo, sempre com testes e aceite.

## 15. Primeira fase pronta para aprovação

Proposta de escopo fechado:

1. limpeza lógica do workspace e lint verde;
2. teste real do formulário em produção;
3. conclusão do domínio Resend;
4. matriz de permissões detalhada;
5. migrations aditivas de RBAC;
6. MFA administrativo;
7. testes RLS remotos por perfil;
8. decisão e preparação de `app.viagemperfeitaturismo.com.br`;
9. relatório de homologação da base.

Nenhuma migration destrutiva ou módulo paralelo deve ser criado. Esta fase precisa ser aprovada antes da implementação.

## 16. Evidências consultadas

- código-fonte e migrations do workspace;
- execução local de testes, lint e build;
- painel Supabase de produção;
- GitHub Actions e Secrets;
- documentação oficial de preços do Supabase, Resend, Vercel e Cloudflare consultada em 4 de agosto de 2026.
