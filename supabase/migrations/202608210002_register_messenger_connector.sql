-- Exibe e governa o conector do Messenger no painel administrativo.
insert into public.integration_connectors(
  organization_id, name, connector_type, provider, status, auth_type,
  credential_secret_name, scopes, settings, last_sync_at, last_error, updated_at
)
select
  id, 'Facebook Messenger API', 'social_messaging', 'meta', 'connected', 'page_access_token',
  'META_FACEBOOK_PAGE_ACCESS_TOKEN',
  array['pages_messaging','pages_manage_metadata'],
  '{"page_id":"557000254323128","app_id":"1295731149305805","webhook_field":"messages","api_version":"v26.0","credentials":"supabase_secrets"}'::jsonb,
  now(), null, now()
from public.organizations
where slug='viagem-perfeita'
on conflict(organization_id,name) do update set
  connector_type=excluded.connector_type,
  provider=excluded.provider,
  status=excluded.status,
  auth_type=excluded.auth_type,
  credential_secret_name=excluded.credential_secret_name,
  scopes=excluded.scopes,
  settings=excluded.settings,
  last_sync_at=excluded.last_sync_at,
  last_error=null,
  updated_at=now();
