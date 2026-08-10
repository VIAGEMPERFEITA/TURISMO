# Automações operacionais

## Implementadas no banco

- Novo lead: deduplicação, interesse, atividade, fila de e-mail e tarefa de primeiro contato.
- WhatsApp: evento `whatsapp_started` separado de mensagem enviada.
- Lead sem resposta: tarefa após 24 horas.
- Proposta enviada: follow-up em três dias e fila de e-mail.
- Desconto acima do limite: aprovação e tarefa para gestor.
- Reserva iniciada: tarefa da entrada, checklist documental, fila de e-mail e execução auditada.
- Pagamento: marca vencido e cria tarefas para vencido ou a vencer em três dias.
- Documento: cria tarefa quando o prazo vence.
- Proposta: muda para vencida depois da validade.

Todas as execuções registram `automation_runs`. `automation_key` impede tarefas duplicadas.

## Ciclo agendado

`run_operational_automation_cycle()` é idempotente e deve ser executado pelo agendador seguro do Supabase. A ativação do cron e o processador contínuo da fila de e-mails precisam ser homologados com segredo de servidor antes da operação real; nenhuma chave deve ser gravada em SQL ou no GitHub.

## WhatsApp

O atendimento público abre `https://wa.me/5531995285665` com mensagem gerada por `encodeURIComponent()`. O evento significa início do atendimento, não mensagem entregue.
