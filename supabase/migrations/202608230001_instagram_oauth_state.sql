-- Estado OAuth de uso único para preservar identidade e tenant entre redirecionamentos.
begin;
create table if not exists public.instagram_oauth_states(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now()+interval '10 minutes',
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.instagram_oauth_states enable row level security;
create policy instagram_oauth_state_read on public.instagram_oauth_states for select to authenticated
 using(organization_id=public.current_organization_id() and requested_by=auth.uid());
create or replace function public.create_instagram_oauth_state() returns uuid language plpgsql security definer set search_path=public as $$
declare state_id uuid;
begin
 if auth.uid() is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
 delete from public.instagram_oauth_states where expires_at<now() or consumed_at is not null;
 insert into public.instagram_oauth_states(organization_id,requested_by) values(public.current_organization_id(),auth.uid()) returning id into state_id;
 return state_id;
end; $$;
revoke all on function public.create_instagram_oauth_state() from public,anon;
grant execute on function public.create_instagram_oauth_state() to authenticated;
commit;
