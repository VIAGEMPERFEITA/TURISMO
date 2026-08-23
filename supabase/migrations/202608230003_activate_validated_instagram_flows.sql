-- Activates only the four Instagram journeys explicitly validated and approved by the administrator.
begin;

do $$
declare
  target_org uuid;
  activated_count integer;
begin
  select id into target_org from public.organizations where slug='viagem-perfeita' and active=true limit 1;
  if target_org is null then raise exception 'organization_not_found'; end if;
  if not exists(select 1 from public.channel_accounts where organization_id=target_org and channel='instagram' and status='connected' and last_error is null) then
    raise exception 'instagram_not_connected';
  end if;
  if not exists(select 1 from public.integration_connectors where organization_id=target_org and name='Instagram Messaging API' and status='connected' and last_error is null) then
    raise exception 'instagram_connector_not_ready';
  end if;
  if not exists(select 1 from public.ai_configurations where organization_id=target_org and enabled and provider_ready and mode<>'desativado') then
    raise exception 'ai_not_ready';
  end if;

  update public.automation_flows set status='active',updated_at=now()
  where organization_id=target_org and channel='instagram' and name in(
    'Atendimento automático no Direct',
    'Menção ou resposta ao Story',
    'Palavra-chave no Direct',
    'Comentário para conversa'
  );
  get diagnostics activated_count=row_count;
  if activated_count<>4 then raise exception 'expected_four_instagram_flows_got_%',activated_count; end if;

  insert into public.audit_logs(organization_id,action,entity_type,after_data)
  values(target_org,'instagram_flows_activated','automation_flow',jsonb_build_object(
    'count',activated_count,'channel','instagram','approved_by','administrator','validated_matrix','196/196','activated_at',now()
  ));
end $$;

commit;
