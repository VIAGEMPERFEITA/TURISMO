-- Mantém a saúde independente por produto Meta.
begin;

update public.integration_connectors ic set status='connected',last_error=null,updated_at=now()
where ic.name='Facebook Messenger API'
and exists(select 1 from public.channel_accounts ca where ca.organization_id=ic.organization_id and ca.channel='messenger' and ca.status='connected' and ca.last_error is null);

update public.integration_connectors ic set status='degraded',last_error='instagram_access_token_invalid',updated_at=now()
where ic.name='Instagram Messaging API'
and exists(select 1 from public.channel_accounts ca where ca.organization_id=ic.organization_id and ca.channel='instagram' and ca.status='degraded');

commit;
