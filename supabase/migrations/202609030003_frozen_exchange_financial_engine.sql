begin;

create table if not exists public.card_machine_fee_configurations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  installments integer not null check(installments between 1 and 10),
  fee_percent numeric(8,4) not null check(fee_percent>=0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  active boolean not null default true,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(valid_until is null or valid_until>valid_from),
  unique(organization_id,provider,installments,valid_from)
);

create table if not exists public.exchange_adjustment_previews(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  initial_exchange_rate numeric(14,6) not null check(initial_exchange_rate>0),
  adjustment_exchange_rate numeric(14,6) not null check(adjustment_exchange_rate>0),
  total_usd numeric(14,2) not null check(total_usd>=0),
  frozen_brl numeric(14,2) not null check(frozen_brl>=0),
  updated_brl numeric(14,2) not null check(updated_brl>=0),
  effectively_paid numeric(14,2) not null check(effectively_paid>=0),
  exchange_difference numeric(14,2) not null,
  final_balance numeric(14,2) not null,
  status text not null default 'pendente' check(status in('pendente','aprovado','rejeitado','aplicado')),
  calculated_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check(status not in('aprovado','aplicado') or (approved_by is not null and approved_at is not null))
);

alter table public.contract_templates add column if not exists operationally_reviewed boolean not null default false;
alter table public.contract_templates add column if not exists source_verified_sha256 text;
alter table public.contract_templates add column if not exists operational_review_notes text;

alter table public.card_machine_fee_configurations enable row level security;
alter table public.exchange_adjustment_previews enable row level security;
create policy card_machine_fees_staff_read on public.card_machine_fee_configurations
  for select to authenticated using(organization_id=public.current_organization_id());
create policy card_machine_fees_managers_write on public.card_machine_fee_configurations
  for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy exchange_previews_staff_read on public.exchange_adjustment_previews
  for select to authenticated using(organization_id=public.current_organization_id());
create policy exchange_previews_managers_write on public.exchange_adjustment_previews
  for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

do $$
declare org_id uuid; approver_id uuid; item record; terms_id uuid;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id from public.profiles where organization_id=org_id and active=true
    and role in('administrador','gestor') order by case when role='administrador' then 0 else 1 end limit 1;
  if org_id is null or approver_id is null then raise exception 'organizacao e aprovador sao obrigatorios'; end if;

  perform set_config('app.pricing_justification','Ativacao financeira autorizada em 03/09/2026: cambio inicial 5,40, entrada fixa de R$ 1.000 e acerto um mes antes.',true);
  for item in
    select c.*,p.usd_price from public.caravans c join (values
      ('egito-jordania-israel-novembro-2026',4790::numeric),
      ('paris-egito-israel-marco-2027',4490::numeric),('paris-egito-israel-marco-2028',4490::numeric),
      ('turquia-grecia-2027',5490::numeric),('turquia-grecia-2028',5490::numeric),
      ('jordania-israel-2027',4790::numeric),('jordania-israel-2028',4790::numeric),
      ('italia-2027',3990::numeric),('italia-2028',3990::numeric),
      ('israel-2027',5290::numeric),('israel-2028',5290::numeric),
      ('emirados-egito-2027',4290::numeric),('emirados-egito-2028',4290::numeric),
      ('israel-egito-2027',3590::numeric),('israel-egito-2028',3590::numeric)
    ) p(slug,usd_price) on p.slug=c.slug where c.organization_id=org_id
  loop
    update public.caravan_commercial_terms set base_currency='USD',base_price=item.usd_price,
      reference_exchange_rate=5.40,reference_brl_total=round(item.usd_price*5.40,2),
      entry_currency='BRL',entry_amount=1000,entry_counts_toward_total=true,
      exchange_adjustment_month=null,
      exchange_adjustment_policy='Câmbio inicial congelado em R$ 5,40. Um mês antes do embarque, realizar acerto com cotação definida e aprovada pela empresa; diferença positiva vira saldo adicional e diferença negativa vira crédito ou redução. Nenhuma cobrança ou crédito é aplicado sem aprovação administrativa.',
      settlement_days_before_departure=30,card_max_installments=10,
      card_fee_policy='Taxa integral da maquininha deve vir de configuração administrativa vigente. Sem taxa cadastrada, bloquear somente a finalização do cartão.',
      status='aprovado',ai_can_quote=true,ai_can_simulate=true,ai_can_request_entry=false,
      approved_by=approver_id,approved_at=now(),
      review_notes='Preço, câmbio inicial e boleto ativos. Solicitação de entrada e contrato final aguardam compatibilização jurídica da cláusula 4.1.',updated_at=now()
    where organization_id=org_id and caravan_id=item.id returning id into terms_id;

    update public.caravan_pricing set base_price=item.usd_price,currency='USD',
      single_room_supplement=0,minimum_entry=0,maximum_installments=1,
      installment_type='variavel',active=true,updated_by=approver_id,updated_at=now()
    where organization_id=org_id and caravan_id=item.id and active=true;

    update public.caravan_payment_options set status='em_revisao',ai_usable=false,
      review_notes='Substituído pelo plano dinâmico. Valores dependem do mês de ingresso; cartão depende da taxa vigente da maquininha.',updated_at=now()
    where organization_id=org_id and caravan_id=item.id;

    update public.payment_plan_rules set active=false,updated_at=now()
      where organization_id=org_id and caravan_id=item.id and active=true;
    insert into public.payment_plan_rules(organization_id,caravan_id,name,currency,
      minimum_entry_type,minimum_entry,minimum_installments,maximum_installments,
      interest_rate_monthly,fee_amount,first_due_days,due_day,active,conditions,created_by)
    values(org_id,item.id,'Entrada + boletos mensais até um mês antes','BRL','valor',1000,1,60,0,0,0,10,true,
      jsonb_build_object('initial_exchange_rate',5.40,'frozen_brl',round(item.usd_price*5.40,2),
        'adjustment_months_before_departure',1,'entry_per_traveler',1000,
        'boleto_dynamic',true,'card_max_installments',10,'card_fee_required',true,
        'single_room_supplement_status','sob_consulta'),approver_id);
  end loop;

  update public.contract_templates set source_filename='CONTRATO VP TURISMO.pdf',
    source_sha256='29210132590cf48004ce0c4bd6f7c2a91d14502fe7bb70bac4ffbe83bccc0fd7',
    source_verified_sha256='29210132590cf48004ce0c4bd6f7c2a91d14502fe7bb70bac4ffbe83bccc0fd7',
    operationally_reviewed=true,
    operational_review_notes='PDF de 3 páginas conferido em 03/09/2026. Bloqueio mantido: cláusula 4.1 exige entrada mínima de 10%, enquanto a regra comercial autorizada usa R$ 1.000 fixos. Roteiros incompletos e datas exatas também impedem contrato final.',
    legal_review_required=true,status='em_revisao',approved_by=null,approved_at=null,updated_at=now()
  where organization_id=org_id and code='caravana-internacional';
end $$;

create or replace function public.simulate_frozen_exchange_plan(payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c public.caravans%rowtype; t public.caravan_commercial_terms%rowtype;
  travelers int; enrollment date; settlement_month date; month_count int; mode text;
  frozen_total numeric; entry_total numeric; balance numeric; installment numeric;
  monthly_boleto numeric; boleto_total numeric; card_base numeric; card_count int;
  fee_percent numeric; fee_value numeric; card_total numeric; schedule jsonb:='[]'::jsonb; i int; amount numeric;
begin
  if auth.role() not in('authenticated','service_role') then raise exception 'acesso nao autorizado'; end if;
  select * into c from public.caravans where id=(payload->>'caravan_id')::uuid and archived_at is null;
  if c.id is null then raise exception 'caravana nao encontrada'; end if;
  select * into t from public.caravan_commercial_terms where caravan_id=c.id and status='aprovado';
  if t.id is null or t.reference_exchange_rate is null then raise exception 'condicao financeira nao aprovada'; end if;
  travelers:=coalesce(nullif(payload->>'travelers_count','')::int,1);
  if travelers<1 or travelers>200 then raise exception 'quantidade de viajantes invalida'; end if;
  enrollment:=date_trunc('month',coalesce(nullif(payload->>'enrollment_month','')::date,current_date))::date;
  settlement_month:=(make_date(c.year,c.month,1)-interval '1 month')::date;
  month_count:=((extract(year from settlement_month)-extract(year from enrollment))*12+
    extract(month from settlement_month)-extract(month from enrollment))::int+1;
  if month_count<1 then raise exception 'ingresso posterior ao limite de parcelamento'; end if;
  frozen_total:=round(t.base_price*t.reference_exchange_rate*travelers,2);
  entry_total:=round(t.entry_amount*travelers,2); balance:=frozen_total-entry_total;
  mode:=coalesce(nullif(payload->>'mode',''),'boleto');
  if mode='boleto' then
    installment:=round(balance/month_count,2);
    for i in 1..month_count loop
      amount:=case when i=month_count then balance-installment*(month_count-1) else installment end;
      schedule:=schedule||jsonb_build_array(jsonb_build_object('number',i,'due_date',(enrollment+(i-1)*interval '1 month')::date,'amount',amount,'method','boleto'));
    end loop;
    return jsonb_build_object('status','simulado','mode','boleto','currency','BRL','travelers',travelers,
      'usd_per_person',t.base_price,'initial_exchange_rate',t.reference_exchange_rate,
      'frozen_total_brl',frozen_total,'entry_total_brl',entry_total,'installments',month_count,
      'schedule',schedule,'exchange_adjustment_month',settlement_month,'external_charge_created',false);
  elsif mode='boleto_cartao' then
    monthly_boleto:=nullif(payload->>'monthly_boleto','')::numeric;
    if monthly_boleto is null or monthly_boleto<0 then
      return jsonb_build_object('status','requer_valor_boleto','message','Informe quanto será pago mensalmente por boleto.','external_charge_created',false);
    end if;
    boleto_total:=least(balance,round(monthly_boleto*month_count,2)); card_base:=balance-boleto_total;
    card_count:=least(greatest(coalesce(nullif(payload->>'card_installments','')::int,10),1),10);
    select f.fee_percent into fee_percent from public.card_machine_fee_configurations f
      where f.organization_id=c.organization_id and f.installments=card_count and f.active
        and f.valid_from<=now() and coalesce(f.valid_until,'infinity')>now()
      order by f.valid_from desc limit 1;
    if fee_percent is null then return jsonb_build_object('status','requer_taxa_maquininha',
      'frozen_total_brl',frozen_total,'entry_total_brl',entry_total,'boleto_total_brl',boleto_total,
      'card_base_brl',card_base,'card_installments',card_count,
      'message','A taxa da maquininha precisa ser configurada e aprovada para finalizar o cartão.','external_charge_created',false); end if;
    fee_value:=round(card_base*fee_percent/100,2);card_total:=card_base+fee_value;
    return jsonb_build_object('status','simulado','mode','boleto_cartao','currency','BRL',
      'travelers',travelers,'usd_per_person',t.base_price,'initial_exchange_rate',t.reference_exchange_rate,
      'frozen_total_brl',frozen_total,'entry_total_brl',entry_total,'boleto_installments',month_count,
      'monthly_boleto_brl',monthly_boleto,'boleto_total_brl',boleto_total,'card_base_brl',card_base,
      'machine_fee_percent',fee_percent,'machine_fee_brl',fee_value,'card_total_brl',card_total,
      'card_installments',card_count,'card_installment_brl',round(card_total/card_count,2),
      'exchange_adjustment_month',settlement_month,'external_charge_created',false);
  else raise exception 'modalidade invalida'; end if;
end $$;
revoke all on function public.simulate_frozen_exchange_plan(jsonb) from public,anon;
grant execute on function public.simulate_frozen_exchange_plan(jsonb) to authenticated,service_role;

create or replace function public.preview_exchange_adjustment(target_reservation_id uuid,target_exchange_rate numeric) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.reservations%rowtype; t public.caravan_commercial_terms%rowtype; paid numeric;
  total_usd numeric; frozen numeric; updated numeric; difference numeric; balance numeric; preview_id uuid;
begin
  if not public.has_role('administrador','gestor') then raise exception 'aprovacao administrativa obrigatoria'; end if;
  if target_exchange_rate<=0 then raise exception 'cotacao invalida'; end if;
  select * into r from public.reservations where id=target_reservation_id and organization_id=public.current_organization_id();
  if r.id is null then raise exception 'reserva nao encontrada'; end if;
  select * into t from public.caravan_commercial_terms where caravan_id=r.caravan_id and status='aprovado';
  total_usd:=round(t.base_price*r.travelers_count,2);frozen:=round(total_usd*t.reference_exchange_rate,2);
  updated:=round(total_usd*target_exchange_rate,2);
  select coalesce(sum(amount),0) into paid from public.payments where reservation_id=r.id and status='pago';
  difference:=updated-frozen;balance:=updated-paid;
  insert into public.exchange_adjustment_previews(organization_id,reservation_id,initial_exchange_rate,
    adjustment_exchange_rate,total_usd,frozen_brl,updated_brl,effectively_paid,exchange_difference,
    final_balance,status,calculated_by)
  values(r.organization_id,r.id,t.reference_exchange_rate,target_exchange_rate,total_usd,frozen,updated,
    paid,difference,balance,'pendente',auth.uid()) returning id into preview_id;
  return jsonb_build_object('preview_id',preview_id,'status','pendente_aprovacao','total_usd',total_usd,
    'initial_exchange_rate',t.reference_exchange_rate,'adjustment_exchange_rate',target_exchange_rate,
    'frozen_brl',frozen,'updated_brl',updated,'effectively_paid',paid,'exchange_difference',difference,
    'credit_to_customer',greatest(-difference,0),'additional_balance',greatest(difference,0),
    'final_balance',balance,'external_charge_created',false);
end $$;
revoke all on function public.preview_exchange_adjustment(uuid,numeric) from public,anon;
grant execute on function public.preview_exchange_adjustment(uuid,numeric) to authenticated;

commit;
