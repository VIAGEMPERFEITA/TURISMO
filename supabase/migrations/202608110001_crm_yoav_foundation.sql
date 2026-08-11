-- CRM YOAV: fundação omnichannel, pipeline governado, automações versionadas e integrações permitidas.
-- Esta migration amplia as entidades existentes e preserva os fluxos em produção.

alter table public.organizations add column if not exists crm_product_name text not null default 'CRM YOAV';
alter table public.organizations add column if not exists timezone text not null default 'America/Sao_Paulo';

create table if not exists public.channel_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check(channel in ('whatsapp','instagram','messenger','site_chat','email')),
  name text not null,
  provider text not null,
  external_account_id text,
  status text not null default 'sandbox' check(status in ('sandbox','pending','connected','degraded','disabled')),
  credential_secret_name text,
  webhook_secret_name text,
  scopes text[] not null default '{}',
  capabilities jsonb not null default '{}',
  settings jsonb not null default '{}',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,channel,name)
);

create table if not exists public.contact_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  channel_account_id uuid references public.channel_accounts(id) on delete set null,
  identity_type text not null check(identity_type in ('phone','email','whatsapp','instagram','facebook','site_session','external')),
  external_id text not null,
  normalized_value text,
  display_name text,
  verified_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(lead_id is not null or customer_id is not null),
  unique(organization_id,identity_type,external_id)
);

alter table public.conversations add column if not exists channel_account_id uuid references public.channel_accounts(id) on delete set null;
alter table public.conversations add column if not exists inbox_queue_id uuid references public.inbox_queues(id) on delete set null;
alter table public.conversations add column if not exists first_response_at timestamptz;
alter table public.conversations add column if not exists resolution_due_at timestamptz;
alter table public.conversations add column if not exists ai_confidence numeric(5,4) check(ai_confidence between 0 and 1);
alter table public.conversations add column if not exists handoff_reason text;
alter table public.conversations add column if not exists csat_score integer check(csat_score between 1 and 5);
alter table public.conversations add column if not exists typing_profile_id uuid references public.profiles(id) on delete set null;
alter table public.conversations add column if not exists typing_expires_at timestamptz;

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  contact_identity_id uuid references public.contact_identities(id) on delete set null,
  participant_type text not null check(participant_type in ('contact','agent','ai','observer')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  check(profile_id is not null or contact_identity_id is not null or participant_type='ai')
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  kind text not null check(kind in ('image','video','audio','document','location','contact')),
  storage_path text,
  external_url text,
  mime_type text,
  file_name text,
  byte_size bigint check(byte_size is null or byte_size>=0),
  sha256 text,
  scan_status text not null default 'pending' check(scan_status in ('pending','clean','blocked','failed')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  mentioned_profile_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(conversation_id is not null or lead_id is not null)
);

alter table public.leads add column if not exists instagram_follower_status text not null default 'unknown';
alter table public.leads drop constraint if exists leads_instagram_follower_status_check;
alter table public.leads add constraint leads_instagram_follower_status_check check(instagram_follower_status in ('unknown','self_reported','verified_by_supported_event','not_follower','not_applicable'));
alter table public.leads add column if not exists qualification_data jsonb not null default '{}';
alter table public.leads add column if not exists qualification_score numeric(6,2) not null default 0;
alter table public.leads add column if not exists score_updated_at timestamptz;

create table if not exists public.lead_score_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  reason_code text not null,
  label text not null,
  points numeric(6,2) not null,
  evidence jsonb not null default '{}',
  source text not null default 'rule',
  created_at timestamptz not null default now()
);

create table if not exists public.stage_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  requirement_type text not null check(requirement_type in ('lead_field','completed_task','document_status','payment_status','approval','evidence')),
  field_name text,
  operator text not null default 'present',
  expected_value jsonb,
  label text not null,
  mandatory boolean not null default true,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transition_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage_id uuid references public.pipeline_stages(id) on delete set null,
  to_stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null check(status in ('allowed','blocked','overridden','failed')),
  unmet_requirements jsonb not null default '[]',
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.transition_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transition_attempt_id uuid not null references public.transition_attempts(id) on delete cascade,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check(length(trim(reason))>=10),
  created_at timestamptz not null default now()
);

create table if not exists public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check(status in ('draft','active','paused','archived')),
  trigger_type text not null,
  active_version integer,
  frequency_limit jsonb not null default '{}',
  quiet_hours jsonb not null default '{}',
  consent_required boolean not null default true,
  emergency_stopped_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);

create table if not exists public.automation_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  flow_id uuid not null references public.automation_flows(id) on delete cascade,
  version integer not null,
  definition jsonb not null,
  status text not null default 'draft' check(status in ('draft','approved','retired')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(flow_id,version)
);

create table if not exists public.integration_connectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  connector_type text not null,
  provider text not null,
  status text not null default 'sandbox' check(status in ('sandbox','pending','connected','degraded','disabled')),
  auth_type text not null default 'oauth',
  credential_secret_name text,
  scopes text[] not null default '{}',
  settings jsonb not null default '{}',
  last_sync_at timestamptz,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);

create table if not exists public.integration_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid not null references public.integration_connectors(id) on delete cascade,
  action_key text not null,
  name text not null,
  operation text not null check(operation in ('read','write')),
  input_schema jsonb not null default '{}',
  output_schema jsonb not null default '{}',
  requires_approval boolean not null default true,
  allowed_for_ai boolean not null default false,
  rate_limit jsonb not null default '{}',
  active boolean not null default true,
  unique(connector_id,action_key)
);

create table if not exists public.integration_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_id uuid not null references public.integration_connectors(id) on delete restrict,
  action_id uuid not null references public.integration_actions(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  automation_run_id uuid references public.automation_runs(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  correlation_id uuid not null default gen_random_uuid(),
  status text not null default 'pending' check(status in ('pending','approved','running','succeeded','failed','retrying','cancelled')),
  request_redacted jsonb not null default '{}',
  response_redacted jsonb not null default '{}',
  attempts integer not null default 0,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check(provider in ('openai','anthropic','mock')),
  name text not null,
  status text not null default 'sandbox' check(status in ('sandbox','active','degraded','disabled')),
  credential_secret_name text,
  default_model text,
  timeout_ms integer not null default 30000 check(timeout_ms between 1000 and 120000),
  max_retries integer not null default 2 check(max_retries between 0 and 5),
  circuit_breaker jsonb not null default '{}',
  data_policy jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);

create table if not exists public.ai_task_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_key text not null,
  primary_provider_id uuid references public.ai_providers(id) on delete set null,
  fallback_provider_id uuid references public.ai_providers(id) on delete set null,
  model text,
  max_tokens integer not null default 1200,
  max_cost_usd numeric(10,4),
  redact_personal_data boolean not null default true,
  critical_review_required boolean not null default false,
  active boolean not null default true,
  unique(organization_id,task_key)
);

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  source_type text not null,
  source_url text,
  owner_id uuid references public.profiles(id) on delete set null,
  confidentiality text not null default 'internal' check(confidentiality in ('public','internal','restricted')),
  status text not null default 'draft' check(status in ('draft','approved','expired','archived')),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  version integer not null,
  title text not null,
  content text not null,
  allowed_channels text[] not null default '{}',
  related_product_ids uuid[] not null default '{}',
  checksum text,
  status text not null default 'draft' check(status in ('draft','approved','rejected','retired')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(source_id,version)
);

create table if not exists public.instagram_contents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_account_id uuid references public.channel_accounts(id) on delete set null,
  content_type text not null check(content_type in ('reel','post','story','carousel')),
  title text not null,
  brief text,
  hook text,
  script text,
  caption text,
  cta text,
  keywords text[] not null default '{}',
  checklist jsonb not null default '{}',
  status text not null default 'idea' check(status in ('idea','draft','review','approved','scheduled','published','rejected')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  scheduled_at timestamptz,
  published_at timestamptz,
  external_media_id text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_account_id uuid references public.channel_accounts(id) on delete set null,
  event_type text not null,
  external_event_id text not null,
  contact_identity_id uuid references public.contact_identities(id) on delete set null,
  content_id uuid references public.instagram_contents(id) on delete set null,
  payload_redacted jsonb not null default '{}',
  follower_evidence_supported boolean not null default false,
  received_at timestamptz not null default now(),
  unique(organization_id,event_type,external_event_id)
);

create table if not exists public.improvement_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  evidence jsonb not null default '{}',
  expected_impact text,
  risk_level text not null default 'medium' check(risk_level in ('low','medium','high','critical')),
  status text not null default 'suggested' check(status in ('suggested','review','approved','testing','canary','deployed','rejected','rolled_back')),
  proposed_by text not null default 'system',
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Estados de webhook com retentativa e dead-letter, mantendo compatibilidade.
alter table public.webhook_events drop constraint if exists webhook_events_status_check;
alter table public.webhook_events add constraint webhook_events_status_check check(status in ('recebido','processando','processado','falhou','retry_scheduled','dead_letter','ignorado'));
alter table public.webhook_events add column if not exists next_attempt_at timestamptz;
alter table public.webhook_events add column if not exists correlation_id uuid not null default gen_random_uuid();
alter table public.webhook_events add column if not exists signature_valid boolean;

create index if not exists channel_accounts_org_idx on public.channel_accounts(organization_id,channel,status);
create index if not exists contact_identities_contact_idx on public.contact_identities(organization_id,lead_id,customer_id);
create index if not exists conversation_participants_conversation_idx on public.conversation_participants(conversation_id,left_at);
create index if not exists message_attachments_message_idx on public.message_attachments(message_id);
create index if not exists stage_requirements_stage_idx on public.stage_requirements(stage_id,active,position);
create index if not exists transition_attempts_lead_idx on public.transition_attempts(lead_id,created_at desc);
create index if not exists automation_versions_flow_idx on public.automation_versions(flow_id,version desc);
create index if not exists integration_runs_queue_idx on public.integration_runs(organization_id,status,created_at);
create index if not exists social_events_contact_idx on public.social_events(organization_id,contact_identity_id,received_at desc);
create index if not exists webhook_events_retry_idx on public.webhook_events(status,next_attempt_at) where status in ('falhou','retry_scheduled');

create or replace function public.transition_lead_stage(
  target_lead_id uuid,
  target_stage_id uuid,
  override_reason text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  lead_row public.leads%rowtype;
  stage_row public.pipeline_stages%rowtype;
  unmet jsonb := '[]'::jsonb;
  requirement record;
  attempt_id uuid;
  override_allowed boolean := false;
begin
  if not public.has_role('administrador','gestor','consultor','atendimento') then raise exception 'forbidden'; end if;
  select * into lead_row from public.leads where id=target_lead_id and organization_id=public.current_organization_id() and deleted_at is null for update;
  if not found then raise exception 'lead_not_found'; end if;
  if not public.can_access_lead(target_lead_id) then raise exception 'forbidden'; end if;
  select ps.* into stage_row from public.pipeline_stages ps join public.pipelines p on p.id=ps.pipeline_id where ps.id=target_stage_id and p.organization_id=lead_row.organization_id and ps.active=true;
  if not found then raise exception 'stage_not_found'; end if;

  for requirement in select * from public.stage_requirements where stage_id=target_stage_id and active=true and mandatory=true order by position loop
    if requirement.requirement_type='lead_field' and (
      requirement.field_name is null or
      nullif(trim(coalesce(to_jsonb(lead_row)->>requirement.field_name,'')),'') is null
    ) then unmet=unmet||jsonb_build_array(jsonb_build_object('id',requirement.id,'label',requirement.label));
    elsif requirement.requirement_type='completed_task' and not exists(
      select 1 from public.tasks t where t.lead_id=target_lead_id and t.status='concluida' and (requirement.field_name is null or t.title=requirement.field_name)
    ) then unmet=unmet||jsonb_build_array(jsonb_build_object('id',requirement.id,'label',requirement.label));
    elsif requirement.requirement_type='approval' and not exists(
      select 1 from public.approval_requests a where a.lead_id=target_lead_id and a.status='aprovado'
    ) then unmet=unmet||jsonb_build_array(jsonb_build_object('id',requirement.id,'label',requirement.label));
    end if;
  end loop;

  override_allowed := jsonb_array_length(unmet)>0 and public.has_role('administrador','gestor') and length(trim(coalesce(override_reason,'')))>=10;
  insert into public.transition_attempts(organization_id,lead_id,from_stage_id,to_stage_id,requested_by,status,unmet_requirements,reason)
  values(lead_row.organization_id,target_lead_id,lead_row.pipeline_stage_id,target_stage_id,auth.uid(),case when jsonb_array_length(unmet)=0 then 'allowed' when override_allowed then 'overridden' else 'blocked' end,unmet,override_reason)
  returning id into attempt_id;

  if jsonb_array_length(unmet)>0 and not override_allowed then
    return jsonb_build_object('ok',false,'attempt_id',attempt_id,'unmet_requirements',unmet);
  end if;
  if override_allowed then
    insert into public.transition_overrides(organization_id,transition_attempt_id,approved_by,reason) values(lead_row.organization_id,attempt_id,auth.uid(),trim(override_reason));
  end if;

  update public.leads set pipeline_id=stage_row.pipeline_id,pipeline_stage_id=stage_row.id,
    status=case stage_row.code
      when 'novo_lead' then 'novo_lead'::public.lead_status
      when 'primeiro_contato' then 'primeiro_contato'::public.lead_status
      when 'qualificacao' then 'em_atendimento'::public.lead_status
      when 'proposta' then 'proposta_enviada'::public.lead_status
      when 'negociacao' then 'negociacao'::public.lead_status
      when 'pagamento' then 'aguardando_pagamento'::public.lead_status
      when 'reserva' then 'reserva_iniciada'::public.lead_status
      when 'ganho' then 'reserva_confirmada'::public.lead_status
      when 'convertido' then 'reserva_confirmada'::public.lead_status
      when 'perdido' then 'perdido'::public.lead_status
      else status end,
    updated_at=now() where id=target_lead_id;
  insert into public.lead_activities(lead_id,user_id,activity_type,title,metadata)
  values(target_lead_id,auth.uid(),'pipeline_transition','Etapa alterada com validação',jsonb_build_object('attempt_id',attempt_id,'from_stage_id',lead_row.pipeline_stage_id,'to_stage_id',target_stage_id,'overridden',override_allowed));
  return jsonb_build_object('ok',true,'attempt_id',attempt_id,'overridden',override_allowed,'unmet_requirements',unmet);
end $$;

-- Requisitos iniciais conservadores: melhoram a qualidade sem bloquear contratos,
-- pagamentos ou integrações já existentes. Regras mais rígidas ficam para ativação do gestor.
insert into public.stage_requirements(organization_id,stage_id,requirement_type,field_name,label,position)
select p.organization_id,s.id,'lead_field','name','Nome do contato preenchido',0
from public.pipeline_stages s join public.pipelines p on p.id=s.pipeline_id
where s.code in('qualificacao','proposta','reserva','convertido')
and not exists(select 1 from public.stage_requirements r where r.stage_id=s.id and r.requirement_type='lead_field' and r.field_name='name');

insert into public.stage_requirements(organization_id,stage_id,requirement_type,field_name,label,position)
select p.organization_id,s.id,'lead_field','phone','Telefone do contato preenchido',1
from public.pipeline_stages s join public.pipelines p on p.id=s.pipeline_id
where s.code in('qualificacao','proposta','reserva','convertido')
and not exists(select 1 from public.stage_requirements r where r.stage_id=s.id and r.requirement_type='lead_field' and r.field_name='phone');

insert into public.stage_requirements(organization_id,stage_id,requirement_type,field_name,label,position)
select p.organization_id,s.id,'lead_field','email','E-mail do contato preenchido',2
from public.pipeline_stages s join public.pipelines p on p.id=s.pipeline_id
where s.code in('proposta','reserva','convertido')
and not exists(select 1 from public.stage_requirements r where r.stage_id=s.id and r.requirement_type='lead_field' and r.field_name='email');

revoke all on function public.transition_lead_stage(uuid,uuid,text) from public,anon;
grant execute on function public.transition_lead_stage(uuid,uuid,text) to authenticated;

-- RLS uniforme nas novas entidades. Escrita é restrita a usuários autenticados da organização.
do $$
declare t text;
begin
  foreach t in array array[
    'channel_accounts','contact_identities','conversation_participants','message_attachments','internal_notes',
    'lead_score_reasons','stage_requirements','transition_attempts','transition_overrides','automation_flows',
    'automation_versions','integration_connectors','integration_actions','integration_runs','ai_providers',
    'ai_task_policies','knowledge_sources','knowledge_versions','instagram_contents','social_events','improvement_suggestions'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t||'_tenant_read',t);
    execute format('drop policy if exists %I on public.%I',t||'_tenant_write',t);
    execute format('create policy %I on public.%I for select to authenticated using (organization_id=public.current_organization_id())',t||'_tenant_read',t);
    execute format('create policy %I on public.%I for all to authenticated using (organization_id=public.current_organization_id() and public.current_role() is not null and public.current_role()<>''visualizador''::public.user_role) with check (organization_id=public.current_organization_id() and public.current_role() is not null and public.current_role()<>''visualizador''::public.user_role)',t||'_tenant_write',t);
  end loop;
end $$;

-- Configurações, conectores, políticas de IA e automações só podem ser alterados por gestão.
do $$
declare t text;
begin
  foreach t in array array['channel_accounts','stage_requirements','automation_flows','automation_versions','integration_connectors','integration_actions','ai_providers','ai_task_policies','knowledge_sources','knowledge_versions','improvement_suggestions'] loop
    execute format('drop policy if exists %I on public.%I',t||'_tenant_write',t);
    execute format('create policy %I on public.%I for all to authenticated using (organization_id=public.current_organization_id() and public.can_manage_all()) with check (organization_id=public.current_organization_id() and public.can_manage_all())',t||'_tenant_write',t);
  end loop;
end $$;

-- Configuração inicial em sandbox: nenhuma integração externa é ativada automaticamente.
insert into public.channel_accounts(organization_id,channel,name,provider,status,capabilities)
select id,'site_chat','Chat do site','internal','sandbox','{"receive":true,"send":true,"handoff":true}'::jsonb from public.organizations
on conflict(organization_id,channel,name) do nothing;

insert into public.ai_providers(organization_id,provider,name,status,default_model,data_policy)
select id,'mock','Simulador seguro','sandbox','deterministic-simulator','{"personal_data":"redact","training":false}'::jsonb from public.organizations
on conflict(organization_id,name) do nothing;

comment on function public.transition_lead_stage(uuid,uuid,text) is 'Transição transacional do pipeline com requisitos obrigatórios e override auditado de gestor.';
comment on table public.integration_actions is 'Catálogo permitido de ações externas. A IA nunca executa ações fora deste catálogo.';
comment on column public.leads.instagram_follower_status is 'Nunca inferir seguidor; verified_by_supported_event exige evidência de API/evento oficial.';
