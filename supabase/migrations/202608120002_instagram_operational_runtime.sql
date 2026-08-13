-- Runtime operacional do Instagram: caixa compartilhada, IA, fila de saída e auditoria.

alter table public.social_automation_executions add column if not exists channel_account_id uuid references public.channel_accounts(id) on delete set null;
alter table public.social_automation_executions add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
alter table public.social_automation_executions add column if not exists source_message_id uuid references public.messages(id) on delete set null;
create unique index if not exists social_automation_execution_source_idx
  on public.social_automation_executions(source_message_id) where source_message_id is not null;

create unique index if not exists conversations_instagram_thread_idx
  on public.conversations(organization_id,channel_account_id,external_thread_id)
  where channel='instagram' and external_thread_id is not null;

create table if not exists public.instagram_outbound_messages (
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
create index if not exists instagram_outbound_queue_idx on public.instagram_outbound_messages(status,scheduled_at,next_attempt_at)
  where status in ('pendente','falhou');

alter table public.instagram_outbound_messages enable row level security;
drop policy if exists instagram_outbound_tenant_read on public.instagram_outbound_messages;
create policy instagram_outbound_tenant_read on public.instagram_outbound_messages for select to authenticated
  using(organization_id=public.current_organization_id());
drop policy if exists instagram_outbound_tenant_write on public.instagram_outbound_messages;
create policy instagram_outbound_tenant_write on public.instagram_outbound_messages for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

update public.integration_connectors
set scopes=array['instagram_business_basic','instagram_business_manage_messages','instagram_business_manage_comments','instagram_business_content_publish'],
    settings=settings||'{"messaging_window_hours":24,"human_handoff":true,"automatic_replies":true}'::jsonb,
    updated_at=now()
where provider='meta' and connector_type='social_messaging';

comment on table public.instagram_outbound_messages is 'Fila idempotente de respostas do Instagram Direct enviadas pela API oficial da Meta.';
