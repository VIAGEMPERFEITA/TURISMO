-- Automação conversacional do Instagram inspirada em padrões consolidados de mercado.
-- Tudo nasce em rascunho: nenhuma mensagem externa é enviada sem conexão e aprovação da Meta.

alter table public.automation_flows add column if not exists channel text not null default 'internal';
alter table public.automation_flows add column if not exists objective text;
alter table public.automation_flows add column if not exists metrics jsonb not null default '{}'::jsonb;

create table if not exists public.social_automation_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  flow_id uuid references public.automation_flows(id) on delete set null,
  social_event_id uuid references public.social_events(id) on delete set null,
  contact_identity_id uuid references public.contact_identities(id) on delete set null,
  status text not null default 'queued' check(status in ('queued','running','waiting','handed_off','converted','completed','failed','cancelled')),
  current_step text,
  consent_status text not null default 'unknown' check(consent_status in ('unknown','granted','denied','not_required')),
  messaging_window_expires_at timestamptz,
  input_redacted jsonb not null default '{}',
  output_redacted jsonb not null default '{}',
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists social_automation_executions_org_idx
  on public.social_automation_executions(organization_id,status,started_at desc);

alter table public.social_automation_executions enable row level security;
drop policy if exists social_automation_executions_tenant_read on public.social_automation_executions;
create policy social_automation_executions_tenant_read on public.social_automation_executions
  for select to authenticated using(organization_id=public.current_organization_id());
drop policy if exists social_automation_executions_tenant_write on public.social_automation_executions;
create policy social_automation_executions_tenant_write on public.social_automation_executions
  for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

create or replace function public.create_instagram_automation(
  flow_name text,
  flow_description text,
  flow_trigger text,
  flow_objective text,
  flow_definition jsonb
) returns uuid
language plpgsql security definer set search_path=public as $$
declare org_id uuid; profile_id uuid; created_id uuid;
begin
  if not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
  if length(trim(coalesce(flow_name,'')))<3 then raise exception 'invalid_name'; end if;
  if flow_trigger not in ('instagram_dm','instagram_keyword','instagram_comment','instagram_story_mention','instagram_story_reply','instagram_ad_referral','instagram_follow') then raise exception 'invalid_trigger'; end if;
  org_id:=public.current_organization_id(); profile_id:=auth.uid();
  insert into public.automation_flows(organization_id,name,description,status,trigger_type,channel,objective,frequency_limit,quiet_hours,consent_required,created_by)
  values(org_id,trim(flow_name),nullif(trim(flow_description),''),'draft',flow_trigger,'instagram',nullif(trim(flow_objective),''),
    '{"per_contact":1,"period_hours":24}'::jsonb,'{"timezone":"America/Sao_Paulo","start":"20:00","end":"08:00"}'::jsonb,true,profile_id)
  returning id into created_id;
  insert into public.automation_versions(organization_id,flow_id,version,definition,status,created_by)
  values(org_id,created_id,1,coalesce(flow_definition,'{}'::jsonb),'draft',profile_id);
  update public.automation_flows set active_version=1 where id=created_id;
  return created_id;
end $$;

create or replace function public.set_instagram_automation_status(flow_id uuid, new_status text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
  if new_status not in ('draft','active','paused','archived') then raise exception 'invalid_status'; end if;
  if new_status='active' and not exists(
    select 1 from public.channel_accounts ca where ca.organization_id=public.current_organization_id()
    and ca.channel='instagram' and ca.status='connected'
  ) then raise exception 'instagram_not_connected'; end if;
  update public.automation_flows set status=new_status,updated_at=now()
  where id=flow_id and organization_id=public.current_organization_id() and channel='instagram';
  if not found then raise exception 'flow_not_found'; end if;
end $$;

revoke all on function public.create_instagram_automation(text,text,text,text,jsonb) from public,anon;
revoke all on function public.set_instagram_automation_status(uuid,text) from public,anon;
grant execute on function public.create_instagram_automation(text,text,text,text,jsonb) to authenticated;
grant execute on function public.set_instagram_automation_status(uuid,text) to authenticated;

insert into public.channel_accounts(organization_id,channel,name,provider,status,capabilities,settings)
select id,'instagram','Instagram Viagem Perfeita','meta','pending',
  '{"receive_dm":true,"receive_comments":true,"receive_story_events":true,"send_dm":true,"human_handoff":true}'::jsonb,
  '{"activation":"requires_meta_permissions","messaging_window_hours":24}'::jsonb
from public.organizations on conflict(organization_id,channel,name) do nothing;

insert into public.integration_connectors(organization_id,name,connector_type,provider,status,auth_type,scopes,settings)
select id,'Instagram Messaging API','social_messaging','meta','pending','oauth',
  array['instagram_manage_messages','instagram_manage_comments'],
  '{"activation":"manual_after_meta_approval","credentials":"supabase_vault"}'::jsonb
from public.organizations on conflict(organization_id,name) do nothing;

comment on table public.social_automation_executions is 'Execuções auditáveis de fluxos sociais, com janela de mensagem, consentimento e transferência humana.';
comment on function public.set_instagram_automation_status(uuid,text) is 'Impede ativação de automação enquanto a conta oficial do Instagram não estiver conectada.';
