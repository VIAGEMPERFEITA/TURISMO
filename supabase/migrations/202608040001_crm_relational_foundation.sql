-- Fase 1: fundação relacional do CRM.
-- Esta migration preserva os registros existentes e introduz isolamento por organização.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  city text,
  state text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organizations(name,slug,legal_name,tax_id,email,phone,city,state)
values('Viagem Perfeita Turismo','viagem-perfeita','VP TURISMO E EVENTOS','28.279.846/0001-21','viagemperfeitatrip@gmail.com','5531999547699','Belo Horizonte','MG')
on conflict(slug) do update set
  name=excluded.name,
  legal_name=excluded.legal_name,
  tax_id=excluded.tax_id,
  email=excluded.email,
  phone=excluded.phone,
  city=excluded.city,
  state=excluded.state,
  updated_at=now();

create or replace function public.default_organization_id() returns uuid
language sql stable security definer set search_path=public
as $$ select id from public.organizations where slug='viagem-perfeita' limit 1 $$;

alter table public.profiles add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
update public.profiles set organization_id=public.default_organization_id() where organization_id is null;
alter table public.profiles alter column organization_id set default public.default_organization_id();
alter table public.profiles alter column organization_id set not null;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_leader boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key(team_id,profile_id)
);

-- Todas as entidades operacionais pertencem explicitamente a uma organização.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'caravans','leads','tasks','customers','reservations','tags','system_settings',
    'notifications','audit_logs','email_notifications','destinations_content',
    'experiences_content','faqs_content','articles_content','media_content',
    'testimonials_content','leaders_content','partners_content'
  ] loop
    execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete restrict',table_name);
    execute format('update public.%I set organization_id=public.default_organization_id() where organization_id is null',table_name);
    execute format('alter table public.%I alter column organization_id set default public.default_organization_id()',table_name);
    execute format('alter table public.%I alter column organization_id set not null',table_name);
  end loop;
end $$;

-- Unicidade dentro da organização, sem bloquear uma futura segunda unidade.
alter table public.caravans drop constraint if exists caravans_slug_key;
alter table public.tags drop constraint if exists tags_name_key;
alter table public.system_settings drop constraint if exists system_settings_key_key;
alter table public.destinations_content drop constraint if exists destinations_content_slug_key;
alter table public.experiences_content drop constraint if exists experiences_content_slug_key;
alter table public.articles_content drop constraint if exists articles_content_slug_key;
create unique index if not exists caravans_org_slug_uidx on public.caravans(organization_id,slug);
create unique index if not exists tags_org_name_uidx on public.tags(organization_id,name);
create unique index if not exists settings_org_key_uidx on public.system_settings(organization_id,key);
create unique index if not exists destinations_org_slug_uidx on public.destinations_content(organization_id,slug);
create unique index if not exists experiences_org_slug_uidx on public.experiences_content(organization_id,slug);
create unique index if not exists articles_org_slug_uidx on public.articles_content(organization_id,slug);

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  entity_type text not null default 'lead' check(entity_type in('lead','reservation')),
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name,entity_type)
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  code text not null,
  position integer not null check(position>=0),
  color text not null default '#769286',
  is_won boolean not null default false,
  is_lost boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pipeline_id,code),
  unique(pipeline_id,position),
  check(not(is_won and is_lost))
);

alter table public.leads add column if not exists pipeline_id uuid references public.pipelines(id) on delete set null;
alter table public.leads add column if not exists pipeline_stage_id uuid references public.pipeline_stages(id) on delete set null;

create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_status public.lead_status,
  to_status public.lead_status not null,
  from_stage_id uuid references public.pipeline_stages(id) on delete set null,
  to_stage_id uuid references public.pipeline_stages(id) on delete set null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  is_primary boolean not null default false,
  check(unassigned_at is null or unassigned_at>=assigned_at)
);
create unique index if not exists lead_assignments_one_active_profile_idx on public.lead_assignments(lead_id,profile_id) where unassigned_at is null;
create unique index if not exists lead_assignments_one_primary_idx on public.lead_assignments(lead_id) where unassigned_at is null and is_primary=true;

create table if not exists public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  channel_type text not null check(channel_type in('whatsapp','telefone','email','instagram','facebook','outro')),
  value text not null,
  normalized_value text,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((lead_id is not null)::integer+(customer_id is not null)::integer=1)
);
create unique index if not exists contact_channels_unique_value_idx on public.contact_channels(organization_id,channel_type,normalized_value) where normalized_value is not null;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  channel text not null check(channel in('whatsapp','telefone','email','instagram','facebook','site','outro')),
  external_thread_id text,
  status text not null default 'aberta' check(status in('aberta','aguardando_cliente','aguardando_equipe','encerrada')),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(lead_id is not null or customer_id is not null),
  check(closed_at is null or closed_at>=started_at)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  direction text not null check(direction in('entrada','saida','interno')),
  message_type text not null default 'texto' check(message_type in('texto','imagem','video','audio','documento','sistema')),
  body text,
  media_path text,
  external_message_id text,
  delivery_status text check(delivery_status in('pendente','enviado','entregue','lido','falhou')),
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  transaction_type text not null check(transaction_type in('cobranca','pagamento','estorno','ajuste')),
  amount numeric(14,2) not null check(amount>=0),
  currency text not null default 'BRL',
  provider text,
  provider_reference text,
  status text not null check(status in('pendente','processando','confirmado','falhou','cancelado','estornado')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  traveler_id uuid references public.reservation_travelers(id) on delete cascade,
  document_type text not null,
  status text not null default 'pendente' check(status in('pendente','recebido','aprovado','rejeitado','dispensado')),
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  notes text
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  external_id text,
  event_type text not null,
  status text not null default 'recebido' check(status in('recebido','processando','processado','falhou','ignorado')),
  payload jsonb not null,
  attempts integer not null default 0 check(attempts>=0),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider,external_id)
);

create index if not exists profiles_org_idx on public.profiles(organization_id,active,role);
create index if not exists teams_org_idx on public.teams(organization_id,active);
create index if not exists leads_org_pipeline_idx on public.leads(organization_id,pipeline_stage_id,status,created_at desc) where deleted_at is null;
create index if not exists leads_org_assigned_idx on public.leads(organization_id,assigned_to,updated_at desc) where deleted_at is null;
create index if not exists customers_org_idx on public.customers(organization_id,status,updated_at desc);
create index if not exists reservations_org_idx on public.reservations(organization_id,status,reserved_at desc);
create index if not exists assignments_profile_idx on public.lead_assignments(profile_id,unassigned_at,assigned_at desc);
create index if not exists lead_history_idx on public.lead_status_history(lead_id,created_at desc);
create index if not exists conversations_lead_idx on public.conversations(lead_id,status,last_message_at desc);
create index if not exists conversations_assigned_idx on public.conversations(assigned_to,status,last_message_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id,sent_at);
create index if not exists reservation_history_idx on public.reservation_status_history(reservation_id,created_at desc);
create index if not exists payment_transactions_payment_idx on public.payment_transactions(payment_id,occurred_at desc);
create index if not exists document_requests_reservation_idx on public.document_requests(reservation_id,status,due_at);
create index if not exists webhook_events_queue_idx on public.webhook_events(status,received_at);
