-- Reconcilia o estado declarado dos canais com falhas reais já registradas.
begin;

with invalid_instagram as (
  select distinct organization_id,channel_account_id
  from public.instagram_outbound_messages
  where status='falhou' and last_error ~ 'meta_(401|403|400)_(190|102)?'
)
update public.channel_accounts ca set status='degraded',last_error='instagram_access_token_invalid',updated_at=now()
from invalid_instagram f where ca.id=f.channel_account_id and ca.organization_id=f.organization_id;

update public.integration_connectors ic set status='degraded',last_error='instagram_access_token_invalid',updated_at=now()
where ic.provider='meta' and ic.connector_type='social_messaging'
and exists(select 1 from public.channel_accounts ca where ca.organization_id=ic.organization_id and ca.channel='instagram' and ca.status='degraded');

insert into public.integration_health_events(organization_id,provider,event_type,severity,details)
select ca.organization_id,'instagram','credential_invalid','critical',jsonb_build_object('channel_account_id',ca.id,'reconciled',true)
from public.channel_accounts ca where ca.channel='instagram' and ca.status='degraded' and ca.last_error='instagram_access_token_invalid'
and not exists(select 1 from public.integration_health_events h where h.organization_id=ca.organization_id and h.provider='instagram' and h.event_type='credential_invalid' and h.status='open');

commit;
