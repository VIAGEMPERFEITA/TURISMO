# Treinamento rápido da operação omnichannel

## Início do turno

1. Abrir **Integrações** e confirmar zero alertas, zero dead-letter e zero fila travada.
2. Abrir **Caixa de entrada** e tratar primeiro conversas fora do SLA e não lidas.
3. Conferir o ciclo diário da IA e não liberar produção com falha crítica.

## Atendimento

- **Assumir:** pausa a IA e registra o atendente.
- **Transferir:** exige destino e motivo; preserve o contexto.
- **Devolver à IA:** escreva resumo objetivo do que foi decidido.
- **Escalar:** pagamentos, documentos, reclamações, descontos, contratos e reservas permanecem humanos.

## Contatos e campanhas

- Contato importado não significa consentimento.
- Só entram em campanha contatos com consentimento válido e sem supressão.
- `SAIR`, `PARAR`, `REMOVER`, `CANCELAR` e `DESCADASTRAR` bloqueiam novos disparos.
- Nunca retirar `real_send_locked` antes do teste controlado aprovado.

## Incidente

1. Usar **Parada de emergência** e registrar um motivo claro.
2. Preservar mensagens, filas e consentimentos.
3. Executar diagnóstico, corrigir a causa e repetir simulação.
4. Restaurar operação somente com administrador e evidência do teste.
