begin;

-- Reconexões antigas chegaram a registrar mais de uma linha com o username
-- oficial. A conexão válida é sempre a confirmação OAuth mais recente.
with ranked as (
  select id,
         row_number() over (
           partition by organization_id
           order by coalesce((settings->>'connected_at')::timestamptz,updated_at) desc,
                    updated_at desc,
                    id desc
         ) as position
  from public.channel_accounts
  where channel='instagram'
    and status='connected'
    and lower(coalesce(settings->>'username',''))='viagemperfeitatrip'
)
update public.channel_accounts ca
set status='disabled',
    last_error='superseded_by_latest_official_instagram_connection',
    updated_at=now()
from ranked r
where ca.id=r.id and r.position>1;

-- Pendências presas nas conexões substituídas deixam o SLA, mas todo o
-- conteúdo permanece disponível no histórico para auditoria.
update public.conversations c
set status='encerrada',
    requires_human=false,
    ai_managed=false,
    unread_count=0,
    next_action='Histórico encerrado: conexão do Instagram substituída',
    updated_at=now()
from public.channel_accounts ca
where c.channel_account_id=ca.id
  and c.channel='instagram'
  and c.status='aguardando_equipe'
  and ca.status='disabled'
  and ca.last_error in (
    'blocked_non_official_instagram_identity',
    'superseded_by_latest_official_instagram_connection',
    'superseded_by_official_instagram_account',
    'superseded_by_instagram_reconnection'
  );

commit;
