-- Governança operacional para campanhas, consentimentos, canais e caixa omnichannel.
begin;

alter table public.campaigns
  add column if not exists next_batch_at timestamptz,
  add column if not exists last_worker_at timestamptz,
  add column if not exists failure_rate numeric(5,2) not null default 0,
  add column if not exists pause_reason text;

alter table public.conversations
  add column if not exists unread_count integer not null default 0 check (unread_count>=0),
  add column if not exists ai_handoff_summary text,
  add column if not exists last_read_at timestamptz;

create table if not exists public.integration_health_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  event_type text not null,
  severity text not null default 'info' check(severity in ('info','warning','critical')),
  status text not null default 'open' check(status in ('open','resolved')),
  details jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists integration_health_open_idx on public.integration_health_events(organization_id,status,severity,occurred_at desc);
alter table public.integration_health_events enable row level security;
drop policy if exists integration_health_staff_read on public.integration_health_events;
create policy integration_health_staff_read on public.integration_health_events for select to authenticated
  using(organization_id=public.current_organization_id());

create or replace function public.manage_campaign(target_campaign_id uuid,target_action text)
returns public.campaigns language plpgsql security definer set search_path=public as $$
declare c public.campaigns%rowtype; new_status text;
begin
  if auth.uid() is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
  select * into c from public.campaigns where id=target_campaign_id and organization_id=public.current_organization_id() for update;
  if c.id is null then raise exception 'campaign_not_found'; end if;
  new_status:=case
    when target_action='approve' and c.status in ('rascunho','aguardando_aprovacao') then 'agendada'
    when target_action='start' and c.status in ('agendada','pausada') then 'em_andamento'
    when target_action='pause' and c.status='em_andamento' then 'pausada'
    when target_action='cancel' and c.status not in ('concluida','cancelada') then 'cancelada'
    else null end;
  if new_status is null then raise exception 'invalid_campaign_transition'; end if;
  if target_action in ('approve','start') and not c.simulation_mode and c.template_id is null then raise exception 'approved_template_required'; end if;
  update public.campaigns set status=new_status,
    approved_by=case when target_action='approve' then auth.uid() else approved_by end,
    approved_at=case when target_action='approve' then now() else approved_at end,
    started_at=case when target_action='start' then coalesce(started_at,now()) else started_at end,
    paused_at=case when target_action='pause' then now() else paused_at end,
    cancelled_at=case when target_action='cancel' then now() else cancelled_at end,
    next_batch_at=case when target_action in ('approve','start') then greatest(coalesce(scheduled_at,now()),now()) else next_batch_at end,
    pause_reason=case when target_action='pause' then 'pausa_manual' when target_action in ('approve','start') then null else pause_reason end,
    updated_at=now() where id=c.id returning * into c;
  insert into public.campaign_audit_logs(organization_id,campaign_id,actor_id,action,current_data)
  values(c.organization_id,c.id,auth.uid(),'campaign_'||target_action,to_jsonb(c));
  return c;
end; $$;
revoke all on function public.manage_campaign(uuid,text) from public,anon;
grant execute on function public.manage_campaign(uuid,text) to authenticated;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  update public.conversations set unread_count=0,last_read_at=now(),updated_at=now()
  where id=target_conversation_id and organization_id=public.current_organization_id();
end; $$;
revoke all on function public.mark_conversation_read(uuid) from public,anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.track_inbound_unread() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.direction='entrada' then update public.conversations set unread_count=unread_count+1 where id=new.conversation_id; end if;
  return new;
end; $$;
drop trigger if exists messages_track_inbound_unread on public.messages;
create trigger messages_track_inbound_unread after insert on public.messages for each row execute function public.track_inbound_unread();

create or replace function public.protect_approved_message_template() returns trigger language plpgsql set search_path=public as $$
begin
  if old.status='aprovado' and (new.content is distinct from old.content or new.name is distinct from old.name or new.language_code is distinct from old.language_code or new.variables is distinct from old.variables) then
    raise exception 'approved_template_is_immutable_create_new_version';
  end if;
  return new;
end; $$;
drop trigger if exists message_templates_protect_approved on public.message_templates;
create trigger message_templates_protect_approved before update on public.message_templates for each row execute function public.protect_approved_message_template();

create or replace function public.operational_readiness_center() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'channels',coalesce((select jsonb_agg(jsonb_build_object('provider',i.provider,'enabled',i.enabled,'simulation',i.simulation_mode,'credentials',i.credentials_configured,'updated_at',i.updated_at)) from public.integration_settings i where i.organization_id=public.current_organization_id()),'[]'::jsonb),
    'open_health_alerts',(select count(*) from public.integration_health_events h where h.organization_id=public.current_organization_id() and h.status='open'),
    'unread_conversations',(select count(*) from public.conversations c where c.organization_id=public.current_organization_id() and c.unread_count>0 and c.status<>'encerrada'),
    'over_sla',(select count(*) from public.conversations c where c.organization_id=public.current_organization_id() and c.status='aguardando_equipe' and coalesce(c.last_customer_message_at,c.started_at)<now()-interval '15 minutes'),
    'imported_contacts',jsonb_build_object(
      'total',(select count(*) from public.leads l where l.organization_id=public.current_organization_id() and l.source='Importação VCF' and l.deleted_at is null),
      'consented',(select count(*) from public.leads l where l.organization_id=public.current_organization_id() and l.source='Importação VCF' and l.deleted_at is null and exists(select 1 from public.contact_consents cc where cc.organization_id=l.organization_id and cc.lead_id=l.id and cc.purpose='marketing' and cc.granted and cc.revoked_at is null)),
      'suppressed',(select count(*) from public.leads l where l.organization_id=public.current_organization_id() and l.source='Importação VCF' and l.deleted_at is null and exists(select 1 from public.contact_suppressions cs where cs.organization_id=l.organization_id and cs.phone_e164=case when l.phone_normalized like '55%' then l.phone_normalized else '55'||l.phone_normalized end and cs.released_at is null))
    )
  );
$$;
revoke all on function public.operational_readiness_center() from public,anon;
grant execute on function public.operational_readiness_center() to authenticated;

commit;
