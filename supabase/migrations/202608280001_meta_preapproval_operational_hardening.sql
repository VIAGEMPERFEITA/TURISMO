-- Pré-operação Meta: credenciais, retentativas, aquecimento e diagnóstico sem envios externos.
begin;

alter table public.integration_connectors
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_validated_at timestamptz,
  add column if not exists health_checked_at timestamptz;

alter table public.channel_accounts
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_validated_at timestamptz,
  add column if not exists health_checked_at timestamptz;

alter table public.webhook_events
  add column if not exists max_attempts integer not null default 5 check(max_attempts between 1 and 10),
  add column if not exists dead_lettered_at timestamptz;

alter table public.campaigns
  add column if not exists hourly_send_limit integer not null default 50 check(hourly_send_limit between 1 and 1000),
  add column if not exists daily_send_limit integer not null default 200 check(daily_send_limit between 1 and 10000),
  add column if not exists warmup_stage integer not null default 1 check(warmup_stage between 1 and 5),
  add column if not exists real_send_locked boolean not null default true;

create table if not exists public.operational_recovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_type text not null default 'pre_launch',
  payload jsonb not null,
  checksum text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists operational_recovery_snapshots_org_idx
  on public.operational_recovery_snapshots(organization_id,created_at desc);
alter table public.operational_recovery_snapshots enable row level security;
drop policy if exists operational_recovery_snapshots_read on public.operational_recovery_snapshots;
create policy operational_recovery_snapshots_read on public.operational_recovery_snapshots for select to authenticated
  using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));

create or replace function public.schedule_webhook_retry(target_event_id uuid,target_error text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.webhook_events%rowtype; next_attempt integer; delay_seconds integer;
begin
  select * into e from public.webhook_events where id=target_event_id and organization_id=public.current_organization_id() for update;
  if e.id is null then raise exception 'webhook_event_not_found'; end if;
  next_attempt:=e.attempts+1;
  if next_attempt>=e.max_attempts then
    update public.webhook_events set status='dead_letter',attempts=next_attempt,last_error=left(target_error,2000),next_attempt_at=null,dead_lettered_at=now() where id=e.id;
    return jsonb_build_object('status','dead_letter','attempts',next_attempt);
  end if;
  delay_seconds:=least(3600,30*power(2,greatest(0,next_attempt-1))::integer);
  update public.webhook_events set status='retry_scheduled',attempts=next_attempt,last_error=left(target_error,2000),next_attempt_at=now()+make_interval(secs=>delay_seconds),dead_lettered_at=null where id=e.id;
  return jsonb_build_object('status','retry_scheduled','attempts',next_attempt,'delay_seconds',delay_seconds);
end; $$;
revoke all on function public.schedule_webhook_retry(uuid,text) from public,anon;
grant execute on function public.schedule_webhook_retry(uuid,text) to authenticated;

create or replace function public.create_operational_recovery_snapshot()
returns uuid language plpgsql security definer set search_path=public as $$
declare target_org uuid:=public.current_organization_id(); snapshot jsonb; snapshot_id uuid;
begin
  if auth.uid() is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
  snapshot:=jsonb_build_object(
    'created_at',now(),
    'integration_settings',coalesce((select jsonb_agg(to_jsonb(i)-'secret_names') from public.integration_settings i where i.organization_id=target_org),'[]'::jsonb),
    'channel_accounts',coalesce((select jsonb_agg(to_jsonb(c)-'credential_secret_name'-'webhook_secret_name') from public.channel_accounts c where c.organization_id=target_org),'[]'::jsonb),
    'automation_flows',coalesce((select jsonb_agg(to_jsonb(f)) from public.automation_flows f where f.organization_id=target_org),'[]'::jsonb),
    'message_templates',coalesce((select jsonb_agg(to_jsonb(t)) from public.message_templates t where t.organization_id=target_org),'[]'::jsonb),
    'active_campaigns',coalesce((select jsonb_agg(to_jsonb(c)) from public.campaigns c where c.organization_id=target_org and c.status not in ('concluida','cancelada','falhou')),'[]'::jsonb)
  );
  insert into public.operational_recovery_snapshots(organization_id,payload,checksum,created_by)
  values(target_org,snapshot,md5(snapshot::text),auth.uid()) returning id into snapshot_id;
  return snapshot_id;
end; $$;
revoke all on function public.create_operational_recovery_snapshot() from public,anon;
grant execute on function public.create_operational_recovery_snapshot() to authenticated;

create or replace function public.meta_prelaunch_preflight()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'expired_tokens',(select count(*) from public.channel_accounts c where c.organization_id=public.current_organization_id() and c.status in ('connected','degraded') and c.token_expires_at is not null and c.token_expires_at<=now()),
    'tokens_expiring_14d',(select count(*) from public.channel_accounts c where c.organization_id=public.current_organization_id() and c.status in ('connected','degraded') and c.token_expires_at>now() and c.token_expires_at<=now()+interval '14 days'),
    'stale_validations',(select count(*) from public.channel_accounts c where c.organization_id=public.current_organization_id() and c.status='connected' and coalesce(c.last_validated_at,c.updated_at)<now()-interval '7 days'),
    'webhook_retrying',(select count(*) from public.webhook_events w where w.organization_id=public.current_organization_id() and w.status='retry_scheduled'),
    'webhook_dead_letter',(select count(*) from public.webhook_events w where w.organization_id=public.current_organization_id() and w.status='dead_letter'),
    'queue_stuck',(select count(*) from public.campaign_recipients r where r.organization_id=public.current_organization_id() and r.status in ('na_fila','processando') and r.updated_at<now()-interval '15 minutes'),
    'campaigns_unlocked',(select count(*) from public.campaigns c where c.organization_id=public.current_organization_id() and c.real_send_locked=false and c.simulation_mode=true),
    'handoffs_waiting',(select count(*) from public.conversations c where c.organization_id=public.current_organization_id() and c.status='aguardando_equipe'),
    'recovery_snapshot_at',(select max(s.created_at) from public.operational_recovery_snapshots s where s.organization_id=public.current_organization_id()),
    'simulation_only',not exists(select 1 from public.campaigns c where c.organization_id=public.current_organization_id() and c.status in ('agendada','em_andamento') and c.simulation_mode=false and c.real_send_locked=false)
  );
$$;
revoke all on function public.meta_prelaunch_preflight() from public,anon;
grant execute on function public.meta_prelaunch_preflight() to authenticated;

insert into public.operational_recovery_snapshots(organization_id,snapshot_type,payload,checksum)
select o.id,'pre_launch',p.payload,md5(p.payload::text)
from public.organizations o
cross join lateral (select jsonb_build_object('created_at',now(),'reason','meta_preapproval_hardening','simulation_only',true,'official_phone','5531995285665') payload) p
where o.slug='viagem-perfeita'
  and not exists(select 1 from public.operational_recovery_snapshots s where s.organization_id=o.id and s.snapshot_type='pre_launch');

commit;
