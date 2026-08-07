begin;

alter table public.ai_configurations add column if not exists provider_ready boolean not null default false;
alter table public.ai_configurations add column if not exists provider_verified_at timestamptz;

create or replace function public.public_ai_status() returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'enabled', enabled and provider_ready and mode <> 'desativado',
    'presentation_message', presentation_message
  )
  from public.ai_configurations
  where organization_id = public.default_organization_id()
  limit 1
$$;
revoke all on function public.public_ai_status() from public;
grant execute on function public.public_ai_status() to anon, authenticated, service_role;

update public.ai_configurations
set enabled = false,
    provider_ready = false,
    provider_verified_at = null,
    updated_at = now()
where organization_id = public.default_organization_id();

comment on column public.ai_configurations.provider_ready is 'Liberado apenas após chave server-side, teste de provedor, segurança e homologação funcional.';

commit;
