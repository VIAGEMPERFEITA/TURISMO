-- Mantém no CRM somente os escopos efetivamente concedidos e necessários.
update public.channel_accounts
set scopes=array['pages_messaging'],
    settings=settings || '{"token_validated":true,"token_permanent":true}'::jsonb,
    last_sync_at=now(),
    last_error=null,
    updated_at=now()
where channel='messenger'
  and external_account_id='557000254323128';

update public.integration_connectors
set scopes=array['pages_messaging'],
    settings=settings || '{"token_validated":true,"token_permanent":true}'::jsonb,
    last_sync_at=now(),
    last_error=null,
    updated_at=now()
where name='Facebook Messenger API'
  and organization_id=(select id from public.organizations where slug='viagem-perfeita' limit 1);
