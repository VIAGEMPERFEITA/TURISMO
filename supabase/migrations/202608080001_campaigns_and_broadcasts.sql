-- Campanhas e Disparos: consentimento, segmentação, fila, eventos e auditoria.
-- A migração é aditiva. Segredos permanecem exclusivamente em Edge Function Secrets.
begin;

create table if not exists public.contact_consents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade, customer_id uuid references public.customers(id) on delete cascade,
  phone_e164 text not null check(phone_e164 ~ '^[1-9][0-9]{9,14}$'), channel text not null default 'whatsapp' check(channel='whatsapp'),
  purpose text not null default 'marketing', granted boolean not null default false, source text not null,
  granted_at timestamptz, revoked_at timestamptz, revocation_reason text, recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(lead_id is not null or customer_id is not null), unique(organization_id,phone_e164,channel,purpose)
);
create table if not exists public.contact_suppressions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  phone_e164 text not null check(phone_e164 ~ '^[1-9][0-9]{9,14}$'), channel text not null default 'whatsapp' check(channel='whatsapp'),
  scope text not null default 'marketing' check(scope in ('marketing','todos')), reason text not null, source text not null,
  contact_consent_id uuid references public.contact_consents(id) on delete set null, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), released_at timestamptz, released_by uuid references public.profiles(id) on delete set null,
  unique(organization_id,phone_e164,channel,scope)
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null, name text not null, category text not null,
  language_code text not null default 'pt_BR', content text not null, header jsonb, footer text, buttons jsonb not null default '[]',
  variables text[] not null default '{}', status text not null default 'rascunho' check(status in ('rascunho','enviado_aprovacao','aprovado','rejeitado')),
  meta_template_id text, version integer not null default 1, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_synced_at timestamptz,
  unique(organization_id,name,language_code,version)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, description text, channel text not null default 'whatsapp' check(channel='whatsapp'), category text not null,
  status text not null default 'rascunho' check(status in ('rascunho','aguardando_aprovacao','agendada','em_andamento','pausada','concluida','cancelada','falhou')),
  template_id uuid references public.message_templates(id) on delete set null, message_snapshot jsonb not null default '{}',
  audience_snapshot jsonb not null default '{}', timezone text not null default 'America/Sao_Paulo', batch_size integer not null default 50 check(batch_size between 1 and 1000),
  interval_seconds integer not null default 1 check(interval_seconds between 0 and 3600), error_pause_threshold numeric(5,2) not null default 10 check(error_pause_threshold between 0 and 100),
  simulation_mode boolean not null default true, scheduled_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict, responsible_id uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz, paused_at timestamptz, cancelled_at timestamptz,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists campaigns_no_duplicate_active_name on public.campaigns(organization_id,lower(name)) where status not in ('concluida','cancelada','falhou');

create table if not exists public.campaign_audiences (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
  audience_type text not null, filters jsonb not null default '{}', total_found integer not null default 0, eligible_count integer not null default 0,
  without_consent_count integer not null default 0, invalid_phone_count integer not null default 0, suppressed_count integer not null default 0,
  duplicate_count integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade, lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null, traveler_id uuid references public.reservation_travelers(id) on delete set null,
  phone_e164 text not null check(phone_e164 ~ '^[1-9][0-9]{9,14}$'), display_name text, variables jsonb not null default '{}',
  eligibility_reason text, status text not null default 'pendente' check(status in ('pendente','agendada','na_fila','processando','enviada','entregue','lida','respondida','falhou','cancelada','bloqueada','descadastrada')),
  idempotency_key text not null, attempts integer not null default 0 check(attempts between 0 and 10), scheduled_at timestamptz,
  next_attempt_at timestamptz, provider_message_id text, last_error_code text, last_error_message text,
  sent_at timestamptz, delivered_at timestamptz, read_at timestamptz, replied_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(campaign_id,phone_e164), unique(organization_id,idempotency_key)
);
create index if not exists campaign_recipient_queue_idx on public.campaign_recipients(status,scheduled_at,next_attempt_at) where status in ('pendente','agendada','na_fila','falhou');

create table if not exists public.campaign_messages (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
  recipient_id uuid not null references public.campaign_recipients(id) on delete cascade, template_id uuid references public.message_templates(id) on delete set null,
  rendered_content text not null, media jsonb, payload_snapshot jsonb not null default '{}', provider_message_id text,
  simulation boolean not null default true, created_at timestamptz not null default now(), unique(recipient_id)
);
create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade, recipient_id uuid references public.campaign_recipients(id) on delete cascade,
  message_id uuid references public.campaign_messages(id) on delete cascade, provider_event_id text, event_type text not null,
  provider_timestamp timestamptz, payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create unique index if not exists message_events_provider_uidx on public.message_events(organization_id,provider_event_id) where provider_event_id is not null;

create table if not exists public.campaign_audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade, actor_id uuid references public.profiles(id) on delete set null,
  action text not null, previous_data jsonb, current_data jsonb, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'whatsapp_cloud_api', enabled boolean not null default false, simulation_mode boolean not null default true,
  api_version text not null default 'v25.0', credentials_configured boolean not null default false,
  secret_names jsonb not null default '{"access_token":"META_WHATSAPP_ACCESS_TOKEN","app_secret":"META_WHATSAPP_APP_SECRET","verify_token":"META_WHATSAPP_VERIFY_TOKEN"}',
  settings jsonb not null default '{}', updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,provider)
);
insert into public.integration_settings(organization_id) select id from public.organizations where slug='viagem-perfeita' on conflict(organization_id,provider) do nothing;

alter table public.contact_consents enable row level security; alter table public.contact_suppressions enable row level security;
alter table public.message_templates enable row level security; alter table public.campaigns enable row level security;
alter table public.campaign_audiences enable row level security; alter table public.campaign_recipients enable row level security;
alter table public.campaign_messages enable row level security; alter table public.message_events enable row level security;
alter table public.campaign_audit_logs enable row level security; alter table public.integration_settings enable row level security;

create policy campaign_staff_consents_read on public.contact_consents for select to authenticated using(organization_id=public.current_organization_id());
create policy campaign_staff_consents_write on public.contact_consents for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor')) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy campaign_staff_suppressions_read on public.contact_suppressions for select to authenticated using(organization_id=public.current_organization_id());
create policy campaign_managers_suppressions_write on public.contact_suppressions for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));
create policy campaign_templates_read on public.message_templates for select to authenticated using(organization_id=public.current_organization_id());
create policy campaign_templates_write on public.message_templates for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor')) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy campaigns_read on public.campaigns for select to authenticated using(organization_id=public.current_organization_id());
create policy campaigns_create on public.campaigns for insert to authenticated with check(organization_id=public.current_organization_id() and created_by=auth.uid() and public.has_role('administrador','gestor','consultor'));
create policy campaigns_update on public.campaigns for update to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));
create policy campaign_audiences_access on public.campaign_audiences for all to authenticated using(exists(select 1 from public.campaigns c where c.id=campaign_id and c.organization_id=public.current_organization_id())) with check(exists(select 1 from public.campaigns c where c.id=campaign_id and c.organization_id=public.current_organization_id()));
create policy campaign_recipients_read on public.campaign_recipients for select to authenticated using(organization_id=public.current_organization_id());
create policy campaign_recipients_managers on public.campaign_recipients for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));
create policy campaign_messages_read on public.campaign_messages for select to authenticated using(exists(select 1 from public.campaigns c where c.id=campaign_id and c.organization_id=public.current_organization_id()));
create policy message_events_read on public.message_events for select to authenticated using(organization_id=public.current_organization_id());
create policy campaign_audit_read on public.campaign_audit_logs for select to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));
create policy integration_settings_admin on public.integration_settings for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador')) with check(organization_id=public.current_organization_id() and public.has_role('administrador'));

create or replace function public.campaign_metrics() returns table(total bigint,drafts bigint,scheduled bigint,running bigint,completed bigint,sent bigint,delivered bigint,read_count bigint,replied bigint,failed bigint,opted_out bigint)
language sql stable security definer set search_path=public as $$
 select count(*)::bigint,count(*) filter(where status='rascunho')::bigint,count(*) filter(where status='agendada')::bigint,
 count(*) filter(where status='em_andamento')::bigint,count(*) filter(where status='concluida')::bigint,
 coalesce((select count(*) from campaign_recipients r where r.organization_id=current_organization_id() and r.status in ('enviada','entregue','lida','respondida')),0)::bigint,
 coalesce((select count(*) from campaign_recipients r where r.organization_id=current_organization_id() and r.status in ('entregue','lida','respondida')),0)::bigint,
 coalesce((select count(*) from campaign_recipients r where r.organization_id=current_organization_id() and r.status in ('lida','respondida')),0)::bigint,
 coalesce((select count(*) from campaign_recipients r where r.organization_id=current_organization_id() and r.status='respondida'),0)::bigint,
 coalesce((select count(*) from campaign_recipients r where r.organization_id=current_organization_id() and r.status='falhou'),0)::bigint,
 coalesce((select count(*) from contact_suppressions s where s.organization_id=current_organization_id() and s.released_at is null),0)::bigint
 from campaigns c where c.organization_id=current_organization_id();
$$;
revoke all on function public.campaign_metrics() from public,anon; grant execute on function public.campaign_metrics() to authenticated;

commit;
