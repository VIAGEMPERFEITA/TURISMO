begin;

create table if not exists public.ai_rate_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_hash text not null,
  window_started_at timestamptz not null default date_trunc('minute', now()),
  request_count integer not null default 1 check (request_count > 0),
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, session_hash, window_started_at)
);

alter table public.conversations add column if not exists anonymous_session_hash text;
alter table public.conversations add column if not exists ai_managed boolean not null default false;
alter table public.conversations add column if not exists consent_at timestamptz;

do $$
declare constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.conversations'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%lead_id%customer_id%'
  limit 1;
  if constraint_name is not null then
    execute format('alter table public.conversations drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.conversations drop constraint if exists conversations_identity_check;
alter table public.conversations add constraint conversations_identity_check check (
  lead_id is not null or customer_id is not null or
  (channel = 'site' and ai_managed = true and anonymous_session_hash is not null)
);

alter table public.ai_actions add column if not exists response_id text;
alter table public.ai_actions add column if not exists prompt_tokens integer;
alter table public.ai_actions add column if not exists completion_tokens integer;
alter table public.ai_actions add column if not exists safety_identifier text;

create index if not exists conversations_anonymous_session_idx
  on public.conversations (organization_id, anonymous_session_hash, updated_at desc)
  where anonymous_session_hash is not null;
create index if not exists ai_rate_limits_lookup_idx
  on public.ai_rate_limits (organization_id, session_hash, window_started_at desc);

alter table public.ai_rate_limits enable row level security;

create policy ai_rate_limits_managers_read on public.ai_rate_limits
  for select to authenticated
  using (organization_id = public.current_organization_id() and public.can_manage_all());

create or replace function public.consume_ai_rate_limit(
  target_session_hash text,
  max_requests integer default 12,
  window_minutes integer default 10
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid := public.default_organization_id();
  window_start timestamptz;
  current_count integer;
  current_block timestamptz;
begin
  if target_session_hash is null or length(target_session_hash) < 32 then
    raise exception 'invalid_session_hash';
  end if;
  max_requests := greatest(1, least(max_requests, 60));
  window_minutes := greatest(1, least(window_minutes, 60));
  window_start := to_timestamp(floor(extract(epoch from now()) / (window_minutes * 60)) * (window_minutes * 60));

  insert into public.ai_rate_limits(organization_id, session_hash, window_started_at)
  values(target_org, target_session_hash, window_start)
  on conflict(organization_id, session_hash, window_started_at)
  do update set request_count = public.ai_rate_limits.request_count + 1, updated_at = now()
  returning request_count, blocked_until into current_count, current_block;

  if current_count > max_requests then
    current_block := window_start + make_interval(mins => window_minutes);
    update public.ai_rate_limits set blocked_until = current_block, updated_at = now()
    where organization_id = target_org and session_hash = target_session_hash and window_started_at = window_start;
  end if;

  return jsonb_build_object(
    'allowed', current_count <= max_requests and coalesce(current_block <= now(), true),
    'remaining', greatest(0, max_requests - current_count),
    'reset_at', window_start + make_interval(mins => window_minutes)
  );
end
$$;

revoke all on function public.consume_ai_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_ai_rate_limit(text,integer,integer) to service_role;

create or replace function public.public_ai_status() returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'enabled', enabled and mode <> 'desativado',
    'presentation_message', presentation_message
  )
  from public.ai_configurations
  where organization_id = public.default_organization_id()
  limit 1
$$;
revoke all on function public.public_ai_status() from public;
grant execute on function public.public_ai_status() to anon, authenticated, service_role;

update public.ai_configurations
set model = coalesce(model, 'gpt-5.6-sol'),
    allowed_tools = array['search_authorized_knowledge','search_public_caravans','handoff_to_human'],
    mode = 'supervisionado',
    enabled = false,
    updated_at = now()
where organization_id = public.default_organization_id();

comment on table public.ai_rate_limits is 'Limite de requisições do assistente por identificador irreversível de sessão.';
comment on function public.consume_ai_rate_limit(text,integer,integer) is 'Controle atômico de abuso; acessível somente pela Edge Function via service_role.';

commit;
