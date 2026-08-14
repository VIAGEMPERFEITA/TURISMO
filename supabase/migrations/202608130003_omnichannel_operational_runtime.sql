-- Camada operacional compartilhada para Instagram, Messenger, site e WhatsApp.

create table if not exists public.channel_account_external_ids (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_account_id uuid not null references public.channel_accounts(id) on delete cascade,
  external_id text not null,
  id_kind text not null default 'alias',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(channel_account_id,external_id)
);
create index if not exists channel_account_external_ids_lookup_idx
  on public.channel_account_external_ids(external_id,channel_account_id);
alter table public.channel_account_external_ids enable row level security;
drop policy if exists channel_account_external_ids_tenant_read on public.channel_account_external_ids;
create policy channel_account_external_ids_tenant_read on public.channel_account_external_ids for select to authenticated
  using(organization_id=public.current_organization_id());
drop policy if exists channel_account_external_ids_tenant_write on public.channel_account_external_ids;
create policy channel_account_external_ids_tenant_write on public.channel_account_external_ids for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

create unique index if not exists conversations_facebook_thread_idx
  on public.conversations(organization_id,channel_account_id,external_thread_id)
  where channel='facebook' and external_thread_id is not null;

create table if not exists public.messenger_outbound_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_account_id uuid not null references public.channel_accounts(id) on delete restrict,
  execution_id uuid references public.social_automation_executions(id) on delete set null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  recipient_id text not null,
  payload jsonb not null,
  idempotency_key text not null,
  status text not null default 'pendente' check(status in ('pendente','processando','enviado','entregue','lido','falhou','cancelado')),
  attempts integer not null default 0 check(attempts between 0 and 10),
  scheduled_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  next_attempt_at timestamptz,
  external_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
create index if not exists messenger_outbound_queue_idx on public.messenger_outbound_messages(status,scheduled_at,next_attempt_at)
  where status in ('pendente','falhou');
alter table public.messenger_outbound_messages enable row level security;
drop policy if exists messenger_outbound_tenant_read on public.messenger_outbound_messages;
create policy messenger_outbound_tenant_read on public.messenger_outbound_messages for select to authenticated
  using(organization_id=public.current_organization_id());
drop policy if exists messenger_outbound_tenant_write on public.messenger_outbound_messages;
create policy messenger_outbound_tenant_write on public.messenger_outbound_messages for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

create table if not exists public.omnichannel_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_channel text not null check(source_channel in ('instagram','facebook','site')),
  source_conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  destination_channel text not null default 'whatsapp' check(destination_channel='whatsapp'),
  destination_phone text,
  consent_confirmed boolean not null default false,
  status text not null default 'aguardando_dados' check(status in ('aguardando_dados','aguardando_consentimento','aguardando_template','enfileirado','enviado','falhou','cancelado')),
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists omnichannel_handoffs_queue_idx on public.omnichannel_handoffs(organization_id,status,created_at desc);
alter table public.omnichannel_handoffs enable row level security;
drop policy if exists omnichannel_handoffs_tenant_read on public.omnichannel_handoffs;
create policy omnichannel_handoffs_tenant_read on public.omnichannel_handoffs for select to authenticated
  using(organization_id=public.current_organization_id());
drop policy if exists omnichannel_handoffs_tenant_write on public.omnichannel_handoffs;
create policy omnichannel_handoffs_tenant_write on public.omnichannel_handoffs for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

create or replace function public.store_facebook_access_token(target_secret_name text,target_access_token text)
returns void language plpgsql security definer set search_path=public,vault as $$
declare existing_id uuid;
begin
  if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'forbidden'; end if;
  if nullif(trim(target_secret_name),'') is null or nullif(trim(target_access_token),'') is null then raise exception 'invalid_secret'; end if;
  select id into existing_id from vault.secrets where name=target_secret_name limit 1;
  if existing_id is null then
    perform vault.create_secret(target_access_token,target_secret_name,'Facebook Messenger — token operacional');
  else
    perform vault.update_secret(existing_id,target_access_token,target_secret_name,'Facebook Messenger — token operacional');
  end if;
end;
$$;
revoke all on function public.store_facebook_access_token(text,text) from public,anon,authenticated;
grant execute on function public.store_facebook_access_token(text,text) to service_role;

create or replace function public.get_facebook_access_token(target_secret_name text)
returns text language plpgsql security definer set search_path=public,vault as $$
declare result text;
begin
  if current_setting('request.jwt.claim.role',true)<>'service_role' then raise exception 'forbidden'; end if;
  select decrypted_secret into result from vault.decrypted_secrets where name=target_secret_name limit 1;
  return result;
end;
$$;
revoke all on function public.get_facebook_access_token(text) from public,anon,authenticated;
grant execute on function public.get_facebook_access_token(text) to service_role;

comment on table public.channel_account_external_ids is 'Aliases de IDs entregues pela Meta (Page, IG account, WABA) para resolução robusta de webhooks.';
comment on table public.messenger_outbound_messages is 'Fila idempotente de respostas do Facebook Messenger.';
comment on table public.omnichannel_handoffs is 'Auditoria de encaminhamentos consentidos de canais digitais para WhatsApp.';
