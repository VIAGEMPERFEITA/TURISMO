-- Fase 2: autenticação, ciclo de vida de perfis e autorização por função.

alter table public.profiles
  add column if not exists last_access_at timestamptz,
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references public.profiles(id) on delete set null,
  add column if not exists deactivated_at timestamptz;

create unique index if not exists profiles_org_email_unique
  on public.profiles(organization_id,lower(email));

create or replace function public.my_crm_profile()
returns table(
  id uuid,
  organization_id uuid,
  full_name text,
  email text,
  role public.user_role,
  active boolean
)
language sql stable security definer set search_path=public
as $$
  select p.id,p.organization_id,p.full_name,p.email,p.role,p.active
  from public.profiles p
  where p.id=auth.uid() and p.active=true
$$;

revoke all on function public.my_crm_profile() from public,anon;
grant execute on function public.my_crm_profile() to authenticated;

-- Metadados enviados pelo navegador nunca podem escolher função ou organização.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,organization_id,full_name,email,role,active,invited_at)
  values(
    new.id,
    public.default_organization_id(),
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),120),
    lower(new.email),
    'visualizador'::public.user_role,
    true,
    now()
  )
  on conflict(id) do nothing;
  return new;
end $$;

-- Evita que a organização fique sem administrador ativo.
create or replace function public.protect_last_administrator() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if old.role='administrador'::public.user_role and old.active=true
     and (new.role is distinct from old.role or new.active=false) then
    if not exists(
      select 1 from public.profiles p
      where p.organization_id=old.organization_id
        and p.id<>old.id
        and p.role='administrador'::public.user_role
        and p.active=true
    ) then
      raise exception 'a organização precisa manter ao menos um administrador ativo';
    end if;
  end if;
  if new.active=false and old.active=true then new.deactivated_at=now(); end if;
  if new.active=true then new.deactivated_at=null; end if;
  return new;
end $$;

drop trigger if exists protect_last_administrator_trigger on public.profiles;
create trigger protect_last_administrator_trigger
before update of role,active on public.profiles
for each row execute function public.protect_last_administrator();

-- Somente administrador gerencia contas. O usuário pode editar apenas dados pessoais,
-- enquanto guard_profile_privileges impede elevação de privilégio.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using(organization_id=public.current_organization_id() and id=auth.uid())
with check(organization_id=public.current_organization_id() and id=auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
using(organization_id=public.current_organization_id() and public.has_role('administrador'))
with check(organization_id=public.current_organization_id() and public.has_role('administrador'));

-- Contas não são apagadas pelo CRM: são desativadas para preservar auditoria.
revoke delete on public.profiles from authenticated;

comment on type public.user_role is
'administrador: acesso total; gestor: operação e gestão; consultor: carteira atribuída; visualizador: somente leitura autorizada';
comment on function public.my_crm_profile() is
'Retorna exclusivamente o perfil ativo associado ao JWT autenticado.';
