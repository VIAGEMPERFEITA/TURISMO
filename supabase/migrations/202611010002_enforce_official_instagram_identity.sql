begin;

-- Somente @viagemperfeitatrip pode permanecer ativa neste tenant. O histórico
-- continua preservado para auditoria, mas contas antigas não recebem nem enviam.
update public.channel_accounts
set status='disabled',
    last_error='blocked_non_official_instagram_identity',
    updated_at=now()
where channel='instagram'
  and status='connected'
  and lower(coalesce(settings->>'username',''))<>'viagemperfeitatrip';

update public.channel_accounts
set status='connected', last_error=null, updated_at=now()
where channel='instagram'
  and lower(coalesce(settings->>'username',''))='viagemperfeitatrip';

-- Retira do SLA apenas pendências ligadas a identidades antigas. Nada é
-- apagado e nenhuma mensagem é enviada; as conversas permanecem auditáveis.
update public.conversations c
set status='encerrada',
    requires_human=false,
    ai_managed=false,
    unread_count=0,
    next_action='Histórico encerrado: conta do Instagram não oficial',
    updated_at=now()
from public.channel_accounts ca
where c.channel_account_id=ca.id
  and c.channel='instagram'
  and c.status='aguardando_equipe'
  and lower(coalesce(ca.settings->>'username',''))<>'viagemperfeitatrip';

commit;
