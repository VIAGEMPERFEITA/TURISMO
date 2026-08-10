begin;

do $$
declare
  org_id uuid;
  caravan_id_value uuid;
  approver_id uuid;
  terms_id uuid;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into caravan_id_value from public.caravans
    where organization_id=org_id and slug='paris-egito-israel-marco-2027' limit 1;
  select id into approver_id from public.profiles
    where organization_id=org_id and active=true and role in('administrador','gestor')
    order by case when role='administrador' then 0 else 1 end,created_at limit 1;
  if org_id is null or caravan_id_value is null or approver_id is null then
    raise exception 'Organization, Paris caravan and approver are required';
  end if;

  update public.caravan_commercial_terms set
    duration_marketing_days=14,
    duration_itinerary_days=14,
    settlement_days_before_departure=40,
    entry_counts_toward_total=true,
    status='aprovado',
    ai_can_quote=true,
    ai_can_simulate=true,
    ai_can_request_entry=true,
    approved_by=approver_id,
    approved_at=now(),
    review_notes='Aprovado pela empresa: entrada abatida do total; duracao de 14 dias; quitacao e encontro de contas conforme contrato, ate 40 dias antes da saida. Vencimentos dependem da data oficial de embarque.',
    updated_at=now()
  where organization_id=org_id and caravan_id=caravan_id_value
  returning id into terms_id;
  if terms_id is null then raise exception 'Commercial terms not found'; end if;

  -- Plano integral no boleto: R$ 19.386,00 - R$ 1.000,00 = R$ 18.386,00.
  -- Oito parcelas iguais resultam em R$ 2.298,25.
  update public.caravan_payment_options set
    entry_amount=1000,
    boleto_installments=8,
    boleto_installment_amount=2298.25,
    card_installments=0,
    card_installment_amount=0,
    card_fee_included=true,
    expected_total=19386,
    status='aprovado',
    ai_usable=true,
    review_notes='Entrada de R$ 1.000,00 incluida no total + 8 boletos de R$ 2.298,25. A quantidade e os vencimentos devem respeitar quitacao integral 40 dias antes da saida.',
    updated_at=now()
  where organization_id=org_id and caravan_id=caravan_id_value and code='boleto';

  -- Plano misto: 40% do total no cartao e 60% entre entrada e boletos.
  -- Cartao: R$ 7.754,40 / 10 = R$ 775,44, antes das taxas.
  -- Entrada + boletos: R$ 11.631,60; abatida a entrada, 8 x R$ 1.328,95.
  update public.caravan_payment_options set
    entry_amount=1000,
    boleto_installments=8,
    boleto_installment_amount=1328.95,
    card_installments=10,
    card_installment_amount=775.44,
    card_fee_included=false,
    expected_total=19386,
    status='aprovado',
    ai_usable=true,
    review_notes='Entrada de R$ 1.000,00 + 8 boletos de R$ 1.328,95 + 40% do total no cartao em ate 10 x R$ 775,44. Taxas da operadora sao acrescentadas no momento da transacao. Vencimentos devem respeitar quitacao integral 40 dias antes da saida.',
    updated_at=now()
  where organization_id=org_id and caravan_id=caravan_id_value and code='boleto_cartao';

  if exists(
    select 1 from public.caravan_payment_options
    where organization_id=org_id and caravan_id=caravan_id_value and status='aprovado'
      and abs(computed_total-expected_total)>=0.01
  ) then
    raise exception 'Approved payment composition does not reconcile with total';
  end if;

  update public.contract_templates set
    variable_schema=variable_schema || jsonb_build_object(
      'commercial_rules',jsonb_build_object(
        'duration_days',14,
        'settlement_days_before_departure',40,
        'entry_counts_toward_total',true,
        'card_share_percent',40,
        'card_max_installments',10,
        'card_fees','acrescidas no momento da transacao',
        'exchange_adjustment','encontro de contas conforme cambio aprovado, ate 40 dias antes da saida'
      )
    ),
    updated_at=now()
  where organization_id=org_id and code='caravana-internacional' and version=1;

  update public.knowledge_base_articles set
    content='Caravana Paris, Egito e Israel em marco de 2027, com duracao oficial de 14 dias. Experiencia espiritual, historica e cultural com Paris, Cairo, Piramides de Gize, Esfinge, Monte Sinai e locais biblicos de Israel, incluindo Jerusalem, Galileia, Rio Jordao, Nazare, Belem, Getsemani, Monte das Oliveiras, Via Dolorosa e Tumulo Vazio. Ha acompanhamento da equipe Viagem Perfeita, pastores e guias especializados. O cronograma detalhado deve seguir o roteiro oficial vigente.',
    updated_at=now(),version=version+1
  where organization_id=org_id and title='Caravana Paris, Egito e Israel - marco de 2027';

  update public.knowledge_base_articles set
    content='Preco-base: USD 3.590 por pessoa. Referencia inicial: cambio 5,40 e total de R$ 19.386,00. A entrada de R$ 1.000,00 faz parte do total. Opcao boleto: entrada + 8 parcelas de R$ 2.298,25. Opcao boleto e cartao: entrada + 8 boletos de R$ 1.328,95 + aproximadamente 40% do total no cartao, em ate 10 parcelas de R$ 775,44 antes das taxas da operadora. As taxas do cartao sao calculadas no momento da transacao. A quantidade e as datas de vencimento devem ser ajustadas para que todo o pacote esteja quitado ate 40 dias antes da saida. O encontro de contas cambial ocorre conforme contrato e cambio aprovado para o periodo; nunca invente cotacao futura. PIX e comprovante so entram no fluxo apos pedido explicito de reserva e pelo processo seguro. As demais caravanas permanecem sem preco ate cadastro oficial.',
    updated_at=now(),version=version+1
  where organization_id=org_id and title='Preco-base e politica cambial - Paris, Egito e Israel 2027';
end $$;

commit;
