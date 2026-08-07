-- Fase 1 de automação: regras comerciais, propostas, aprovações e governança da IA.
-- Estende o CRM existente; não duplica leads, clientes, reservas ou pagamentos.

create sequence if not exists public.proposal_number_sequence start 1000;

create table if not exists public.caravan_pricing (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  caravan_id uuid not null references public.caravans(id) on delete cascade,
  currency text not null default 'BRL' check(currency ~ '^[A-Z]{3}$'),
  base_price numeric(14,2) not null check(base_price>=0),
  promotional_price numeric(14,2) check(promotional_price>=0),
  single_room_supplement numeric(14,2) not null default 0 check(single_room_supplement>=0),
  child_price numeric(14,2) check(child_price>=0),
  leader_price numeric(14,2) check(leader_price>=0),
  minimum_entry numeric(14,2) not null default 0 check(minimum_entry>=0),
  maximum_installments integer not null default 1 check(maximum_installments between 1 and 60),
  installment_type text not null default 'fixa' check(installment_type in('fixa','variavel')),
  cash_discount_max numeric(5,2) not null default 0 check(cash_discount_max between 0 and 100),
  ai_discount_max numeric(5,2) not null default 3 check(ai_discount_max between 0 and 100),
  consultant_discount_max numeric(5,2) not null default 3 check(consultant_discount_max between 0 and 100),
  manager_discount_max numeric(5,2) not null default 5 check(manager_discount_max between 0 and 100),
  promotion_start timestamptz,
  promotion_end timestamptz,
  proposal_validity_days integer not null default 7 check(proposal_validity_days between 1 and 90),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(promotional_price is null or promotional_price<=base_price),
  check(promotion_end is null or promotion_start is null or promotion_end>promotion_start)
);
create unique index if not exists caravan_pricing_one_active_idx on public.caravan_pricing(caravan_id) where active=true;

create table if not exists public.pricing_variants (
  id uuid primary key default gen_random_uuid(),
  pricing_id uuid not null references public.caravan_pricing(id) on delete cascade,
  variant_type text not null check(variant_type in('acomodacao','viajante','embarque','lote','campanha','pagamento','grupo','lider','recorrente')),
  code text not null,
  label text not null,
  adjustment_type text not null check(adjustment_type in('valor_fixo','percentual','preco_final')),
  adjustment_value numeric(14,4) not null,
  minimum_quantity integer check(minimum_quantity is null or minimum_quantity>0),
  maximum_quantity integer check(maximum_quantity is null or maximum_quantity>=minimum_quantity),
  valid_from timestamptz,
  valid_until timestamptz,
  priority integer not null default 0,
  combinable boolean not null default false,
  conditions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pricing_id,variant_type,code),
  check(valid_until is null or valid_from is null or valid_until>valid_from)
);

create table if not exists public.pricing_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pricing_id uuid not null references public.caravan_pricing(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  before_data jsonb not null,
  after_data jsonb not null,
  justification text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  caravan_id uuid references public.caravans(id) on delete cascade,
  name text not null,
  rule_type text not null check(rule_type in('lote','avista','quantidade','recorrente','campanha','cupom','grupo','lider','promocional')),
  code text,
  discount_type text not null default 'percentual' check(discount_type in('percentual','valor_fixo')),
  discount_value numeric(14,2) not null check(discount_value>=0),
  minimum_travelers integer check(minimum_travelers is null or minimum_travelers>0),
  maximum_travelers integer check(maximum_travelers is null or maximum_travelers>=minimum_travelers),
  actor_limit text not null default 'todos' check(actor_limit in('ia','consultor','gestor','administrador','todos')),
  valid_from timestamptz,
  valid_until timestamptz,
  combinable boolean not null default false,
  conditions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(valid_until is null or valid_from is null or valid_until>valid_from)
);

create table if not exists public.discount_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  caravan_id uuid references public.caravans(id) on delete set null,
  requested_discount numeric(14,2) not null check(requested_discount>=0),
  requested_discount_percent numeric(5,2) check(requested_discount_percent between 0 and 100),
  allowed_discount numeric(14,2) not null default 0 check(allowed_discount>=0),
  requested_by uuid references public.profiles(id) on delete set null,
  requested_by_type text not null default 'usuario' check(requested_by_type in('usuario','ia','cliente')),
  approved_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pendente' check(status in('pendente','aprovado','recusado','alteracao_solicitada','cancelado')),
  reason text not null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  check(lead_id is not null or reservation_id is not null),
  check(resolved_at is null or resolved_at>=created_at)
);

create table if not exists public.payment_plan_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  caravan_id uuid references public.caravans(id) on delete cascade,
  name text not null,
  currency text not null default 'BRL' check(currency ~ '^[A-Z]{3}$'),
  minimum_entry_type text not null default 'valor' check(minimum_entry_type in('valor','percentual')),
  minimum_entry numeric(14,2) not null default 0 check(minimum_entry>=0),
  minimum_installments integer not null default 1 check(minimum_installments>0),
  maximum_installments integer not null default 1 check(maximum_installments>=minimum_installments and maximum_installments<=60),
  interest_rate_monthly numeric(7,4) not null default 0 check(interest_rate_monthly>=0),
  fee_amount numeric(14,2) not null default 0 check(fee_amount>=0),
  first_due_days integer not null default 30 check(first_due_days between 0 and 365),
  due_day integer check(due_day between 1 and 28),
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(valid_until is null or valid_from is null or valid_until>valid_from)
);

create table if not exists public.commercial_simulations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  caravan_id uuid not null references public.caravans(id) on delete restrict,
  pricing_id uuid not null references public.caravan_pricing(id) on delete restrict,
  payment_plan_rule_id uuid references public.payment_plan_rules(id) on delete set null,
  actor_type text not null check(actor_type in('ia','consultor','gestor','administrador','cliente')),
  travelers_count integer not null check(travelers_count>0),
  accommodation text,
  departure_city text,
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(14,6) check(exchange_rate is null or exchange_rate>0),
  gross_amount numeric(14,2) not null check(gross_amount>=0),
  discount_percent numeric(5,2) not null default 0 check(discount_percent between 0 and 100),
  discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
  fee_amount numeric(14,2) not null default 0 check(fee_amount>=0),
  entry_amount numeric(14,2) not null default 0 check(entry_amount>=0),
  financed_amount numeric(14,2) not null check(financed_amount>=0),
  installments integer not null check(installments>0),
  installment_schedule jsonb not null,
  inputs jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_number text not null unique,
  lead_id uuid references public.leads(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  caravan_id uuid not null references public.caravans(id) on delete restrict,
  simulation_id uuid references public.commercial_simulations(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  status text not null default 'rascunho' check(status in('rascunho','aguardando_aprovacao','aprovada','enviada','visualizada','aceita','recusada','vencida','convertida')),
  travelers_count integer not null check(travelers_count>0),
  accommodation text,
  departure_city text,
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  gross_amount numeric(14,2) not null check(gross_amount>=0),
  discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
  final_amount numeric(14,2) not null check(final_amount>=0),
  entry_amount numeric(14,2) not null default 0 check(entry_amount>=0),
  installments integer not null default 1 check(installments>0),
  installment_schedule jsonb not null default '[]'::jsonb,
  includes_snapshot jsonb not null default '[]'::jsonb,
  excludes_snapshot jsonb not null default '[]'::jsonb,
  itinerary_snapshot jsonb not null default '[]'::jsonb,
  notes text,
  valid_until timestamptz not null,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  responsible_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(lead_id is not null or customer_id is not null)
);

create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  version integer not null check(version>0),
  snapshot jsonb not null,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(proposal_id,version)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  approval_type text not null check(approval_type in('desconto','condicao_especial','parcelamento','gratuidade','alteracao_preco','cancelamento','reembolso','excecao_documental','reserva_especial')),
  entity_type text not null,
  entity_id uuid,
  lead_id uuid references public.leads(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_by_type text not null default 'usuario' check(requested_by_type in('usuario','ia','cliente','sistema')),
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'pendente' check(status in('pendente','aprovado','recusado','alteracao_solicitada','cancelado')),
  request_data jsonb not null default '{}'::jsonb,
  decision_data jsonb not null default '{}'::jsonb,
  reason text not null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_base_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  category text not null,
  content text not null,
  source text not null,
  source_url text,
  valid_from timestamptz,
  valid_until timestamptz,
  version integer not null default 1 check(version>0),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published boolean not null default false,
  audience text not null default 'interno' check(audience in('externo','interno','ambos')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(valid_until is null or valid_from is null or valid_until>valid_from),
  check(not published or (approved_by is not null and approved_at is not null))
);

create table if not exists public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  summary text not null,
  collected_data jsonb not null default '{}'::jsonb,
  intent text,
  stage text,
  next_action text,
  requires_human boolean not null default false,
  generated_by text not null default 'sistema' check(generated_by in('ia','usuario','sistema')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  action_name text not null,
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  allowed boolean not null default false,
  success boolean not null default false,
  source_ids uuid[] not null default '{}'::uuid[],
  model text,
  estimated_cost numeric(12,6),
  duration_ms integer,
  error_message text,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  reason text not null,
  context_summary text not null,
  priority text not null default 'media' check(priority in('baixa','media','alta','critica')),
  status text not null default 'pendente' check(status in('pendente','aceito','concluido','cancelado')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.ai_configurations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  enabled boolean not null default false,
  mode text not null default 'supervisionado' check(mode in('supervisionado','automatico','desativado')),
  tone text not null default 'humano, acolhedor, profissional, claro e objetivo',
  presentation_message text not null default 'Olá! Sou o Assistente Virtual da Viagem Perfeita Turismo.',
  business_hours jsonb not null default '{}'::jsonb,
  allowed_tools text[] not null default '{}'::text[],
  ai_discount_max numeric(5,2) not null default 3 check(ai_discount_max between 0 and 100),
  model text,
  monthly_cost_limit numeric(14,2) not null default 0 check(monthly_cost_limit>=0),
  require_sources boolean not null default true,
  require_identity_for_private_data boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations add column if not exists caravan_id uuid references public.caravans(id) on delete set null;
alter table public.conversations add column if not exists intent text;
alter table public.conversations add column if not exists collected_data jsonb not null default '{}'::jsonb;
alter table public.conversations add column if not exists next_action text;
alter table public.conversations add column if not exists requires_human boolean not null default false;

create index if not exists pricing_variants_active_idx on public.pricing_variants(pricing_id,active,priority desc);
create index if not exists pricing_history_pricing_idx on public.pricing_history(pricing_id,created_at desc);
create index if not exists discount_rules_lookup_idx on public.discount_rules(organization_id,caravan_id,active,valid_from,valid_until);
create index if not exists discount_approvals_pending_idx on public.discount_approvals(organization_id,status,created_at) where status='pendente';
create index if not exists simulations_lead_idx on public.commercial_simulations(lead_id,created_at desc);
create index if not exists proposals_lead_status_idx on public.proposals(lead_id,status,created_at desc);
create index if not exists approval_requests_pending_idx on public.approval_requests(organization_id,status,created_at) where status='pendente';
create index if not exists knowledge_published_idx on public.knowledge_base_articles(organization_id,category,valid_until) where published=true;
create index if not exists ai_actions_correlation_idx on public.ai_actions(organization_id,correlation_id,created_at);
create index if not exists ai_handoffs_pending_idx on public.ai_handoffs(organization_id,status,priority,created_at) where status='pendente';

alter table public.caravan_pricing enable row level security;
alter table public.pricing_variants enable row level security;
alter table public.pricing_history enable row level security;
alter table public.discount_rules enable row level security;
alter table public.discount_approvals enable row level security;
alter table public.payment_plan_rules enable row level security;
alter table public.commercial_simulations enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.approval_requests enable row level security;
alter table public.knowledge_base_articles enable row level security;
alter table public.conversation_summaries enable row level security;
alter table public.ai_actions enable row level security;
alter table public.ai_handoffs enable row level security;
alter table public.ai_configurations enable row level security;

create policy pricing_staff_read on public.caravan_pricing for select to authenticated using(organization_id=public.current_organization_id());
create policy pricing_managers_write on public.caravan_pricing for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy pricing_variants_staff_read on public.pricing_variants for select to authenticated using(exists(select 1 from public.caravan_pricing p where p.id=pricing_id and p.organization_id=public.current_organization_id()));
create policy pricing_variants_managers_write on public.pricing_variants for all to authenticated using(exists(select 1 from public.caravan_pricing p where p.id=pricing_id and p.organization_id=public.current_organization_id() and public.can_manage_all())) with check(exists(select 1 from public.caravan_pricing p where p.id=pricing_id and p.organization_id=public.current_organization_id() and public.can_manage_all()));
create policy pricing_history_managers_read on public.pricing_history for select to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy discount_rules_staff_read on public.discount_rules for select to authenticated using(organization_id=public.current_organization_id());
create policy discount_rules_managers_write on public.discount_rules for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy discount_approvals_read on public.discount_approvals for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or requested_by=auth.uid()));
create policy discount_approvals_create on public.discount_approvals for insert to authenticated with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy discount_approvals_decide on public.discount_approvals for update to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy payment_plans_staff_read on public.payment_plan_rules for select to authenticated using(organization_id=public.current_organization_id());
create policy payment_plans_managers_write on public.payment_plan_rules for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy simulations_read on public.commercial_simulations for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or public.can_access_lead(lead_id)));
create policy simulations_create on public.commercial_simulations for insert to authenticated with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy proposals_read on public.proposals for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or public.can_access_lead(lead_id)));
create policy proposals_write on public.proposals for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor') and (public.can_manage_all() or public.can_access_lead(lead_id))) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor') and (public.can_manage_all() or public.can_access_lead(lead_id)));
create policy proposal_versions_read on public.proposal_versions for select to authenticated using(exists(select 1 from public.proposals p where p.id=proposal_id and p.organization_id=public.current_organization_id() and (public.can_manage_all() or public.can_access_lead(p.lead_id))));
create policy approval_requests_read on public.approval_requests for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or requested_by=auth.uid()));
create policy approval_requests_create on public.approval_requests for insert to authenticated with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy approval_requests_decide on public.approval_requests for update to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy knowledge_staff_read on public.knowledge_base_articles for select to authenticated using(organization_id=public.current_organization_id());
create policy knowledge_managers_write on public.knowledge_base_articles for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy conversation_summaries_read on public.conversation_summaries for select to authenticated using(exists(select 1 from public.conversations c where c.id=conversation_id and c.organization_id=public.current_organization_id()));
create policy ai_actions_managers_read on public.ai_actions for select to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy ai_handoffs_read on public.ai_handoffs for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid()));
create policy ai_handoffs_manage on public.ai_handoffs for update to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid())) with check(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid()));
create policy ai_config_managers on public.ai_configurations for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());

create or replace function public.set_proposal_number() returns trigger language plpgsql set search_path=public as $$
begin
  if new.proposal_number is null or trim(new.proposal_number)='' then
    new.proposal_number='VP-PROP-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.proposal_number_sequence')::text,6,'0');
  end if;
  return new;
end $$;
drop trigger if exists set_proposal_number_trigger on public.proposals;
create trigger set_proposal_number_trigger before insert on public.proposals for each row execute function public.set_proposal_number();

create or replace function public.record_pricing_change() returns trigger language plpgsql security definer set search_path=public as $$
declare reason text;
begin
  reason=nullif(current_setting('app.pricing_justification',true),'');
  if reason is null then raise exception 'A justificativa da alteração de preço é obrigatória';end if;
  insert into public.pricing_history(organization_id,pricing_id,changed_by,before_data,after_data,justification)
  values(new.organization_id,new.id,auth.uid(),to_jsonb(old),to_jsonb(new),reason);
  return new;
end $$;
drop trigger if exists record_pricing_change_trigger on public.caravan_pricing;
create trigger record_pricing_change_trigger after update on public.caravan_pricing for each row when(old is distinct from new) execute function public.record_pricing_change();

create or replace function public.calculate_installment_schedule(
  total_amount numeric,
  discount_percent numeric,
  entry_amount numeric,
  installment_count integer,
  first_due_date date,
  monthly_interest numeric default 0,
  fee_amount numeric default 0
) returns jsonb language plpgsql immutable set search_path=public as $$
declare discounted numeric(14,2); financed numeric(14,2); installment_total numeric(14,2); base_installment numeric(14,2); remainder numeric(14,2); schedule jsonb='[]'::jsonb; i integer; value numeric(14,2);
begin
  if total_amount<0 or discount_percent<0 or discount_percent>100 or entry_amount<0 or installment_count<1 or installment_count>60 or monthly_interest<0 or fee_amount<0 then raise exception 'Parâmetros inválidos para simulação';end if;
  discounted=round(total_amount*(1-discount_percent/100),2);
  if entry_amount>discounted+fee_amount then raise exception 'A entrada não pode superar o valor final';end if;
  financed=round(discounted+fee_amount-entry_amount,2);
  if monthly_interest>0 then installment_total=round(financed*power(1+monthly_interest/100,installment_count),2);else installment_total=financed;end if;
  base_installment=trunc((installment_total/installment_count)*100)/100;
  remainder=round(installment_total-base_installment*installment_count,2);
  for i in 1..installment_count loop
    value=base_installment+case when i=installment_count then remainder else 0 end;
    schedule=schedule||jsonb_build_array(jsonb_build_object('number',i,'due_date',(first_due_date+(i-1)*interval '1 month')::date,'amount',round(value,2)));
  end loop;
  return jsonb_build_object('gross_amount',round(total_amount,2),'discount_percent',round(discount_percent,2),'discount_amount',round(total_amount-discounted,2),'fee_amount',round(fee_amount,2),'entry_amount',round(entry_amount,2),'financed_amount',financed,'installments',installment_count,'installment_total',installment_total,'schedule',schedule);
end $$;
revoke all on function public.calculate_installment_schedule(numeric,numeric,numeric,integer,date,numeric,numeric) from public;
grant execute on function public.calculate_installment_schedule(numeric,numeric,numeric,integer,date,numeric,numeric) to anon,authenticated,service_role;

create or replace function public.authorized_discount_limit(target_caravan_id uuid,actor_type text) returns numeric language plpgsql stable security definer set search_path=public as $$
declare pricing public.caravan_pricing%rowtype; config_limit numeric:=3; role_limit numeric:=0;
begin
  select * into pricing from public.caravan_pricing where caravan_id=target_caravan_id and active=true order by updated_at desc limit 1;
  if pricing.id is null then raise exception 'Tabela comercial não cadastrada';end if;
  select coalesce(ai_discount_max,3) into config_limit from public.ai_configurations where organization_id=pricing.organization_id;
  role_limit=case actor_type when 'ia' then least(pricing.ai_discount_max,config_limit) when 'consultor' then pricing.consultant_discount_max when 'gestor' then pricing.manager_discount_max when 'administrador' then 100 else 0 end;
  return greatest(0,least(role_limit,100));
end $$;
revoke all on function public.authorized_discount_limit(uuid,text) from public,anon;
grant execute on function public.authorized_discount_limit(uuid,text) to authenticated,service_role;

create or replace function public.resolve_discount_approval(target_id uuid,new_status text,resolution text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.can_manage_all() then raise exception 'Acesso não autorizado';end if;
  if new_status not in('aprovado','recusado','alteracao_solicitada') then raise exception 'Decisão inválida';end if;
  update public.discount_approvals set status=new_status,approved_by=auth.uid(),resolution_notes=resolution,resolved_at=now(),updated_at=now() where id=target_id and organization_id=public.current_organization_id() and status='pendente';
  if not found then raise exception 'Solicitação pendente não encontrada';end if;
end $$;
revoke all on function public.resolve_discount_approval(uuid,text,text) from public,anon;
grant execute on function public.resolve_discount_approval(uuid,text,text) to authenticated;

insert into public.ai_configurations(organization_id,enabled,mode,allowed_tools,ai_discount_max)
values(public.default_organization_id(),false,'supervisionado',array['search_caravans','get_caravan_details','get_caravan_availability','get_pricing_table','simulate_payment','check_discount_limit','create_or_update_lead','create_interest','create_task','generate_proposal','request_human_approval','handoff_to_human'],3)
on conflict(organization_id) do update set mode='supervisionado',ai_discount_max=least(public.ai_configurations.ai_discount_max,3),updated_at=now();

comment on table public.caravan_pricing is 'Tabela comercial oficial por caravana. Alterações exigem justificativa e geram histórico.';
comment on function public.calculate_installment_schedule(numeric,numeric,numeric,integer,date,numeric,numeric) is 'Cálculo determinístico compartilhado por site, CRM, proposta e IA; ajusta centavos na última parcela.';
comment on table public.ai_configurations is 'A IA permanece desativada até existir provedor, chave secreta e homologação de segurança.';

