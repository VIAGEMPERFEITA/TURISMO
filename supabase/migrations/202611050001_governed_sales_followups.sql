-- Retomada comercial governada: prepara lembretes sem ignorar consentimento,
-- descadastro, resposta do cliente, fechamento ou limites de frequência.
begin;

create table if not exists public.sales_followup_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  simulation_mode boolean not null default true,
  first_delay_hours integer not null default 48 check(first_delay_hours between 24 and 720),
  interval_hours integer not null default 72 check(interval_hours between 24 and 720),
  max_attempts integer not null default 3 check(max_attempts between 1 and 5),
  business_hour_start integer not null default 9 check(business_hour_start between 0 and 23),
  business_hour_end integer not null default 18 check(business_hour_end between 1 and 24),
  timezone text not null default 'America/Sao_Paulo',
  template_id uuid references public.message_templates(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check(business_hour_start < business_hour_end)
);

create table if not exists public.sales_followup_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  phone_e164 text not null check(phone_e164 ~ '^[1-9][0-9]{9,14}$'),
  attempt_number integer not null check(attempt_number between 1 and 5),
  status text not null default 'aguardando_aprovacao' check(status in ('aguardando_aprovacao','agendada','na_fila','enviada','cancelada','bloqueada','respondida')),
  scheduled_at timestamptz not null,
  template_id uuid references public.message_templates(id) on delete set null,
  blocking_reason text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,idempotency_key), unique(conversation_id,attempt_number)
);
create index if not exists sales_followup_attempts_queue_idx on public.sales_followup_attempts(organization_id,status,scheduled_at);

alter table public.sales_followup_policies enable row level security;
alter table public.sales_followup_attempts enable row level security;
create policy sales_followup_policy_read on public.sales_followup_policies for select to authenticated using(organization_id=public.current_organization_id());
create policy sales_followup_policy_manage on public.sales_followup_policies for all to authenticated
  using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'))
  with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));
create policy sales_followup_attempts_read on public.sales_followup_attempts for select to authenticated using(organization_id=public.current_organization_id());

insert into public.sales_followup_policies(organization_id)
select id from public.organizations on conflict(organization_id) do nothing;

create or replace function public.sales_followup_preview()
returns jsonb language sql stable security definer set search_path=public as $$
  with policy as (
    select * from sales_followup_policies where organization_id=current_organization_id()
  ), candidates as (
    select distinct on(c.id) c.id conversation_id,c.lead_id,l.name,
      regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') phone_e164,
      c.last_message_at,
      coalesce((select count(*) from sales_followup_attempts a where a.conversation_id=c.id and a.status not in ('cancelada','bloqueada','respondida')),0) attempts
    from conversations c join leads l on l.id=c.lead_id cross join policy p
    where c.organization_id=current_organization_id() and c.channel='whatsapp'
      and c.status in ('aberta','aguardando_cliente') and l.deleted_at is null
      and l.converted_customer_id is null and c.last_message_at <= now()-(p.first_delay_hours||' hours')::interval
      and exists(select 1 from messages m where m.conversation_id=c.id and m.direction='entrada')
      and (select m.direction from messages m where m.conversation_id=c.id order by m.sent_at desc,m.created_at desc limit 1)='saida'
      and not exists(select 1 from sales_followup_attempts a where a.conversation_id=c.id and a.created_at>now()-(p.interval_hours||' hours')::interval)
      and exists(select 1 from contact_consents cc where cc.organization_id=c.organization_id and cc.lead_id=l.id and cc.channel='whatsapp' and cc.purpose='marketing' and cc.granted and cc.revoked_at is null)
      and not exists(select 1 from contact_suppressions s where s.organization_id=c.organization_id and s.phone_e164=regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') and s.channel='whatsapp' and s.scope in ('marketing','todos') and s.released_at is null)
      and regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') ~ '^[1-9][0-9]{9,14}$'
  )
  select jsonb_build_object(
    'eligible_count',count(*) filter(where attempts<(select max_attempts from policy)),
    'max_attempts',(select max_attempts from policy),
    'enabled',(select enabled from policy),
    'simulation_mode',(select simulation_mode from policy),
    'template_ready',exists(select 1 from message_templates t,policy p where t.id=p.template_id and t.status='aprovado'),
    'contacts',coalesce(jsonb_agg(jsonb_build_object('conversation_id',conversation_id,'lead_id',lead_id,'name',name,'phone_e164',phone_e164,'last_message_at',last_message_at,'attempts',attempts) order by last_message_at) filter(where attempts<(select max_attempts from policy)),'[]'::jsonb)
  ) from candidates;
$$;
revoke all on function public.sales_followup_preview() from public,anon;
grant execute on function public.sales_followup_preview() to authenticated;

create or replace function public.update_sales_followup_policy(
  policy_enabled boolean, policy_simulation boolean, delay_hours integer, spacing_hours integer,
  attempt_limit integer, start_hour integer, end_hour integer, approved_template uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();
begin
  if org is null or not has_role('administrador','gestor') then raise exception 'forbidden'; end if;
  if policy_enabled and not policy_simulation and not exists(select 1 from message_templates where id=approved_template and organization_id=org and status='aprovado') then raise exception 'approved_template_required'; end if;
  insert into sales_followup_policies(organization_id,enabled,simulation_mode,first_delay_hours,interval_hours,max_attempts,business_hour_start,business_hour_end,template_id,updated_by,updated_at)
  values(org,policy_enabled,policy_simulation,delay_hours,spacing_hours,attempt_limit,start_hour,end_hour,approved_template,auth.uid(),now())
  on conflict(organization_id) do update set enabled=excluded.enabled,simulation_mode=excluded.simulation_mode,first_delay_hours=excluded.first_delay_hours,interval_hours=excluded.interval_hours,max_attempts=excluded.max_attempts,business_hour_start=excluded.business_hour_start,business_hour_end=excluded.business_hour_end,template_id=excluded.template_id,updated_by=auth.uid(),updated_at=now();
  return sales_followup_preview();
end $$;
revoke all on function public.update_sales_followup_policy(boolean,boolean,integer,integer,integer,integer,integer,uuid) from public,anon;
grant execute on function public.update_sales_followup_policy(boolean,boolean,integer,integer,integer,integer,integer,uuid) to authenticated;

commit;
