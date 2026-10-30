-- Encerra alertas transitórios que já foram contidos sem apagar o histórico.
begin;

create or replace function public.run_operational_guardian() returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  org uuid:=public.current_organization_id();
  result jsonb;
  severity_value text;
  resolved_transient integer:=0;
  resolved_credentials integer:=0;
begin
  if auth.uid() is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;

  result:=public.meta_prelaunch_preflight();
  severity_value:=case
    when coalesce((result->>'expired_tokens')::int,0)>0 or coalesce((result->>'webhook_dead_letter')::int,0)>0 then 'critical'
    else 'warning'
  end;

  if coalesce((result->>'expired_tokens')::int,0)>0 or coalesce((result->>'tokens_expiring_14d')::int,0)>0 then
    insert into public.integration_health_events(organization_id,provider,event_type,severity,details)
    select org,'meta','token_health',severity_value,result
    where not exists(select 1 from public.integration_health_events h where h.organization_id=org and h.event_type='token_health' and h.status='open');
  else
    update public.integration_health_events set status='resolved',resolved_at=now()
    where organization_id=org and event_type='token_health' and status='open';
  end if;

  if coalesce((result->>'queue_stuck')::int,0)>0 or coalesce((result->>'webhook_dead_letter')::int,0)>0 then
    insert into public.integration_health_events(organization_id,provider,event_type,severity,details)
    select org,'omnichannel','queue_health',severity_value,result
    where not exists(select 1 from public.integration_health_events h where h.organization_id=org and h.event_type='queue_health' and h.status='open');
  else
    update public.integration_health_events set status='resolved',resolved_at=now()
    where organization_id=org and event_type='queue_health' and status='open';
  end if;

  -- recipient_unavailable é um incidente de uma conversa, não uma degradação do canal.
  -- O dispatcher já interrompe retentativas e transfere a conversa para atendimento humano.
  update public.integration_health_events h
  set status='resolved',resolved_at=now()
  where h.organization_id=org and h.status='open' and h.event_type='recipient_unavailable'
    and exists(
      select 1 from public.conversations c
      where c.id=(h.details->>'conversation_id')::uuid
        and c.organization_id=org
        and (c.control_mode='humano' or c.requires_human or c.status in ('aguardando_equipe','em_atendimento','encerrada'))
    );
  get diagnostics resolved_transient=row_count;

  -- Uma credencial reconectada e validada não deve manter o canal em alerta crítico.
  update public.integration_health_events h
  set status='resolved',resolved_at=now()
  where h.organization_id=org and h.status='open' and h.event_type='credential_invalid'
    and exists(
      select 1 from public.channel_accounts ca
      where ca.organization_id=org and ca.channel=h.provider
        and ca.status='connected' and ca.last_error is null
    );
  get diagnostics resolved_credentials=row_count;
  resolved_transient:=resolved_transient+resolved_credentials;

  insert into public.operational_test_runs(organization_id,test_type,status,results,created_by)
  values(
    org,'guardian',
    case when severity_value='critical' then 'failed' when coalesce((result->>'queue_stuck')::int,0)>0 then 'warning' else 'passed' end,
    result||jsonb_build_object('resolved_transient_alerts',resolved_transient),auth.uid()
  );

  return result||jsonb_build_object(
    'checked_at',now(),
    'resolved_transient_alerts',resolved_transient,
    'contact_governance',public.audit_contact_governance(),
    'delivery',public.channel_delivery_metrics()
  );
end; $$;

revoke all on function public.run_operational_guardian() from public,anon;
grant execute on function public.run_operational_guardian() to authenticated;

commit;
