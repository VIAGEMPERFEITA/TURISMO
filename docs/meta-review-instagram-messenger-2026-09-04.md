# Preparação de homologação — Instagram e Messenger

Data da verificação: 04/09/2026.

## Estado confirmado na Meta

- App: `Viagem Perfeita Atendimento` (`1295731149305805`).
- Instagram oficial desta plataforma: `@viagemperfeitatrip` (`17841402163210508`).
- Webhook do Instagram: ativo; eventos de mensagens e interações necessários estão assinados.
- Página oficial do Messenger: `Viagem Perfeita` (`557000254323128`).
- Webhook do Messenger: `facebook-messenger-webhook`; evento `messages` assinado.
- Token da Página: renovado e armazenado no segredo `META_FACEBOOK_PAGE_ACCESS_TOKEN` do Supabase.
- `pages_messaging`: aguardando inclusão em uma nova análise. A Meta direciona o pedido para a tela de envios porque já existe uma análise do WhatsApp em andamento.
- Instagram: `instagram_business_basic` e `instagram_business_manage_messages` precisam ser reenviadas com um novo screencast.

## Motivo exato da reprovação anterior do Instagram

O caso de uso foi considerado permitido. A reprovação ocorreu porque o vídeo não mostrou, de ponta a ponta:

1. seleção visível do ativo correto;
2. envio ao vivo pela interface do CRM;
3. a mesma mensagem entregue no aplicativo nativo do Instagram.

## Roteiro do vídeo — Instagram

Gravar em inglês, sem cortes nas etapas essenciais e com legendas curtas.

1. Mostrar a URL e entrar no CRM como administrador.
2. Abrir **Settings → Meta connections**.
3. Iniciar **Connect Instagram** e mostrar o fluxo completo de login/autorização da Meta.
4. Mostrar a conta selecionada: `@viagemperfeitatrip`.
5. Mostrar as permissões solicitadas: `instagram_business_basic` e `instagram_business_manage_messages`.
6. Abrir **Inbox**, filtrar **Instagram** e mostrar o identificador da conta ativa.
7. De uma conta autorizada de teste, enviar: `Hello, I would like information about the Paris, Egypt and Israel trip.`
8. Mostrar a mensagem chegando ao CRM e sendo registrada uma única vez.
9. Pela interface do CRM, responder: `Hello! I can help with the official itinerary. Would you like to travel in 2027 or 2028?`
10. Mostrar exatamente essa resposta entregue no Direct do Instagram.
11. Solicitar atendimento humano, assumir a conversa e mostrar que a IA foi pausada.
12. Mostrar Política de Privacidade e exclusão de dados.

## Roteiro do vídeo — Messenger

1. Mostrar o CRM em inglês e a Página selecionada: `Viagem Perfeita` (`557000254323128`).
2. Mostrar que o webhook aponta para o endpoint operacional e que `messages` está assinado.
3. De um perfil com função de administrador/testador, enviar: `Hello, I need information about the 2028 trips.`
4. Mostrar a mensagem chegando na caixa unificada como **Messenger**.
5. Mostrar persistência, deduplicação e resposta assistida pela IA.
6. Pela interface do CRM, responder: `Hello! All 2027 caravan options are also available for 2028. Which destination interests you?`
7. Mostrar a mesma resposta entregue no Messenger nativo.
8. Demonstrar **Take over**, pausa da IA, nota interna e **Return to AI**.
9. Encerrar mostrando que campanhas continuam bloqueadas sem consentimento.

## Checklist antes de gravar

- Usar somente contas com função de administrador, desenvolvedor ou testador enquanto não houver acesso avançado.
- Não exibir tokens, senhas, códigos OAuth ou dados reais de clientes.
- Usar uma conversa criada especificamente para a homologação.
- Manter o nome/ID do ativo visível antes do envio.
- Mostrar o CRM e o cliente nativo na mesma gravação.
- Não usar somente o console da Meta como prova.
- Verificar áudio, legendas e resolução antes do envio.
- Não reenviar enquanto a análise atual do WhatsApp estiver aberta.

## Validações internas executadas

- Testes automatizados: 176 aprovados, sem falhas.
- Testes direcionados após a correção da IA: 28 aprovados, sem falhas.
- Build de produção: concluído, TypeScript aprovado e 125 páginas geradas.
- Lint: zero erros; 18 avisos não bloqueantes de otimização de imagens.
- Diagnóstico multicanal: executado em modo seguro, sem mensagem externa.
- Simulação de Instagram, Messenger e WhatsApp: executada sem envio externo.
- Filas: zero dead-letter, zero travadas e zero retentativas na última leitura confirmada.
- Alertas operacionais: zero na última leitura confirmada.

## Ajuste aplicado à IA

Dúvidas sobre bagagem/voo, boleto/Pix, datas, documentação, hospedagem, inclusões, líder/guia e experiência espiritual agora exigem fonte oficial. Sem fonte retornada pelo CRM, a IA informa a limitação e transfere para uma pessoa, em vez de afirmar por conta própria.

## Pendências externas finais

1. Conclusão da análise atual do WhatsApp pela Meta.
2. Novo envio do Instagram com o screencast completo.
3. Solicitação de `pages_messaging` com o screencast do Messenger.
4. Um teste real controlado por canal, com remetente, destinatário e texto previamente confirmados.
