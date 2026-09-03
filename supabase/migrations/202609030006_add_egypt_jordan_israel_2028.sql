begin;

insert into public.caravans(
  organization_id,name,slug,destination,departure_date,return_date,status_public,status_internal,published,
  capacity,available_spots,subtitle,short_description,full_description,cover_image,month,year,duration_days,
  duration_nights,departure_city,countries,cities,category,priority,airline,hotel_category,meals,guide,
  coordinator,included,not_included,gallery,commercial_notes
)
select organization_id,replace(name,'2026','2028'),'egito-jordania-israel-novembro-2028',destination,null,null,
  status_public,'confirmada',true,capacity,available_spots,subtitle,short_description,full_description,cover_image,
  11,2028,duration_days,duration_nights,'Aeroporto Internacional de Guarulhos (GRU), São Paulo',countries,cities,
  category,priority+100,airline,'Hotéis de categoria 4 e 5 estrelas ou similares',meals,guide,coordinator,included,
  not_included,gallery,'Datas exatas confirmadas três meses antes. Roteiro diário oficial clonado da versão aprovada de 2026.'
from public.caravans where slug='egito-jordania-israel-novembro-2026'
on conflict(organization_id,slug) do update set name=excluded.name,destination=excluded.destination,
  departure_date=null,return_date=null,status_public=excluded.status_public,status_internal='confirmada',published=true,
  subtitle=excluded.subtitle,short_description=excluded.short_description,full_description=excluded.full_description,
  cover_image=excluded.cover_image,month=11,year=2028,duration_days=excluded.duration_days,
  duration_nights=excluded.duration_nights,departure_city=excluded.departure_city,countries=excluded.countries,
  cities=excluded.cities,category=excluded.category,hotel_category=excluded.hotel_category,meals=excluded.meals,
  included=excluded.included,not_included=excluded.not_included,gallery=excluded.gallery,
  commercial_notes=excluded.commercial_notes,updated_at=now();

delete from public.caravan_itinerary_days where caravan_id in(
  select id from public.caravans where slug='egito-jordania-israel-novembro-2028'
);
insert into public.caravan_itinerary_days(caravan_id,day_number,date,city,title,description,visits,meals,hotel,
  transportation,notes,position)
select target.id,d.day_number,null,d.city,d.title,d.description,d.visits,d.meals,d.hotel,d.transportation,d.notes,d.position
from public.caravan_itinerary_days d
join public.caravans source on source.id=d.caravan_id and source.slug='egito-jordania-israel-novembro-2026'
join public.caravans target on target.organization_id=source.organization_id and target.slug='egito-jordania-israel-novembro-2028';

do $$
declare org_id uuid; approver_id uuid; source_id uuid; target_id uuid; terms_id uuid; target_name text; next_version int;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id from public.profiles where organization_id=org_id and active=true and role in('administrador','gestor')
    order by case when role='administrador' then 0 else 1 end limit 1;
  select id into source_id from public.caravans where organization_id=org_id and slug='egito-jordania-israel-novembro-2026';
  select id,name into target_id,target_name from public.caravans where organization_id=org_id and slug='egito-jordania-israel-novembro-2028';
  if approver_id is null or source_id is null or target_id is null then raise exception 'dados de clonagem incompletos'; end if;

  update public.caravan_pricing set active=false,updated_at=now() where organization_id=org_id and caravan_id=target_id;
  insert into public.caravan_pricing(organization_id,caravan_id,currency,base_price,minimum_entry,maximum_installments,
    installment_type,ai_discount_max,consultant_discount_max,manager_discount_max,proposal_validity_days,active,created_by,updated_by)
  values(org_id,target_id,'USD',4790,2586.60,60,'variavel',0,0,0,7,true,approver_id,approver_id);

  insert into public.caravan_commercial_terms(organization_id,caravan_id,base_currency,base_price,
    reference_exchange_rate,reference_brl_total,entry_currency,entry_amount,entry_counts_toward_total,
    exchange_adjustment_policy,settlement_days_before_departure,card_max_installments,card_fee_policy,
    pix_key,pix_holder,duration_marketing_days,duration_itinerary_days,status,ai_can_quote,ai_can_simulate,
    ai_can_request_entry,approved_by,approved_at,review_notes)
  values(org_id,target_id,'USD',4790,5.40,25866,'BRL',2586.60,true,
    'Câmbio inicial congelado em R$ 5,40. Um mês antes do embarque, realizar acerto pela cotação definida e aprovada pela empresa.',
    30,10,'Taxa da maquininha deve vir de configuração administrativa vigente. Sem taxa, bloquear o cartão.',
    '28.279.846/0001-21','VP TURISMO E EVENTOS',14,14,'aprovado',true,true,true,approver_id,now(),
    'Roteiro 2028 clonado da fonte oficial de 2026. Entrada mínima de 10% do total em reais no câmbio congelado.')
  on conflict(organization_id,caravan_id) do update set base_currency='USD',base_price=4790,
    reference_exchange_rate=5.40,reference_brl_total=25866,entry_currency='BRL',entry_amount=2586.60,
    entry_counts_toward_total=true,exchange_adjustment_policy=excluded.exchange_adjustment_policy,
    settlement_days_before_departure=30,card_max_installments=10,card_fee_policy=excluded.card_fee_policy,
    duration_marketing_days=14,duration_itinerary_days=14,status='aprovado',ai_can_quote=true,ai_can_simulate=true,
    ai_can_request_entry=true,approved_by=approver_id,approved_at=now(),review_notes=excluded.review_notes,updated_at=now()
  returning id into terms_id;

  update public.payment_plan_rules set active=false,updated_at=now() where organization_id=org_id and caravan_id=target_id;
  insert into public.payment_plan_rules(organization_id,caravan_id,name,currency,minimum_entry_type,minimum_entry,
    minimum_installments,maximum_installments,interest_rate_monthly,fee_amount,first_due_days,due_day,active,conditions,created_by)
  values(org_id,target_id,'Entrada de 10% + boletos mensais até um mês antes','BRL','percentual',10,1,60,0,0,0,10,true,
    jsonb_build_object('initial_exchange_rate',5.40,'frozen_brl',25866,'entry_percent',10,
      'adjustment_months_before_departure',1,'boleto_dynamic',true,'card_max_installments',10,'card_fee_required',true),approver_id);

  insert into public.knowledge_base_articles(organization_id,title,category,content,source,source_url,version,
    approved_by,approved_at,published,audience,created_by,lifecycle_status,usable_by_ai,responsible_id)
  select org_id,'Base oficial — '||target_name,'caravana_oficial',replace(content,'2026','2028'),
    'Clonagem controlada do roteiro oficial de 2026 — autorização de 03/09/2026',
    'https://www.viagemperfeitaturismo.com.br/caravanas/egito-jordania-israel-novembro-2028',1,
    approver_id,now(),true,'ambos',approver_id,'aprovado',true,approver_id
  from public.knowledge_base_articles where organization_id=org_id and title='Base oficial — '||
    (select name from public.caravans where id=source_id) order by version desc limit 1;

  select coalesce(max(version),0)+1 into next_version from public.caravan_ai_knowledge_snapshots
    where organization_id=org_id and caravan_id=target_id;
  insert into public.caravan_ai_knowledge_snapshots(organization_id,caravan_id,version,catalog_data,commercial_data,
    itinerary_status,source_url,status,approved_by,approved_at)
  select org_id,target_id,next_version,to_jsonb(c)||jsonb_build_object('itinerary',jsonb_agg(to_jsonb(d) order by d.day_number)),
    (select to_jsonb(t) from public.caravan_commercial_terms t where t.id=terms_id),'detalhado',
    'https://www.viagemperfeitaturismo.com.br/caravanas/egito-jordania-israel-novembro-2028','aprovado',approver_id,now()
  from public.caravans c join public.caravan_itinerary_days d on d.caravan_id=c.id where c.id=target_id group by c.id;

  insert into public.ai_test_scenarios(organization_id,scenario_code,category,title,input_message,expected_behavior,critical)
  values(org_id,'caravana-roteiro-egito-jordania-israel-novembro-2028','roteiro','Roteiro — '||target_name,
    'Envie o roteiro completo da '||target_name||'.',jsonb_build_object('required_itinerary_status','detalhado',
      'expected_days',14,'must_not_mix_caravans',true,'must_use_source',true),true)
  on conflict(organization_id,scenario_code) do update set title=excluded.title,input_message=excluded.input_message,
    expected_behavior=excluded.expected_behavior,critical=true,active=true,updated_at=now();
end $$;

commit;
