-- SaaS multiempresa: convites seguros e provisionamento isolado de organizações.
-- Usuários sem convite continuam autenticados no Supabase, mas não recebem perfil
-- e, portanto, não conseguem acessar nenhuma organização do CRM.

begin;

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'consultor',
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email))),
  check (expires_at > created_at)
);

create unique index if not exists organization_invitations_active_email_uidx
  on public.organization_invitations(email)
  where accepted_at is null and revoked_at is null;

create index if not exists organization_invitations_email_lookup_idx
  on public.organization_invitations(email, expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.organization_invitations enable row level security;

create policy organization_invitations_read_admin
  on public.organization_invitations for select to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.has_role('administrador')
  );

create policy organization_invitations_manage_admin
  on public.organization_invitations for all to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.has_role('administrador')
  )
  with check (
    organization_id = public.current_organization_id()
    and public.has_role('administrador')
    and invited_by = auth.uid()
  );

revoke all on public.organization_invitations from public, anon;
grant select, insert, update on public.organization_invitations to authenticated;

create or replace function public.invite_organization_member(
  target_email text,
  target_role public.user_role default 'consultor'::public.user_role,
  valid_for interval default interval '7 days'
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  caller_org uuid;
  invitation_id uuid;
  normalized_email text;
  existing_user_id uuid;
  existing_user_name text;
begin
  caller_org := public.current_organization_id();
  normalized_email := lower(trim(target_email));

  if caller_org is null or not public.has_role('administrador') then
    raise exception 'acesso negado';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'e-mail inválido';
  end if;
  if valid_for < interval '15 minutes' or valid_for > interval '30 days' then
    raise exception 'prazo do convite inválido';
  end if;
  if exists(select 1 from public.profiles where lower(email)=normalized_email) then
    if exists(select 1 from public.profiles where organization_id=caller_org and lower(email)=normalized_email) then
      raise exception 'usuário já pertence à organização';
    end if;
    raise exception 'e-mail já pertence a outra organização';
  end if;
  if exists(
    select 1 from public.organization_invitations
    where email=normalized_email and accepted_at is null and revoked_at is null
      and expires_at>now() and organization_id<>caller_org
  ) then
    raise exception 'e-mail já possui convite ativo em outra organização';
  end if;

  update public.organization_invitations
     set revoked_at=now()
   where organization_id=caller_org and email=normalized_email
     and accepted_at is null and revoked_at is null;

  insert into public.organization_invitations(
    organization_id,email,role,invited_by,expires_at
  ) values(
    caller_org,normalized_email,target_role,auth.uid(),now()+valid_for
  ) returning id into invitation_id;

  -- Se a pessoa já possui uma conta de autenticação confirmada, o vínculo pode
  -- ser concluído imediatamente sem exigir a exclusão/recriação do usuário.
  select id,
         left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1)),120)
    into existing_user_id, existing_user_name
    from auth.users
   where lower(email)=normalized_email and email_confirmed_at is not null
   order by created_at desc
   limit 1;

  if existing_user_id is not null then
    insert into public.profiles(
      id,organization_id,full_name,email,role,active,invited_at,invited_by
    ) values(
      existing_user_id,caller_org,existing_user_name,normalized_email,target_role,true,now(),auth.uid()
    );
    update public.organization_invitations
       set accepted_at=now(), accepted_by=existing_user_id
     where id=invitation_id;
  end if;

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,after_data
  ) values(
    caller_org,auth.uid(),'member_invited','organization_invitation',invitation_id,
    jsonb_build_object('email',normalized_email,'role',target_role,'expires_at',now()+valid_for)
  );

  return invitation_id;
end $$;

revoke all on function public.invite_organization_member(text,public.user_role,interval) from public,anon;
grant execute on function public.invite_organization_member(text,public.user_role,interval) to authenticated;

-- Metadados do navegador nunca escolhem organização nem função. A associação é
-- derivada exclusivamente de um convite ativo para o e-mail verificado.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
declare
  invitation public.organization_invitations%rowtype;
begin
  select * into invitation
    from public.organization_invitations
   where email=lower(new.email)
     and accepted_at is null
     and revoked_at is null
     and expires_at>now()
   order by created_at desc
   limit 1
   for update skip locked;

  if invitation.id is null then
    return new;
  end if;

  insert into public.profiles(
    id,organization_id,full_name,email,role,active,invited_at,invited_by
  ) values(
    new.id,
    invitation.organization_id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),120),
    lower(new.email),
    invitation.role,
    true,
    invitation.created_at,
    invitation.invited_by
  ) on conflict(id) do nothing;

  update public.organization_invitations
     set accepted_at=now(), accepted_by=new.id
   where id=invitation.id;

  insert into public.audit_logs(
    organization_id,user_id,action,entity_type,entity_id,after_data
  ) values(
    invitation.organization_id,new.id,'member_invite_accepted','profile',new.id,
    jsonb_build_object('email',lower(new.email),'role',invitation.role,'invitation_id',invitation.id)
  );

  return new;
end $$;

comment on table public.organization_invitations is
'Convites de acesso vinculados à organização; impedem associação arbitrária entre tenants.';

-- Operadores da plataforma podem provisionar novos tenants, mas não recebem acesso
-- aos dados comerciais internos deles. A função é separada dos papéis do CRM.
create table if not exists public.platform_administrators (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.platform_administrators(profile_id)
select id from public.profiles
where lower(email)='viagemperfeitatrip@gmail.com' and active=true
on conflict(profile_id) do update set active=true;

alter table public.platform_administrators enable row level security;
create policy platform_administrators_read_self
  on public.platform_administrators for select to authenticated
  using(profile_id=auth.uid() and active=true);
revoke all on public.platform_administrators from public,anon;
grant select on public.platform_administrators to authenticated;

create or replace function public.is_platform_administrator()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.platform_administrators
    where profile_id=auth.uid() and active=true
  )
$$;
revoke all on function public.is_platform_administrator() from public,anon;
grant execute on function public.is_platform_administrator() to authenticated;

create policy organizations_platform_read
  on public.organizations for select to authenticated
  using(public.is_platform_administrator());

create or replace function public.create_tenant_organization(
  tenant_name text,
  tenant_slug text,
  administrator_email text,
  tenant_legal_name text default null,
  tenant_tax_id text default null,
  tenant_phone text default null,
  tenant_city text default null,
  tenant_state text default null
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  new_org_id uuid;
  new_pipeline_id uuid;
  normalized_slug text;
  normalized_email text;
  invitation_id uuid;
  existing_user_id uuid;
  existing_user_name text;
begin
  if not public.is_platform_administrator() then raise exception 'acesso negado'; end if;
  normalized_slug := lower(trim(tenant_slug));
  normalized_email := lower(trim(administrator_email));
  if length(trim(tenant_name))<2 or length(trim(tenant_name))>120 then raise exception 'nome inválido'; end if;
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'slug inválido'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'e-mail inválido'; end if;
  if exists(select 1 from public.profiles where lower(email)=normalized_email) then
    raise exception 'e-mail do administrador já pertence a uma organização';
  end if;
  if exists(
    select 1 from public.organization_invitations
    where email=normalized_email and accepted_at is null and revoked_at is null and expires_at>now()
  ) then
    raise exception 'e-mail do administrador já possui convite ativo';
  end if;

  insert into public.organizations(name,slug,legal_name,tax_id,email,phone,city,state)
  values(
    left(trim(tenant_name),120),normalized_slug,nullif(left(trim(tenant_legal_name),180),''),
    nullif(left(trim(tenant_tax_id),32),''),normalized_email,nullif(regexp_replace(coalesce(tenant_phone,''),'\D','','g'),''),
    nullif(left(trim(tenant_city),120),''),nullif(upper(left(trim(tenant_state),2)),'')
  ) returning id into new_org_id;

  insert into public.pipelines(organization_id,name,entity_type,is_default)
  values(new_org_id,'Pipeline comercial','lead',true) returning id into new_pipeline_id;
  insert into public.pipeline_stages(pipeline_id,name,code,position,color,is_won,is_lost) values
    (new_pipeline_id,'Novo lead','novo_lead',0,'#769286',false,false),
    (new_pipeline_id,'Qualificação','qualificacao',1,'#557A95',false,false),
    (new_pipeline_id,'Proposta','proposta',2,'#D2A85A',false,false),
    (new_pipeline_id,'Reserva','reserva',3,'#8C6A9E',false,false),
    (new_pipeline_id,'Convertido','convertido',4,'#37845B',true,false),
    (new_pipeline_id,'Perdido','perdido',5,'#A55B5B',false,true);
  insert into public.inbox_queues(organization_id,name,description,is_default)
  values(new_org_id,'Atendimento geral','Fila principal de atendimento',true);
  insert into public.organization_invitations(organization_id,email,role,invited_by,expires_at)
  values(new_org_id,normalized_email,'administrador',auth.uid(),now()+interval '7 days')
  returning id into invitation_id;

  select id,
         left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1)),120)
    into existing_user_id, existing_user_name
    from auth.users
   where lower(email)=normalized_email and email_confirmed_at is not null
   order by created_at desc
   limit 1;

  if existing_user_id is not null then
    insert into public.profiles(
      id,organization_id,full_name,email,role,active,invited_at,invited_by
    ) values(
      existing_user_id,new_org_id,existing_user_name,normalized_email,'administrador',true,now(),auth.uid()
    );
    update public.organization_invitations
       set accepted_at=now(), accepted_by=existing_user_id
     where id=invitation_id;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,after_data)
  values(
    public.current_organization_id(),auth.uid(),'tenant_created','organization',new_org_id,
    jsonb_build_object('name',left(trim(tenant_name),120),'slug',normalized_slug,'administrator_email',normalized_email)
  );
  return new_org_id;
end $$;

revoke all on function public.create_tenant_organization(text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.create_tenant_organization(text,text,text,text,text,text,text,text) to authenticated;

commit;
