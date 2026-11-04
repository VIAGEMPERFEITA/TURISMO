begin;

-- Conversas de conectores desativados pertencem ao histórico legado. Elas
-- permanecem integralmente no banco para auditoria, mas não devem aparecer na
-- fila operacional nem inflar os indicadores de mensagens não lidas.
update public.conversations c
set status='encerrada',
    requires_human=false,
    ai_managed=false,
    unread_count=0,
    next_action='Histórico preservado em quarentena: conector desativado ou substituído',
    updated_at=now()
from public.channel_accounts ca
where c.channel_account_id=ca.id
  and ca.status='disabled'
  and c.status<>'encerrada';

-- Registros pessoais/testes confirmados na auditoria visual do inbox. A
-- comparação é exata para não atingir homônimos ou leads comerciais reais.
update public.conversations c
set status='encerrada',
    requires_human=false,
    ai_managed=false,
    unread_count=0,
    next_action='Histórico preservado em quarentena: contato pessoal, teste ou mensagem não comercial',
    updated_at=now()
from public.leads l
where c.lead_id=l.id
  and c.organization_id=public.default_organization_id()
  and c.status<>'encerrada'
  and lower(trim(l.name)) in ('amor','ameu vivo','vp turismo');

commit;
