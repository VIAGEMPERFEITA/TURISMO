begin;

-- Todas as saídas de 2027 também ficam disponíveis em 2028. As datas exatas
-- permanecem nulas até a confirmação operacional, três meses antes da viagem.
insert into public.caravans(
  organization_id,name,slug,destination,departure_date,return_date,status_public,
  status_internal,published,capacity,available_spots,subtitle,short_description,
  full_description,cover_image,month,year,duration_days,duration_nights,
  departure_city,countries,cities,category,priority,airline,hotel_category,meals,
  guide,coordinator,included,not_included,gallery,price,currency,deposit,
  installments,cash_discount,condition_valid_until,commercial_notes
)
select
  organization_id,
  case when name like '%2027%' then replace(name,'2027','2028') else name||' — 2028' end,
  replace(slug,'2027','2028'),
  destination,null,null,status_public,'confirmada',true,capacity,available_spots,
  subtitle,short_description,full_description,cover_image,month,2028,duration_days,
  duration_nights,'Aeroporto Internacional de Guarulhos (GRU), São Paulo',countries,
  cities,category,priority+100,airline,hotel_category,meals,guide,coordinator,
  included,not_included,gallery,null,null,null,null,null,null,
  'Datas exatas confirmadas e informadas no atendimento três meses antes da viagem.'
from public.caravans
where year=2027 and published=true and status_internal='confirmada' and archived_at is null
on conflict(organization_id,slug) do update set
  name=excluded.name,destination=excluded.destination,departure_date=null,return_date=null,
  status_public=excluded.status_public,status_internal='confirmada',published=true,
  subtitle=excluded.subtitle,short_description=excluded.short_description,
  full_description=excluded.full_description,cover_image=excluded.cover_image,
  month=excluded.month,year=2028,duration_days=excluded.duration_days,
  duration_nights=excluded.duration_nights,departure_city=excluded.departure_city,
  countries=excluded.countries,cities=excluded.cities,category=excluded.category,
  included=excluded.included,not_included=excluded.not_included,gallery=excluded.gallery,
  commercial_notes=excluded.commercial_notes,updated_at=now();

insert into public.caravan_itinerary_days(
  caravan_id,day_number,date,city,title,description,visits,meals,hotel,
  transportation,notes,position
)
select target.id,source_day.day_number,null,source_day.city,source_day.title,
  source_day.description,source_day.visits,source_day.meals,source_day.hotel,
  source_day.transportation,source_day.notes,source_day.position
from public.caravan_itinerary_days source_day
join public.caravans source on source.id=source_day.caravan_id and source.year=2027
join public.caravans target on target.organization_id=source.organization_id
  and target.slug=replace(source.slug,'2027','2028')
on conflict(caravan_id,day_number) do update set
  date=null,city=excluded.city,title=excluded.title,description=excluded.description,
  visits=excluded.visits,meals=excluded.meals,hotel=excluded.hotel,
  transportation=excluded.transportation,notes=excluded.notes,
  position=excluded.position,updated_at=now();

-- Datas exatas não são prometidas antes da confirmação operacional.
update public.caravans set
  departure_date=null,
  return_date=null,
  departure_city='Aeroporto Internacional de Guarulhos (GRU), São Paulo',
  commercial_notes=concat_ws(' ',nullif(commercial_notes,''),
    'Datas exatas confirmadas e informadas no atendimento três meses antes da viagem.'),
  updated_at=now()
where published=true and status_internal='confirmada' and year in(2027,2028);

do $$
declare
  org_id uuid;
  approver_id uuid;
  item record;
  terms_id uuid;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id from public.profiles
    where organization_id=org_id and active=true and role in('administrador','gestor')
    order by case when role='administrador' then 0 else 1 end limit 1;
  if org_id is null or approver_id is null then
    raise exception 'organizacao e aprovador sao obrigatorios';
  end if;

  perform set_config('app.pricing_justification',
    'Preços privados por roteiro informados e autorizados em 03/09/2026.',true);

  for item in
    select c.id,c.slug,c.name,p.base_price
    from public.caravans c
    join (values
      ('egito-jordania-israel-novembro-2026',4790::numeric),
      ('paris-egito-israel-marco-2027',4490::numeric),
      ('paris-egito-israel-marco-2028',4490::numeric),
      ('turquia-grecia-2027',5490::numeric),
      ('turquia-grecia-2028',5490::numeric),
      ('jordania-israel-2027',4790::numeric),
      ('jordania-israel-2028',4790::numeric),
      ('italia-2027',3990::numeric),
      ('italia-2028',3990::numeric),
      ('israel-2027',5290::numeric),
      ('israel-2028',5290::numeric),
      ('emirados-egito-2027',4290::numeric),
      ('emirados-egito-2028',4290::numeric),
      ('israel-egito-2027',3590::numeric),
      ('israel-egito-2028',3590::numeric)
    ) as p(slug,base_price) on p.slug=c.slug
    where c.organization_id=org_id
  loop
    update public.caravan_pricing set active=false,updated_at=now()
      where organization_id=org_id and caravan_id=item.id and active=true;
    insert into public.caravan_pricing(
      organization_id,caravan_id,currency,base_price,minimum_entry,
      maximum_installments,installment_type,ai_discount_max,consultant_discount_max,
      manager_discount_max,proposal_validity_days,active,created_by,updated_by
    ) values(org_id,item.id,'USD',item.base_price,0,1,'variavel',0,0,0,7,true,approver_id,approver_id);

    insert into public.caravan_commercial_terms(
      organization_id,caravan_id,base_currency,base_price,entry_currency,
      entry_amount,entry_counts_toward_total,exchange_adjustment_policy,
      settlement_days_before_departure,card_max_installments,card_fee_policy,
      pix_key,pix_holder,duration_marketing_days,duration_itinerary_days,status,
      ai_can_quote,ai_can_simulate,ai_can_request_entry,approved_by,approved_at,review_notes
    )
    select org_id,item.id,'USD',item.base_price,'BRL',0,true,
      'O câmbio, quando informado pela Central Comercial, fica congelado para a proposta durante sua validade registrada. Enquanto não houver cotação aprovada, não converter nem estimar valores. Entrada, parcelamento e vencimentos aguardam definição comercial.',
      40,1,'A definir antes de qualquer simulação ou cobrança.',
      '28.279.846/0001-21','VP TURISMO E EVENTOS',
      coalesce(c.duration_days,14),coalesce(c.duration_days,14),'aprovado',
      true,false,false,approver_id,now(),
      'Preço-base privado aprovado. IA pode informar o valor em USD. Se houver câmbio aprovado, deve explicar que ele está congelado para a proposta durante a validade registrada; não recalcular por conta própria. Condições de pagamento permanecem sob consulta.'
    from public.caravans c where c.id=item.id
    on conflict(organization_id,caravan_id) do update set
      base_currency='USD',base_price=excluded.base_price,reference_exchange_rate=null,
      reference_brl_total=null,entry_currency='BRL',entry_amount=0,
      exchange_adjustment_policy=excluded.exchange_adjustment_policy,
      card_max_installments=1,card_fee_policy=excluded.card_fee_policy,
      status='aprovado',ai_can_quote=true,ai_can_simulate=false,
      ai_can_request_entry=false,approved_by=approver_id,approved_at=now(),
      review_notes=excluded.review_notes,updated_at=now()
    returning id into terms_id;

    update public.caravan_payment_options set status='em_revisao',ai_usable=false,
      review_notes='Entrada, parcelas, taxas e vencimentos ainda não foram confirmados.',updated_at=now()
    where organization_id=org_id and caravan_id=item.id;

    update public.knowledge_base_articles set
      content='Preço-base privado aprovado para '||item.name||': USD '||to_char(item.base_price,'FM999G999')||
        ' por pessoa. Informe somente em atendimento individual. As datas exatas são definidas e informadas três meses antes da viagem. Quando a Central Comercial informar um câmbio, ele fica congelado para a proposta durante sua validade registrada. Sem cotação aprovada, não converter nem estimar. Entrada, parcelas, taxas e vencimentos permanecem sob consulta; não inventar ou reutilizar condições de outra caravana.',
      source='Central Comercial — autorização de 03/09/2026',published=true,
      lifecycle_status='aprovado',usable_by_ai=true,responsible_id=approver_id,
      approved_by=approver_id,approved_at=now(),updated_at=now(),version=version+1
    where organization_id=org_id and title='Base oficial — '||item.name;

    update public.ai_test_scenarios set
      expected_behavior=jsonb_build_object('must_quote_currency','USD',
        'must_quote_amount',item.base_price,'must_use_source',true,'must_not_invent',true),
      updated_at=now()
    where organization_id=org_id and scenario_code='caravana-preco-'||item.slug;
  end loop;

end $$;

commit;
