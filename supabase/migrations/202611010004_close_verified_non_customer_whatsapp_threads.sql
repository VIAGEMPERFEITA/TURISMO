begin;

-- Encerramento operacional de duas entradas verificadas como não clientes:
-- publicidade odontológica destinada a terceiro e conteúdo repetido não
-- suportado. O histórico é preservado; nenhuma mensagem é enviada.
update public.conversations
set status='encerrada',
    requires_human=false,
    ai_managed=false,
    unread_count=0,
    next_action='Encerrado após triagem: mensagem não relacionada ao atendimento da Viagem Perfeita',
    updated_at=now()
where organization_id=public.default_organization_id()
  and channel='whatsapp'
  and status='aguardando_equipe'
  and external_thread_id in ('553131574465','5511919351515');

commit;
