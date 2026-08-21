-- Conecta a Página oficial da Viagem Perfeita ao runtime omnichannel.
do $$
declare
  org_id uuid;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  if org_id is null then raise exception 'organization_not_found'; end if;

  insert into public.channel_accounts(
    organization_id, channel, name, provider, external_account_id, status,
    credential_secret_name, webhook_secret_name, scopes, capabilities, settings,
    last_sync_at, last_error, updated_at
  ) values (
    org_id, 'messenger', 'Facebook Messenger — Viagem Perfeita', 'meta',
    '557000254323128', 'connected', null, 'META_MESSENGER_VERIFY_TOKEN',
    array['pages_messaging','pages_manage_metadata'],
    '{"direct":true,"human_handoff":true,"ai_assistant":true}'::jsonb,
    '{"page_id":"557000254323128","app_id":"1295731149305805","webhook_field":"messages","api_version":"v26.0"}'::jsonb,
    now(), null, now()
  )
  on conflict(organization_id,channel,name) do update set
    provider=excluded.provider,
    external_account_id=excluded.external_account_id,
    status=excluded.status,
    credential_secret_name=excluded.credential_secret_name,
    webhook_secret_name=excluded.webhook_secret_name,
    scopes=excluded.scopes,
    capabilities=excluded.capabilities,
    settings=excluded.settings,
    last_sync_at=excluded.last_sync_at,
    last_error=null,
    updated_at=now();
end $$;
