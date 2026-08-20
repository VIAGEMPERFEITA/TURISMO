-- Inteligência comercial e recuperação de receita.
-- A fila apenas recomenda ações e cria tarefas internas; nenhum contato é disparado automaticamente.

create table if not exists public.commercial_recovery_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  trigger_type text not null check (trigger_type in ('proposal_stalled','reservation_abandoned','payment_due','payment_overdue','post_trip_retention','referral_request')),
  status text not null default 'aberta' check (status in ('aberta','em_andamento','recuperada','descartada')),
  priority text not null default 'media' check (priority in ('critica','alta','media','baixa')),
  projected_value numeric(14,2) not null default 0,
  currency text not null default 'BRL',
  next_action_at timestamptz,
  recommended_channel text,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles(id) on delete set null,
  fingerprint text not null,
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, fingerprint)
);

create index if not exists recovery_queue_org_status_idx
  on public.commercial_recovery_opportunities (organization_id, status, priority, next_action_at);

drop trigger if exists set_commercial_recovery_updated_at on public.commercial_recovery_opportunities;
create trigger set_commercial_recovery_updated_at
before update on public.commercial_recovery_opportunities
for each row execute function public.set_updated_at();

alter table public.commercial_recovery_opportunities enable row level security;

drop policy if exists recovery_select_staff on public.commercial_recovery_opportunities;
create policy recovery_select_staff on public.commercial_recovery_opportunities
for select to authenticated
using (organization_id = public.current_organization_id());

drop policy if exists recovery_manage_commercial on public.commercial_recovery_opportunities;
create policy recovery_manage_commercial on public.commercial_recovery_opportunities
for all to authenticated
using (
  organization_id = public.current_organization_id()
  and public.has_role('administrador','gestor','consultor')
)
with check (
  organization_id = public.current_organization_id()
  and public.has_role('administrador','gestor','consultor')
);

create or replace function public.refresh_commercial_recovery_queue()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_organization_id();
  v_inserted integer := 0;
  v_tasks integer := 0;
begin
  if v_org is null or not public.has_role('administrador','gestor','consultor') then
    raise exception 'Acesso não autorizado';
  end if;

  insert into public.commercial_recovery_opportunities (
    organization_id, lead_id, reservation_id, proposal_id, trigger_type, priority,
    projected_value, currency, next_action_at, recommended_channel, reason,
    assigned_to, fingerprint, metadata
  )
  select p.organization_id, p.lead_id, p.reservation_id, p.id, 'proposal_stalled',
    case when p.final_amount >= 15000 then 'alta' else 'media' end,
    coalesce(p.final_amount,0), coalesce(p.currency,'BRL'), now(), 'whatsapp',
    'Proposta enviada sem retorno há mais de 48 horas', p.responsible_id,
    'proposal_stalled:' || p.id::text,
    jsonb_build_object('proposal_number',p.proposal_number,'status',p.status)
  from public.proposals p
  where p.organization_id = v_org
    and p.status in ('enviada','visualizada')
    and coalesce(p.viewed_at,p.sent_at,p.updated_at) < now() - interval '48 hours'
      and (p.valid_until is null or p.valid_until >= now())
  on conflict (organization_id, fingerprint) do update set
    projected_value = excluded.projected_value,
    currency = excluded.currency,
    next_action_at = excluded.next_action_at,
    reason = excluded.reason,
    assigned_to = excluded.assigned_to,
    metadata = excluded.metadata,
    status = case when commercial_recovery_opportunities.status in ('recuperada','descartada')
      then commercial_recovery_opportunities.status else 'aberta' end;
  get diagnostics v_inserted = row_count;

  insert into public.commercial_recovery_opportunities (
    organization_id, lead_id, reservation_id, trigger_type, priority, projected_value,
    currency, next_action_at, recommended_channel, reason, assigned_to, fingerprint
  )
  select r.organization_id, r.lead_id, r.id, 'reservation_abandoned', 'alta',
    coalesce(r.final_value,r.total_value,0), coalesce(r.currency,'BRL'), now(), 'whatsapp',
    'Pré-reserva iniciada e não concluída há mais de 24 horas', l.assigned_to,
    'reservation_abandoned:' || r.id::text
  from public.reservations r
  left join public.leads l on l.id = r.lead_id
  where r.organization_id = v_org and r.status = 'pre_reserva'
    and r.created_at < now() - interval '24 hours'
    and r.archived_at is null
  on conflict (organization_id, fingerprint) do update set
    projected_value=excluded.projected_value, next_action_at=excluded.next_action_at,
    assigned_to=excluded.assigned_to,
    status=case when commercial_recovery_opportunities.status in ('recuperada','descartada')
      then commercial_recovery_opportunities.status else 'aberta' end;
  get diagnostics v_tasks = row_count;
  v_inserted := v_inserted + v_tasks;

  insert into public.commercial_recovery_opportunities (
    organization_id, reservation_id, payment_id, lead_id, trigger_type, priority,
    projected_value, currency, next_action_at, recommended_channel, reason, assigned_to, fingerprint
  )
  select r.organization_id, p.reservation_id, p.id, r.lead_id,
    case when p.status='atrasado' or p.due_date < current_date then 'payment_overdue' else 'payment_due' end,
    case when p.status='atrasado' or p.due_date < current_date then 'critica' else 'alta' end,
    p.amount, coalesce(r.currency,'BRL'), greatest(p.due_date::timestamptz,now()), 'whatsapp',
    case when p.status='atrasado' or p.due_date < current_date
      then 'Parcela vencida: requer abordagem humana e respeitosa'
      else 'Parcela vence nos próximos 3 dias' end,
    l.assigned_to, 'payment:' || p.id::text
  from public.payments p
  join public.reservations r on r.id=p.reservation_id
  left join public.leads l on l.id=r.lead_id
  where r.organization_id=v_org and p.status in ('pendente','atrasado')
    and (p.status='atrasado' or p.due_date <= current_date + 3)
  on conflict (organization_id, fingerprint) do update set
    trigger_type=excluded.trigger_type, priority=excluded.priority,
    projected_value=excluded.projected_value, next_action_at=excluded.next_action_at,
    reason=excluded.reason, assigned_to=excluded.assigned_to,
    status=case when commercial_recovery_opportunities.status in ('recuperada','descartada')
      then commercial_recovery_opportunities.status else 'aberta' end;
  get diagnostics v_tasks = row_count;
  v_inserted := v_inserted + v_tasks;

  insert into public.commercial_recovery_opportunities (
    organization_id, reservation_id, lead_id, trigger_type, priority, projected_value,
    currency, next_action_at, recommended_channel, reason, assigned_to, fingerprint
  )
  select r.organization_id,r.id,r.lead_id,'post_trip_retention','baixa',0,coalesce(r.currency,'BRL'),
    now(),'whatsapp','Pós-viagem: colher avaliação e, com consentimento, solicitar indicação',
    l.assigned_to,'post_trip:' || r.id::text
  from public.reservations r
  join public.caravans c on c.id=r.caravan_id
  left join public.leads l on l.id=r.lead_id
  where r.organization_id=v_org and r.status in ('confirmada','concluida')
    and c.return_date between current_date - 45 and current_date - 7
  on conflict (organization_id, fingerprint) do nothing;
  get diagnostics v_tasks = row_count;
  v_inserted := v_inserted + v_tasks;

  update public.commercial_recovery_opportunities o set status='recuperada',recovered_at=now()
  where o.organization_id=v_org and o.status not in ('recuperada','descartada') and (
    (o.proposal_id is not null and exists(select 1 from public.proposals p where p.id=o.proposal_id and p.status in ('aceita','convertida')))
    or (o.reservation_id is not null and o.trigger_type='reservation_abandoned' and exists(select 1 from public.reservations r where r.id=o.reservation_id and r.status in ('confirmada','concluida')))
    or (o.payment_id is not null and exists(select 1 from public.payments p where p.id=o.payment_id and p.status='pago'))
  );

  insert into public.tasks (organization_id,lead_id,reservation_id,proposal_id,assigned_to,title,description,due_at,priority,status,task_type,automation_key)
  select o.organization_id,o.lead_id,o.reservation_id,o.proposal_id,o.assigned_to,
        case o.trigger_type when 'proposal_stalled' then 'Retomar proposta sem resposta'
          when 'reservation_abandoned' then 'Ajudar cliente a concluir a reserva'
          when 'payment_due' then 'Confirmar próxima parcela'
          when 'payment_overdue' then 'Ajudar cliente com parcela vencida'
          else 'Planejar cuidado pós-viagem' end,
    o.reason,o.next_action_at,
    case o.priority when 'critica' then 'critica' when 'alta' then 'alta' when 'baixa' then 'baixa' else 'media' end,
    'pendente','comercial','recovery:'||o.fingerprint
  from public.commercial_recovery_opportunities o
  where o.organization_id=v_org and o.status='aberta'
      and o.trigger_type in ('proposal_stalled','reservation_abandoned','payment_due','payment_overdue','post_trip_retention')
  on conflict (organization_id,automation_key) where automation_key is not null do nothing;
  get diagnostics v_tasks = row_count;

  return jsonb_build_object('opportunities_processed',v_inserted,'tasks_created',v_tasks);
end;
$$;

create or replace function public.commercial_recovery_center()
returns jsonb
language sql
stable security definer
set search_path=public
as $$
  with scope as (
    select o.*,l.name lead_name,c.name customer_name,cv.name caravan_name,pf.full_name assignee_name
    from public.commercial_recovery_opportunities o
    left join public.leads l on l.id=o.lead_id
    left join public.reservations r on r.id=o.reservation_id
    left join public.customers c on c.id=r.customer_id
    left join public.caravans cv on cv.id=r.caravan_id
    left join public.profiles pf on pf.id=o.assigned_to
    where o.organization_id=public.current_organization_id()
      and public.current_role() is not null
  )
  select jsonb_build_object(
    'summary',jsonb_build_object(
      'open',count(*) filter(where status in ('aberta','em_andamento')),
      'urgent',count(*) filter(where status in ('aberta','em_andamento') and priority in ('critica','alta')),
      'recovered_30d',count(*) filter(where status='recuperada' and recovered_at>=now()-interval '30 days'),
      'value_at_risk',coalesce((select jsonb_agg(x order by x->>'currency') from (
        select jsonb_build_object('currency',currency,'value',sum(projected_value)) x
        from scope where status in ('aberta','em_andamento') group by currency
      ) q),'[]'::jsonb)
    ),
    'items',coalesce((
      select jsonb_agg(to_jsonb(i))
      from (
        select *
        from scope
        where status in ('aberta','em_andamento')
        order by case priority when 'critica' then 1 when 'alta' then 2 when 'media' then 3 else 4 end,
                 next_action_at nulls last
        limit 30
      ) i
    ),'[]'::jsonb)
  ) from scope;
$$;

grant select,insert,update,delete on public.commercial_recovery_opportunities to authenticated;
grant execute on function public.refresh_commercial_recovery_queue() to authenticated;
grant execute on function public.commercial_recovery_center() to authenticated;

insert into public.sales_cadences (organization_id,name,goal,trigger_tier,trigger_stage,active,simulation_mode,requires_consent,max_attempts)
select o.id,x.name,x.goal,x.tier,x.stage,true,true,true,x.attempts
from public.organizations o cross join (values
  ('Proposta sem retorno','Retomar propostas com contexto e aprovação humana','quente','proposta',3),
  ('Reserva iniciada sem conclusão','Remover obstáculos para concluir a reserva','quente','reserva',3),
  ('Pós-viagem e indicação','Cuidar do relacionamento e solicitar indicação com consentimento','cliente','pos_viagem',2)
) x(name,goal,tier,stage,attempts)
on conflict (organization_id,name) do nothing;
