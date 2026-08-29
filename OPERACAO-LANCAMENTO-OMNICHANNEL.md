# Operação de lançamento omnichannel

Este documento é o roteiro seguro para concluir CRM, IA, Instagram, Messenger e WhatsApp sem antecipar ações dependentes da Meta.

## 1. CRM, contatos e consentimento

- Importações VCF não concedem consentimento automaticamente.
- Antes de materializar um público, deduplicar por telefone E.164, excluir inválidos e consultar `contact_suppressions`.
- Um consentimento de marketing válido exige `granted = true`, finalidade `marketing` e ausência de `revoked_at`.
- `SAIR`, `PARAR`, `CANCELAR`, `REMOVER` e `DESCADASTRAR` revogam consentimento e criam supressão.
- Segmentações devem ser registradas no snapshot da campanha para auditoria.

## 2. WhatsApp preparado

- Número oficial reservado: `5531995285665`, sempre em coexistência; nunca migrar ou desconectar o aplicativo atual.
- Manter campanhas em `simulation_mode = true` até o teste controlado ser aprovado.
- Envio fora da janela de 24 horas exige modelo aprovado e imutável.
- Worker revalida consentimento e supressão imediatamente antes da fila, aplica idempotência, retentativas e pausa por taxa de falha.
- Tokens e segredos permanecem somente nos Secrets/Vault do Supabase.

## 3. IA

- A liberação exige 100% dos cenários ativos aprovados e zero falhas críticas.
- Preços, vagas, roteiros e condições comerciais usam somente dados confirmados do CRM.
- Dados financeiros, documentos e informações pessoais exigem identidade verificada e transferência humana.
- Tomada humana pausa a IA; retorno à IA é explícito e auditado.
- Paris, Egito e Israel — março de 2027 deve ser priorizada quando a consulta mencionar Israel e o contexto comercial correspondente.

## 4. Caixa de atendimento

- Validar entrada, não lidas, atribuição, transferência, histórico e SLA.
- Fluxo esperado: cliente → webhook assinado → persistência idempotente → IA → dispatcher → resposta.
- Fluxo humano: assumir → IA pausada → resposta autenticada → devolver à IA quando aplicável.
- Falhas de canal não podem degradar os demais canais.

## 5. Webhooks e infraestrutura

- Validar challenge, assinatura da Meta, deduplicação por ID externo e registro de eventos.
- Nunca registrar tokens, códigos OAuth, conteúdo sensível ou secrets em logs.
- Monitorar alertas abertos, fila atrasada, conversas fora do SLA e falhas consecutivas.
- Reprocessamentos devem reutilizar a chave de idempotência original.

## 6. Testes antes da aprovação

- Executar `node --test tests/*.test.mjs` com o Node do workspace.
- Executar build GitHub Pages e lint.
- Usar somente contas de teste/autorizadas; não enviar campanhas reais.
- Simular o número oficial, modelos e campanha no banco sem chamar o endpoint de envio da Meta.
- Consultar `meta_prelaunch_preflight()` e exigir zero token vencido, zero dead-letter e zero item travado.
- O limite inicial é 50 mensagens por hora e 200 por 24 horas; aumentar somente após observar entrega e ausência de bloqueios.
- `real_send_locked` permanece ativo até o teste controlado e a aprovação operacional.

### Matriz do teste controlado

1. Receber uma mensagem de conta autorizada e conferir persistência idempotente.
2. Confirmar resposta da IA somente com fonte aprovada.
3. Pedir atendente e conferir `aguardando_equipe`, tomada humana e pausa da IA.
4. Responder como atendente e devolver à IA com resumo de contexto.
5. Simular erro transitório e conferir retentativa exponencial; após cinco falhas, conferir dead-letter.
6. Simular `SAIR` e confirmar revogação, supressão e bloqueio de campanhas.
7. Repetir o mesmo evento e confirmar ausência de mensagem duplicada.

### Backup e recuperação

- Um snapshot sem segredos registra integrações, fluxos, modelos e campanhas ativas antes do lançamento.
- Gere novo snapshot com `create_operational_recovery_snapshot()` antes de liberar envios reais.
- Em incidente, ative `real_send_locked`, pause campanhas e preserve históricos, consentimentos e filas para auditoria.

## 7. Aprovação e lançamento

1. Confirmar aprovação de `instagram_business_basic` e `instagram_business_manage_messages`.
2. Solicitar acesso avançado para `business_management`, `whatsapp_business_management` e `whatsapp_business_messaging`.
3. Conectar `5531995285665` por Embedded Signup em coexistência.
4. Confirmar WABA, `phone_number_id`, webhook e token no Vault.
5. Enviar modelos à Meta e aguardar status aprovado.
6. Realizar um único teste controlado com remetente, destinatário e texto previamente confirmados.
7. Conferir entrada, resposta, entrega, leitura, CRM, consentimento, auditoria e ausência de duplicidade.

## Reversão

- Pausar campanhas e integração; não apagar conta, número, histórico ou consentimentos.
- Manter o WhatsApp Business do celular operante por coexistência.
- Revogar o token no painel da Meta somente se houver suspeita de comprometimento.
- Resolver o alerta após a causa ser corrigida e repetir o teste controlado.
