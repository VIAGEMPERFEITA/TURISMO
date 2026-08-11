begin;

-- Termos comerciais misturam moedas e exigem governanca propria. O preco oficial
-- permanece em USD; entrada, PIX e referencia cambial permanecem em BRL.
create table if not exists public.caravan_commercial_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  caravan_id uuid not null references public.caravans(id) on delete cascade,
  base_currency text not null check(base_currency ~ '^[A-Z]{3}$'),
  base_price numeric(14,2) not null check(base_price>=0),
  reference_exchange_rate numeric(14,6) check(reference_exchange_rate is null or reference_exchange_rate>0),
  reference_brl_total numeric(14,2) check(reference_brl_total is null or reference_brl_total>=0),
  entry_currency text not null default 'BRL' check(entry_currency ~ '^[A-Z]{3}$'),
  entry_amount numeric(14,2) not null default 0 check(entry_amount>=0),
  entry_counts_toward_total boolean not null default true,
  exchange_adjustment_month date,
  exchange_adjustment_policy text,
  settlement_days_before_departure integer check(settlement_days_before_departure between 1 and 365),
  card_max_installments integer check(card_max_installments between 1 and 36),
  card_fee_policy text,
  pix_key text,
  pix_holder text,
  duration_marketing_days integer check(duration_marketing_days between 1 and 365),
  duration_itinerary_days integer check(duration_itinerary_days between 1 and 365),
  status text not null default 'em_revisao'
    check(status in('rascunho','em_revisao','aprovado','suspenso','arquivado')),
  ai_can_quote boolean not null default false,
  ai_can_simulate boolean not null default false,
  ai_can_request_entry boolean not null default false,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,caravan_id),
  check(status<>'aprovado' or (approved_by is not null and approved_at is not null)),
  check(not ai_can_request_entry or (status='aprovado' and ai_can_simulate))
);

create table if not exists public.caravan_payment_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  caravan_id uuid not null references public.caravans(id) on delete cascade,
  commercial_terms_id uuid not null references public.caravan_commercial_terms(id) on delete cascade,
  code text not null,
  name text not null,
  entry_amount numeric(14,2) not null default 0 check(entry_amount>=0),
  boleto_installments integer not null default 0 check(boleto_installments between 0 and 60),
  boleto_installment_amount numeric(14,2) not null default 0 check(boleto_installment_amount>=0),
  card_installments integer not null default 0 check(card_installments between 0 and 36),
  card_installment_amount numeric(14,2) not null default 0 check(card_installment_amount>=0),
  card_fee_included boolean not null default false,
  computed_total numeric(14,2) generated always as
    (entry_amount + boleto_installments*boleto_installment_amount + card_installments*card_installment_amount) stored,
  expected_total numeric(14,2) not null check(expected_total>=0),
  status text not null default 'em_revisao'
    check(status in('rascunho','em_revisao','aprovado','suspenso','arquivado')),
  ai_usable boolean not null default false,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,caravan_id,code),
  check(not ai_usable or (status='aprovado' and abs(computed_total-expected_total)<0.01))
);

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  version integer not null default 1 check(version>0),
  source_filename text,
  source_sha256 text,
  private_storage_path text,
  variable_schema jsonb not null default '{}'::jsonb,
  legal_review_required boolean not null default true,
  status text not null default 'em_revisao'
    check(status in('rascunho','em_revisao','aprovado','suspenso','arquivado')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code,version),
  check(status<>'aprovado' or (approved_by is not null and approved_at is not null))
);

create table if not exists public.contract_generation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  caravan_id uuid not null references public.caravans(id) on delete restrict,
  template_id uuid not null references public.contract_templates(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  variables jsonb not null,
  status text not null default 'pendente'
    check(status in('pendente','bloqueado','gerando','gerado','enviado','assinado','falhou','cancelado')),
  blocking_reasons text[] not null default '{}'::text[],
  generated_document_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caravan_commercial_terms_lookup_idx
  on public.caravan_commercial_terms(organization_id,caravan_id,status);
create index if not exists caravan_payment_options_lookup_idx
  on public.caravan_payment_options(organization_id,caravan_id,status,ai_usable);
create index if not exists contract_generation_requests_queue_idx
  on public.contract_generation_requests(organization_id,status,created_at);

alter table public.caravan_commercial_terms enable row level security;
alter table public.caravan_payment_options enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contract_generation_requests enable row level security;

create policy caravan_commercial_terms_staff_read on public.caravan_commercial_terms
  for select to authenticated using(organization_id=public.current_organization_id());
create policy caravan_commercial_terms_managers_write on public.caravan_commercial_terms
  for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy caravan_payment_options_staff_read on public.caravan_payment_options
  for select to authenticated using(organization_id=public.current_organization_id());
create policy caravan_payment_options_managers_write on public.caravan_payment_options
  for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy contract_templates_staff_read on public.contract_templates
  for select to authenticated using(organization_id=public.current_organization_id());
create policy contract_templates_managers_write on public.contract_templates
  for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy contract_generation_requests_staff_read on public.contract_generation_requests
  for select to authenticated using(organization_id=public.current_organization_id());
create policy contract_generation_requests_staff_insert on public.contract_generation_requests
  for insert to authenticated
  with check(organization_id=public.current_organization_id());
create policy contract_generation_requests_managers_update on public.contract_generation_requests
  for update to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

do $$
declare
  org_id uuid;
  caravan_record public.caravans%rowtype;
  approver_id uuid;
  terms_id uuid;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select * into caravan_record from public.caravans
    where organization_id=org_id and slug='paris-egito-israel-marco-2027' limit 1;
  select id into approver_id from public.profiles
    where organization_id=org_id and active=true and role in('administrador','gestor')
    order by case when role='administrador' then 0 else 1 end,created_at limit 1;
  if org_id is null or caravan_record.id is null or approver_id is null then
    raise exception 'Organization, Paris caravan and approver are required';
  end if;

  -- Somente esta caravana recebe preco. A IA pode cotar USD 3.590, mas nao pode
  -- simular/cobrar enquanto entrada, parcelas, duracao e prazo contratual divergirem.
  insert into public.caravan_commercial_terms(
    organization_id,caravan_id,base_currency,base_price,reference_exchange_rate,
    reference_brl_total,entry_currency,entry_amount,entry_counts_toward_total,
    exchange_adjustment_month,exchange_adjustment_policy,settlement_days_before_departure,
    card_max_installments,card_fee_policy,pix_key,pix_holder,duration_marketing_days,
    duration_itinerary_days,status,ai_can_quote,ai_can_simulate,ai_can_request_entry,
    approved_by,approved_at,review_notes
  ) values (
    org_id,caravan_record.id,'USD',3590,5.40,19386,'BRL',1000,true,
    date '2027-02-01',
    'Em fevereiro de 2027 ocorre o encontro de contas pelo cambio oficial aprovado para a caravana; diferencas devem ser registradas e explicadas antes da cobranca.',
    30,10,'Ate 10 parcelas; taxas da operadora/maquininha sao calculadas e informadas no momento da transacao.',
    '28.279.846/0001-21','VP TURISMO E EVENTOS',13,14,
    'em_revisao',true,false,false,null,null,
    'Bloqueado para simulacao e cobranca: parcelas fornecidas somam R$ 19.386 antes da entrada; confirmar se a entrada esta incluida. Confirmar tambem 13 versus 14 dias e prazo contratual de 30 versus 40 dias.'
  )
  on conflict(organization_id,caravan_id) do update set
    base_currency=excluded.base_currency,base_price=excluded.base_price,
    reference_exchange_rate=excluded.reference_exchange_rate,
    reference_brl_total=excluded.reference_brl_total,entry_currency=excluded.entry_currency,
    entry_amount=excluded.entry_amount,entry_counts_toward_total=excluded.entry_counts_toward_total,
    exchange_adjustment_month=excluded.exchange_adjustment_month,
    exchange_adjustment_policy=excluded.exchange_adjustment_policy,
    settlement_days_before_departure=excluded.settlement_days_before_departure,
    card_max_installments=excluded.card_max_installments,card_fee_policy=excluded.card_fee_policy,
    pix_key=excluded.pix_key,pix_holder=excluded.pix_holder,
    duration_marketing_days=excluded.duration_marketing_days,
    duration_itinerary_days=excluded.duration_itinerary_days,status='em_revisao',
    ai_can_quote=true,ai_can_simulate=false,ai_can_request_entry=false,
    approved_by=null,approved_at=null,review_notes=excluded.review_notes,updated_at=now()
  returning id into terms_id;

  insert into public.caravan_payment_options(
    organization_id,caravan_id,commercial_terms_id,code,name,entry_amount,
    boleto_installments,boleto_installment_amount,card_installments,
    card_installment_amount,card_fee_included,expected_total,status,ai_usable,review_notes
  ) values
    (org_id,caravan_record.id,terms_id,'boleto','Boleto bancario',1000,8,2423.25,0,0,true,19386,'em_revisao',false,
     'Total informado com entrada resulta em R$ 20.386,00; nao usar ate correcao.'),
    (org_id,caravan_record.id,terms_id,'boleto_cartao','Boleto + cartao',1000,8,1069.30,10,1083.16,false,19386,'em_revisao',false,
     'Total informado com entrada resulta em R$ 20.386,00, sem taxas; nao usar ate correcao.')
  on conflict(organization_id,caravan_id,code) do update set
    commercial_terms_id=excluded.commercial_terms_id,name=excluded.name,
    entry_amount=excluded.entry_amount,boleto_installments=excluded.boleto_installments,
    boleto_installment_amount=excluded.boleto_installment_amount,
    card_installments=excluded.card_installments,
    card_installment_amount=excluded.card_installment_amount,
    card_fee_included=excluded.card_fee_included,expected_total=excluded.expected_total,
    status='em_revisao',ai_usable=false,review_notes=excluded.review_notes,updated_at=now();

  insert into public.contract_templates(
    organization_id,code,name,version,source_filename,source_sha256,variable_schema,
    legal_review_required,status
  ) values (
    org_id,'caravana-internacional','Contrato de prestacao de servicos turisticos - caravanas internacionais',1,
    'Contrato_marco_2027 (1).pdf','5d05198633316e9e28386f78b007497716f0f3df2e811800a4e84d35b0353517',
    jsonb_build_object(
      'required',jsonb_build_array('contract_number','traveler','caravan','price','payment_plan','exchange_policy','departure','return'),
      'traveler',jsonb_build_array('full_name','nationality','marital_status','profession','rg','cpf','address','email','phone'),
      'caravan',jsonb_build_array('name','destinations','duration','included','not_included'),
      'commercial',jsonb_build_array('base_currency','base_price','entry_amount','installments','card_fees','exchange_adjustment')
    ),true,'em_revisao'
  ) on conflict(organization_id,code,version) do update set
    source_filename=excluded.source_filename,source_sha256=excluded.source_sha256,
    variable_schema=excluded.variable_schema,
    legal_review_required=true,status='em_revisao',approved_by=null,approved_at=null,updated_at=now();

  insert into public.knowledge_base_articles(
    organization_id,title,category,content,source,source_url,version,approved_by,
    approved_at,published,audience,valid_from,lifecycle_status,usable_by_ai,responsible_id
  ) values
  (org_id,'Caravana Paris, Egito e Israel - marco de 2027','caravana',
   'Caravana Paris, Egito e Israel em marco de 2027. Experiencia espiritual, historica e cultural com Paris, Cairo, Piramides de Gize, Esfinge, Monte Sinai e locais biblicos de Israel, incluindo Jerusalem, Galileia, Rio Jordao, Nazare, Belem, Getsemani, Monte das Oliveiras, Via Dolorosa e Tumulo Vazio. Ha acompanhamento da equipe Viagem Perfeita, pastores e guias especializados. O material comercial descreve 13 dias de experiencia; o roteiro operacional cadastrado contem 14 dias incluindo deslocamentos. Se o cliente pedir a contagem exata, informe que a equipe confirmara o cronograma oficial antes da assinatura.',
   'Material comercial aprovado pela Viagem Perfeita','https://www.viagemperfeitaturismo.com.br/caravanas/paris-egito-israel-marco-2027/',1,approver_id,now(),true,'externo',now(),'aprovado',true,approver_id),
  (org_id,'Inclusoes - Paris, Egito e Israel marco de 2027','caravana_inclusoes',
   'Inclui passagem aerea internacional ida e volta saindo de Sao Paulo; passeios em Paris; acompanhamento da equipe Viagem Perfeita; traslados aeroporto-hotel; onibus executivo com ar-condicionado e Wi-Fi; guias locais em portugues; hoteis 3 e 4 estrelas; cafe da manha em Paris; meia pensao no Egito e em Israel; acomodacao dupla ou tripla; entradas conforme roteiro; roteiro exclusivo; kit Viagem Perfeita; seguro viagem com cobertura medica internacional. Nao prometa item que nao conste nesta lista ou no roteiro oficial vigente.',
   'Material comercial aprovado pela Viagem Perfeita','https://www.viagemperfeitaturismo.com.br/caravanas/paris-egito-israel-marco-2027/',1,approver_id,now(),true,'externo',now(),'aprovado',true,approver_id),
  (org_id,'Preco-base e politica cambial - Paris, Egito e Israel 2027','caravana_preco',
   'Preco-base aprovado para comunicacao: USD 3.590 por pessoa. Referencia comercial inicial: cambio 5,40 e total de referencia R$ 19.386,00. Em fevereiro de 2027 deve ocorrer encontro de contas com o cambio oficial aprovado para a caravana. A IA pode informar o preco-base e explicar que havera ajuste, mas nao pode calcular ajuste futuro, confirmar parcelas, enviar PIX, confirmar pagamento, reservar vaga ou gerar contrato enquanto os termos comerciais estiverem em revisao. As demais caravanas permanecem sem preco ate cadastro oficial.',
   'Condicao comercial informada pela Viagem Perfeita',null,1,approver_id,now(),true,'externo',now(),'aprovado',true,approver_id),
  (org_id,'Coleta segura de dados para reserva e contrato','reserva_privacidade',
   'Depois que o cliente escolher seguir com a reserva, explique os dados necessarios, mas envie um link seguro e individual do CRM para coleta. Nao solicite em mensagem comum foto de passaporte, numero completo do passaporte, RG ou CPF. O fluxo seguro pode coletar nome completo, nascimento, RG, CPF, endereco, CEP, email, telefone e documento de viagem, com consentimento e controle de acesso. Comprovante PIX deve ser enviado pelo canal seguro e somente a equipe autorizada confirma o recebimento.',
   'Politica operacional e de privacidade Viagem Perfeita','https://www.viagemperfeitaturismo.com.br/politica-de-privacidade/',1,approver_id,now(),true,'externo',now(),'aprovado',true,approver_id)
  on conflict do nothing;
end $$;

commit;
