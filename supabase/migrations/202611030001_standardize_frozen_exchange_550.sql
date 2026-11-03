begin;

do $$
declare
  org_id uuid;
  approver_id uuid;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id from public.profiles where organization_id=org_id and active=true
    and role in('administrador','gestor')
    order by case when role='administrador' then 0 else 1 end limit 1;
  if org_id is null or approver_id is null then
    raise exception 'organizacao e aprovador sao obrigatorios';
  end if;

  perform set_config(
    'app.pricing_justification',
    'Câmbio inicial congelado padronizado em R$ 5,50 e entrada mantida em 10%, conforme confirmação da empresa em 03/11/2026.',
    true
  );

  update public.caravan_commercial_terms set
    reference_exchange_rate=5.50,
    reference_brl_total=round(base_price*5.50,2),
    entry_currency='BRL',
    entry_amount=round(base_price*5.50*0.10,2),
    entry_counts_toward_total=true,
    exchange_adjustment_policy='Câmbio inicial congelado em R$ 5,50. Um mês antes do embarque, realizar o acerto cambial conforme o contrato da viagem e a cotação definida e aprovada pela empresa. Diferença positiva vira saldo adicional e diferença negativa vira crédito ou redução. Nenhuma cobrança ou crédito é aplicado sem aprovação administrativa.',
    settlement_days_before_departure=30,
    ai_can_quote=true,
    ai_can_request_entry=true,
    approved_by=approver_id,
    approved_at=now(),
    review_notes='Preço em USD convertido pelo câmbio inicial congelado de R$ 5,50. Entrada mínima de 10% do total em reais. Boletos mensais até um mês antes; saldo restante pode ser passado no cartão em até 10 vezes, com taxas da maquininha incluídas no momento da transação.',
    updated_at=now()
  where organization_id=org_id and status='aprovado' and base_currency='USD';

  update public.caravan_pricing p set
    minimum_entry=round(t.base_price*5.50*0.10,2),
    updated_by=approver_id,
    updated_at=now()
  from public.caravan_commercial_terms t
  where p.organization_id=org_id and p.caravan_id=t.caravan_id and p.active=true
    and t.organization_id=org_id and t.status='aprovado' and t.base_currency='USD';

  update public.payment_plan_rules r set
    name='Entrada de 10% + boletos mensais até um mês antes + saldo no cartão',
    minimum_entry_type='percentual',
    minimum_entry=10,
    conditions=jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(r.conditions,'{}'::jsonb),'{initial_exchange_rate}','5.50'::jsonb,true),
        '{frozen_brl}',to_jsonb(round(t.base_price*5.50,2)),true
      ),
      '{entry_percent}','10'::jsonb,true
    ) || jsonb_build_object(
      'adjustment_months_before_departure',1,
      'boleto_dynamic',true,
      'card_max_installments',10,
      'card_fee_required',true
    ),
    updated_at=now()
  from public.caravan_commercial_terms t
  where r.organization_id=org_id and r.caravan_id=t.caravan_id and r.active=true
    and t.organization_id=org_id and t.status='aprovado' and t.base_currency='USD';

  update public.knowledge_base_articles set
    content=replace(replace(content,'R$ 5,40','R$ 5,50'),'5,40','5,50'),
    source='Central Comercial e contrato oficial — confirmação de 03/11/2026',
    version=version+1,
    approved_by=approver_id,
    approved_at=now(),
    updated_at=now()
  where organization_id=org_id
    and (content like '%5,40%' or content like '%R$ 5,40%');
end $$;

commit;
