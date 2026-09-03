begin;

do $$
declare org_id uuid; approver_id uuid; item record;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id from public.profiles where organization_id=org_id and active=true
    and role in('administrador','gestor') order by case when role='administrador' then 0 else 1 end limit 1;
  if org_id is null or approver_id is null then raise exception 'organizacao e aprovador sao obrigatorios'; end if;

  perform set_config('app.pricing_justification','Entrada de 10% do total em reais no câmbio inicial congelado, confirmada pela empresa em 03/09/2026.',true);
  for item in select c.id,c.name,t.reference_brl_total
    from public.caravans c join public.caravan_commercial_terms t on t.caravan_id=c.id
    where c.organization_id=org_id and t.status='aprovado'
  loop
    update public.caravan_commercial_terms set
      entry_currency='BRL',entry_amount=round(item.reference_brl_total*0.10,2),entry_counts_toward_total=true,
      ai_can_request_entry=true,approved_by=approver_id,approved_at=now(),
      review_notes='Entrada mínima de 10% do total em reais calculado pelo câmbio inicial congelado. Boleto mensal dinâmico até um mês antes; cartão depende da taxa administrativa vigente.',updated_at=now()
    where organization_id=org_id and caravan_id=item.id;

    update public.caravan_pricing set minimum_entry=round(item.reference_brl_total*0.10,2),updated_by=approver_id,updated_at=now()
      where organization_id=org_id and caravan_id=item.id and active=true;
    update public.payment_plan_rules set active=false,updated_at=now()
      where organization_id=org_id and caravan_id=item.id and active=true;
    insert into public.payment_plan_rules(organization_id,caravan_id,name,currency,
      minimum_entry_type,minimum_entry,minimum_installments,maximum_installments,
      interest_rate_monthly,fee_amount,first_due_days,due_day,active,conditions,created_by)
    values(org_id,item.id,'Entrada de 10% + boletos mensais até um mês antes','BRL','percentual',10,1,60,0,0,0,10,true,
      jsonb_build_object('initial_exchange_rate',5.40,'frozen_brl',item.reference_brl_total,
        'adjustment_months_before_departure',1,'entry_percent',10,'boleto_dynamic',true,
        'card_max_installments',10,'card_fee_required',true,'single_room_supplement_status','sob_consulta'),approver_id);

    update public.knowledge_base_articles set content=regexp_replace(content,
      'Entrada[^\n]*','Entrada: 10% do total em reais calculado pelo câmbio inicial congelado; faz parte do total.', 'g'),
      source='Central Comercial e contrato oficial — confirmação de 03/09/2026',version=version+1,
      approved_by=approver_id,approved_at=now(),updated_at=now()
    where organization_id=org_id and title='Base oficial — '||item.name;

    update public.ai_test_scenarios set expected_behavior=expected_behavior-
      'must_explain_entry_brl'||jsonb_build_object('must_explain_entry_percent',10,'must_calculate_from_frozen_brl',true),updated_at=now()
    where organization_id=org_id and scenario_code='caravana-pagamento-'||(select slug from public.caravans where id=item.id);
  end loop;

  update public.contract_templates set operationally_reviewed=true,
    operational_review_notes='PDF de 3 páginas conferido. A regra comercial agora respeita a cláusula 4.1: entrada mínima de 10% do total. Revisão jurídica formal permanece necessária antes da emissão final.',
    legal_review_required=true,status='em_revisao',updated_at=now()
  where organization_id=org_id and code='caravana-internacional';
end $$;

commit;
