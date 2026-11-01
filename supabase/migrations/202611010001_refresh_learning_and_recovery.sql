-- Atualiza as evidências operacionais sem enviar mensagens ou publicar sugestões da IA.
begin;

do $$
declare
  target_org uuid;
  snapshot jsonb;
begin
  select id into target_org
  from public.organizations
  where slug='viagem-perfeita' and active=true
  limit 1;

  if target_org is null then
    raise exception 'viagem_perfeita_organization_not_found';
  end if;

  perform public.run_daily_ai_learning_for_org(target_org);

  snapshot:=jsonb_build_object(
    'created_at',now(),
    'reason','authorized_operational_refresh',
    'contains_secrets',false,
    'integration_settings',coalesce((select jsonb_agg(to_jsonb(i)-'secret_names') from public.integration_settings i where i.organization_id=target_org),'[]'::jsonb),
    'channel_accounts',coalesce((select jsonb_agg(to_jsonb(c)-'credential_secret_name'-'webhook_secret_name') from public.channel_accounts c where c.organization_id=target_org),'[]'::jsonb),
    'automation_flows',coalesce((select jsonb_agg(to_jsonb(f)) from public.automation_flows f where f.organization_id=target_org),'[]'::jsonb),
    'message_templates',coalesce((select jsonb_agg(to_jsonb(t)) from public.message_templates t where t.organization_id=target_org),'[]'::jsonb),
    'active_campaigns',coalesce((select jsonb_agg(to_jsonb(c)) from public.campaigns c where c.organization_id=target_org and c.status not in ('concluida','cancelada','falhou')),'[]'::jsonb)
  );

  insert into public.operational_recovery_snapshots(organization_id,snapshot_type,payload,checksum)
  values(target_org,'operational_refresh',snapshot,md5(snapshot::text));
end $$;

commit;
