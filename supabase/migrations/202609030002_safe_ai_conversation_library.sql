begin;

create table if not exists public.ai_intent_definitions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intent text not null,
  sample_utterances jsonb not null check(jsonb_typeof(sample_utterances)='array' and jsonb_array_length(sample_utterances)>=10),
  required_context jsonb not null default '[]'::jsonb,
  answer_templates jsonb not null default '[]'::jsonb,
  official_data_source text not null,
  freshness_rule text not null,
  handoff_rule text not null,
  next_best_question text not null,
  active boolean not null default true,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,intent),
  check(not active or (approved_by is not null and approved_at is not null))
);

alter table public.ai_intent_definitions enable row level security;
create policy ai_intent_definitions_staff_read on public.ai_intent_definitions
  for select to authenticated using(organization_id=public.current_organization_id());
create policy ai_intent_definitions_managers_write on public.ai_intent_definitions
  for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

do $$
declare org_id uuid; approver_id uuid; row_data record; samples jsonb;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id from public.profiles where organization_id=org_id and active=true
    and role in('administrador','gestor') order by case when role='administrador' then 0 else 1 end limit 1;
  if org_id is null or approver_id is null then raise exception 'organizacao e aprovador sao obrigatorios'; end if;

  for row_data in select * from (values
    ('preco','o preço desta caravana','caravan_pricing','caravana, ano e acomodação','Qual caravana e ano você deseja consultar?','Informar o preço privado vigente em atendimento individual; sem fonte ativa, transferir.'),
    ('pagamento','as formas de pagamento','caravan_commercial_terms e caravan_payment_options','caravana e proposta','Você prefere boleto, Pix ou cartão?','Só detalhar entrada, parcelas, taxas e vencimentos quando todos estiverem aprovados.'),
    ('disponibilidade','a disponibilidade da caravana','caravans.status_public','caravana e ano','Qual saída você deseja consultar?','Informar apenas o estado oficial, nunca quantidade de vagas.'),
    ('datas','as datas da viagem','caravans','caravana e ano','Qual caravana e ano você tem em mente?','Sem dias aprovados, informar mês/ano e que as datas exatas são definidas três meses antes.'),
    ('embarque_gru','o embarque em Guarulhos','caravans.departure_city','caravana e cidade de origem','De qual cidade você virá?','Não prometer trecho doméstico sem inclusão oficial.'),
    ('roteiro','o roteiro e as cidades visitadas','caravan_itinerary_days','caravana e ano','Você quer um resumo ou o roteiro completo disponível?','Não transformar resumo em roteiro definitivo.'),
    ('hospedagem','os hotéis e a alimentação','caravans e ficha oficial','caravana e ano','Você tem preferência de acomodação?','Não prometer hotel, categoria ou refeição ausente.'),
    ('quarto_individual','quarto individual e suplemento','caravan_pricing','caravana e acomodação','Você prefere quarto individual ou aceita compartilhar?','Sem suplemento aprovado, transferir.'),
    ('inclusoes','o que está incluído e não incluído','caravans.included e not_included','caravana e ano','Quer que eu detalhe também os itens não incluídos?','Usar somente a ficha da caravana selecionada.'),
    ('bagagem_voo','bagagem, companhia aérea e assento','ficha operacional da caravana','caravana e ano','Qual informação do voo você precisa primeiro?','Sem operação confirmada, transferir e não inferir.'),
    ('acompanhamento','o acompanhamento em português','ficha oficial da caravana','caravana','Você quer saber sobre acompanhamento ou guia local?','Não prometer nome de guia ou líder ausente.'),
    ('seguro_viagem','o seguro-viagem','ficha oficial da caravana','caravana e passageiro','Você quer saber se está incluído ou entender a cobertura?','Não interpretar cobertura; transferir casos específicos.'),
    ('documentacao','passaporte, visto ou vacina','base documental oficial','caravana e nacionalidade','Qual é a nacionalidade do passageiro?','Dupla cidadania, menor ou situação migratória especial exige humano.'),
    ('seguranca','a segurança no destino','fontes oficiais e operação local','caravana e preocupação','Qual é sua principal preocupação sobre segurança?','Não garantir segurança absoluta nem prever conflitos.'),
    ('primeira_viagem','a primeira viagem internacional','playbook de atendimento','caravana e necessidade','Qual parte da preparação mais preocupa você?','Acolher sem prometer serviço não cadastrado.'),
    ('acessibilidade','idade, esforço físico ou mobilidade','ficha de acessibilidade','caravana e necessidade funcional','A pessoa precisa de algum apoio específico?','Não fazer avaliação médica; necessidade relevante exige humano.'),
    ('restricao_alimentar','restrição alimentar','ficha operacional e fornecedores','caravana e restrição','Qual é a restrição alimentar?','Registrar para validação, sem garantir atendimento integral.'),
    ('experiencia_espiritual','batismo, votos ou experiência espiritual','roteiro oficial','caravana e experiência','Qual experiência é mais importante para você?','Só confirmar atividades presentes no roteiro aprovado.'),
    ('lider_grupo','montar uma caravana própria','CRM de grupos','nome, organização, cidade e estimativa','Você já tem um grupo ou está apresentando a ideia?','Qualificar gradualmente e transferir para Matheus ou Tamara.'),
    ('viagem_personalizada','uma viagem personalizada','CRM de interesses','destino, período e viajantes','Qual destino você imagina para essa viagem?','Registrar interesse e transferir para elaboração humana.'),
    ('cadastro_pre_reserva','cadastro ou pré-reserva','CRM e reservations','consentimento, caravana e cliente','Posso iniciar sua pré-reserva com os dados necessários?','Pré-reserva nunca significa reserva confirmada.'),
    ('contrato','o contrato da viagem','contract_templates e proposta','cliente autenticado, reserva e proposta','Você quer entender uma cláusula ou solicitar a preparação?','Interpretação, exceção ou alteração jurídica exige humano.'),
    ('boleto_pix','boleto, Pix ou comprovante','financeiro e proposta','cliente autenticado, reserva e plano','Posso confirmar primeiro a caravana e o plano escolhido?','Nunca pedir senha, CVV, token ou código bancário.'),
    ('status_parcela','parcela paga, atrasada ou com erro','payments','cliente autenticado e reserva','Você consegue identificar a reserva sem enviar dados sensíveis?','Cobrança divergente ou pagamento não localizado exige humano.'),
    ('cancelamento','cancelamento ou reembolso','contrato e pagamentos da reserva','cliente autenticado e reserva','Vou organizar o contexto para a equipe; qual reserva está envolvida?','Nunca calcular multa ou prometer reembolso automaticamente.'),
    ('atendimento_humano','falar com uma pessoa','filas e perfis ativos','cliente e assunto','Qual ponto você quer que eu destaque para a equipe?','Transferir imediatamente com resumo completo.'),
    ('reclamacao','uma reclamação ou cliente irritado','conversa e CRM','cliente, assunto e urgência','O que aconteceu para eu encaminhar corretamente?','Transferência imediata com prioridade alta.'),
    ('emergencia','uma emergência durante a viagem','conversa, reserva e plantão','cliente, localização e urgência','Você está em segurança neste momento?','Transferência imediata; não substituir serviços de emergência.'),
    ('pos_venda','o acompanhamento após a reserva','CRM, reserva, pagamentos e documentos','cliente autenticado e reserva','Qual etapa da sua viagem você quer acompanhar?','Dados privados somente após autenticação.'),
    ('desconto','desconto ou condição especial','tabela comercial aprovada','caravana e proposta','Posso verificar se existe uma condição vigente?','Nunca conceder desconto não autorizado.')
  ) as x(intent,topic,source,context,next_question,handoff) loop
    samples:=jsonb_build_array(
      'Quero saber sobre '||row_data.topic||'.','Pode me explicar '||row_data.topic||'?',
      'Como funciona '||row_data.topic||'?','Tenho uma dúvida sobre '||row_data.topic||'.',
      'Me passa informações sobre '||row_data.topic||'.','Preciso entender '||row_data.topic||'.',
      'E sobre '||row_data.topic||'?','Você consegue verificar '||row_data.topic||'?',
      'Gostaria de confirmar '||row_data.topic||'.','Pode conferir para mim '||row_data.topic||'?'
    );
    insert into public.ai_intent_definitions(organization_id,intent,sample_utterances,required_context,
      answer_templates,official_data_source,freshness_rule,handoff_rule,next_best_question,active,approved_by,approved_at)
    values(org_id,row_data.intent,samples,to_jsonb(string_to_array(row_data.context,', ')),
      jsonb_build_array('Responder primeiro ao pedido com naturalidade e usar somente a fonte oficial.'),
      row_data.source,'Exigir registro aprovado e vigente; dado ausente, vencido ou conflitante não pode ser inferido.',
      row_data.handoff,row_data.next_question,true,approver_id,now())
    on conflict(organization_id,intent) do update set sample_utterances=excluded.sample_utterances,
      required_context=excluded.required_context,answer_templates=excluded.answer_templates,
      official_data_source=excluded.official_data_source,freshness_rule=excluded.freshness_rule,
      handoff_rule=excluded.handoff_rule,next_best_question=excluded.next_best_question,
      active=true,approved_by=approver_id,approved_at=now(),updated_at=now();
  end loop;

  insert into public.knowledge_base_articles(organization_id,title,category,content,source,source_url,
    version,approved_by,approved_at,published,audience,valid_from,lifecycle_status,usable_by_ai,responsible_id)
  values(org_id,'Biblioteca humanizada de atendimento e transferência','atendimento_ia',
    'Responda primeiro ao que o cliente perguntou e faça uma pergunta por vez. Use português brasileiro natural, mensagens curtas e o primeiro nome com moderação. Não repita apresentação, não pareça menu, não use emojis em todas as mensagens, reconheça medo, entusiasmo, dúvida e dificuldade financeira sem pressão ou urgência falsa. Preserve fatos já informados. Se mudar a caravana, confirme e limpe apenas fatos específicos da anterior. Antes de coletar dados, explique a finalidade e obtenha consentimento. Pré-reserva não é confirmação. Nunca exiba CPF ou passaporte completos. Transfira a Matheus Oliveira ou Tamara Scarllat em pedido humano, dado ausente ou vencido, negociação fora da tabela, cancelamento, reembolso, erro de cobrança, fraude, Procon, processo, chargeback, emergência, irritação, saúde, mobilidade, documentação complexa ou após três tentativas sem compreender. O resumo deve conter cliente, contato, caravana, viajantes, assunto, informações já passadas, dúvida, pagamento, sentimento, urgência e próxima ação.',
    'Política de atendimento aprovada em 03/09/2026','https://www.viagemperfeitaturismo.com.br/',1,
    approver_id,now(),true,'ambos',now(),'aprovado',true,approver_id)
  on conflict do nothing;

  insert into public.ai_test_scenarios(organization_id,scenario_code,category,title,input_message,expected_behavior,critical)
  select org_id,'intent-library-'||intent,'intencao','Biblioteca — '||intent,
    sample_utterances->>0,jsonb_build_object('intent',intent,'must_use_source',true,
      'one_question_at_a_time',true,'handoff_rule',handoff_rule),
    intent in('preco','pagamento','documentacao','contrato','boleto_pix','status_parcela','cancelamento','reclamacao','emergencia')
  from public.ai_intent_definitions where organization_id=org_id and active=true
  on conflict(organization_id,scenario_code) do update set input_message=excluded.input_message,
    expected_behavior=excluded.expected_behavior,critical=excluded.critical,active=true,updated_at=now();
end $$;

commit;
