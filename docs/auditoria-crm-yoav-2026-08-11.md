# Auditoria técnica — CRM YOAV

Data: 11 de agosto de 2026

## Resumo executivo

O projeto já possui uma fundação operacional relevante: autenticação Supabase, isolamento por organização, RLS, leads, pipeline, tarefas, clientes, reservas, pagamentos, documentos, propostas, campanhas consentidas, caixa compartilhada do WhatsApp, alternância IA/humano, base de conhecimento e trilhas de auditoria. A evolução deve reaproveitar essas entidades, evitando a criação de um segundo CRM paralelo.

Os maiores riscos encontrados são: modelo de conversa ainda orientado ao WhatsApp; transições do pipeline atualizadas diretamente pelo navegador; automações armazenadas como regras simples sem versionamento; integrações externas sem catálogo unificado de ações; ausência de um modelo completo de conteúdo social; e cobertura parcial de governança multi-provedor de IA.

## Matriz de cobertura

| Área | Estado antes desta fase | Evidência principal | Decisão |
|---|---|---|---|
| Multiempresa | Implementado | `organizations`, perfis e entidades com `organization_id` | Preservar e ampliar RLS |
| Autenticação e RBAC | Parcial | Admin, gestor, consultor e visualizador | Acrescentar atendimento, marketing e financeiro |
| Leads e histórico | Implementado | leads, interesses, atividades, notas e histórico | Acrescentar score explicável e identidades |
| Pipeline | Parcial | pipelines, stages e quadro visual | Criar requisitos, tentativas, override e RPC segura |
| Inbox WhatsApp | Implementado | contas, filas, presença, mensagens e handoff | Generalizar para omnichannel |
| Site chat | Parcial | assistente do site e conversas | Normalizar sessão, consentimento e handoff |
| Instagram/Messenger | Ausente no runtime | canal permitido no schema, sem conector operacional | Preparar contas/eventos oficiais e sandbox |
| Webhooks | Parcial | assinatura WhatsApp, idempotência e tentativas | Generalizar eventos, backoff e dead-letter |
| Automações | Parcial | regras e execuções simples | Versionar fluxos, passos e políticas de segurança |
| Campanhas | Implementado parcial | consentimento, supressão, templates e métricas | Manter aprovação e limites; não criar envio irrestrito |
| IA OpenAI | Implementado | orquestrador, guardas, custos e testes | Criar abstração de provedores/tarefas |
| Claude | Ausente | sem adapter ou configuração | Preparar provider server-side, sem chave no cliente |
| Conhecimento | Implementado parcial | artigos aprovados e fila de revisão | Versionar fontes/documentos e validade |
| Melhoria contínua | Parcial | cenários, execuções e feedback | Criar sugestões, evidências e rollout controlado |
| Turismo | Implementado parcial | caravanas, passageiros, documentos, contratos e pagamentos | Evoluir rooming list, fornecedores e checklists |
| Conteúdo social | Ausente | somente conteúdo público do site | Criar calendário, versões e aprovação humana |
| Integrações externas | Parcial | settings isolados | Criar catálogo de conectores, ações e execuções |
| Observabilidade | Parcial | audit logs, eventos e alertas | Padronizar correlação, latência, erros e reprocessamento |

## Riscos críticos e mitigação

1. **Mudança direta de etapa pelo frontend:** pode ignorar atividades obrigatórias. A correção é uma RPC transacional com validação e override auditado.
2. **Escopo de canal acoplado ao WhatsApp:** impede uma inbox única confiável. A correção é vincular conversas a contas de canal e identidades normalizadas.
3. **Automações sem versões imutáveis:** dificulta rollback e auditoria. A correção é separar fluxo, versão e execução.
4. **Ações externas arbitrárias pela IA:** risco operacional e de LGPD. A correção é permitir somente ações registradas em catálogo, com aprovação configurável.
5. **Conhecimento sem validade uniforme:** pode produzir resposta comercial desatualizada. A correção é versionar fonte, responsável, validade, canal e confidencialidade.
6. **Verificação indevida de seguidores:** APIs oficiais podem não fornecer a prova. O estado inicial deve ser `unknown`, nunca inferido.

## Plano incremental aprovado pela arquitetura

1. Identidade CRM YOAV e modelo comum omnichannel.
2. Transições seguras do pipeline e atividades obrigatórias.
3. Inbox única e chat do site em modo sandbox.
4. Motor de automações versionado, com limites e pausa emergencial.
5. Conteúdo social com aprovação humana.
6. Camada de provedores de IA e avaliações por tarefa.
7. Hub de integrações com catálogo permitido e auditoria.
8. Centro de melhoria contínua e módulos avançados de turismo.

As integrações reais com Meta, Anthropic, pagamentos, e-mail e fornecedores permanecem condicionadas às credenciais, escopos e aprovações de cada provedor. A fundação criada nesta fase não expõe segredos no navegador.

## Entregue nesta fase

- Identidade administrativa atualizada para **CRM YOAV**.
- Perfis `atendimento`, `marketing` e `financeiro` adicionados sem remover os papéis existentes.
- Modelo comum de contas de canal, identidades, participantes, anexos e notas internas.
- Pipeline governado por RPC transacional, requisitos obrigatórios, bloqueio explicável e override exclusivo de gestor com motivo auditado.
- Estruturas versionadas para automações, integrações permitidas, provedores de IA, conhecimento e conteúdo social.
- Retentativas e dead-letter preparadas para eventos de webhook.
- Novos módulos administrativos de Automações, Integrações, Conteúdo social e Melhoria da IA.
- Chat interno e simulador de IA criados em `sandbox`; nenhum canal externo foi ativado automaticamente.

## Verificações executadas

- 32 testes automatizados aprovados.
- TypeScript sem erros nos arquivos do projeto.
- Lint dos arquivos alterados sem erros.
- Build estático concluído com 123 páginas.
- Migrations `202608110000` e `202608110001` aplicadas com sucesso no Supabase vinculado.

## Pendências deliberadamente não ativadas

- Conectores reais de Instagram, Messenger, Claude, pagamentos e fornecedores.
- Publicação automática em redes sociais.
- Ações financeiras, contratos ou reservas disparadas autonomamente pela IA.
- Regras comerciais rígidas adicionais no pipeline sem validação dos gestores.

Esses itens exigem credenciais, escopos, políticas e homologação próprios. A arquitetura agora permite adicioná-los por etapas, sem expor segredos e sem criar ações arbitrárias.
