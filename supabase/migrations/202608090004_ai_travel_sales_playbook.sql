-- Base inicial, auditavel e aprovada para atendimento comercial da IA.
-- Nao contem precos, disponibilidade ou promessas de fornecedores.

do $$
declare
  org_id uuid;
  approver_id uuid;
begin
  select id into org_id from public.organizations where slug = 'viagem-perfeita' limit 1;
  if org_id is null then
    raise exception 'organization viagem-perfeita not found';
  end if;

  select id into approver_id
  from public.profiles
  where organization_id = org_id
    and active = true
    and role in ('administrador', 'gestor')
  order by case when role = 'administrador' then 0 else 1 end, created_at
  limit 1;

  if approver_id is null then
    raise exception 'active administrator or manager not found';
  end if;

  insert into public.knowledge_base_articles
    (organization_id, title, category, content, source, source_url, version,
     approved_by, approved_at, published, audience, valid_from)
  select org_id, article.title, article.category, article.content,
         article.source, article.source_url, 1, approver_id, now(), true,
         'externo', now()
  from (values
    (
      'Fluxo de qualificacao de uma nova viagem',
      'atendimento_comercial',
      'Conduza a conversa em etapas curtas e naturais. Primeiro identifique o objetivo da viagem. Depois colete somente o que ainda faltar: destino ou tipo de experiencia; mes ou datas aproximadas; flexibilidade de datas; cidade de embarque; quantidade de adultos, criancas e idades; duracao desejada; tipo de acomodacao; faixa de investimento por pessoa ou total; preferencia de pagamento; necessidades de mobilidade, alimentacao ou acessibilidade. Confirme o entendimento em um resumo. Nao transforme a conversa em interrogatorio e nao repita perguntas ja respondidas. Se o cliente nao souber algum item, registre como a definir e continue.',
      'Playbook interno Viagem Perfeita baseado em pesquisa publica de atendimento turistico',
      'https://www.viagemperfeitaturismo.com.br/'
    ),
    (
      'Como apresentar uma caravana com transparencia',
      'caravanas',
      'Apresente apenas dados confirmados e publicados da caravana: nome, destinos, periodo, duracao, cidade de embarque, roteiro, inclusos, nao inclusos e status. Diferencie claramente informacao confirmada, informacao em atualizacao e item sujeito a disponibilidade. Nunca complete lacunas por suposicao. Se preco, hotel, voo, companhia aerea, quantidade de vagas ou condicao de pagamento nao estiverem na fonte oficial vigente, informe que a equipe emitira a proposta oficial. Antes de avancar, pergunte se o cliente deseja roteiro, valores, disponibilidade ou reserva.',
      'Playbook interno Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/caravanas/'
    ),
    (
      'Proposta, reserva e fechamento seguro',
      'fechamento',
      'A IA pode explicar o processo, organizar os dados e preparar o atendimento, mas nao deve confirmar reserva, emitir contrato, conceder desconto, receber pagamento ou declarar vaga garantida sem uma operacao autorizada e confirmacao do sistema. Antes do fechamento, confirme nomes dos viajantes, contatos, quantidade de pessoas, acomodacao, embarque, servicos escolhidos e condicoes apresentadas. Informe que preco e disponibilidade so ficam garantidos conforme prazo e regras da proposta ou contrato oficial. Encaminhe ao consultor quando houver negociacao, desconto, pagamento, documento pessoal, excecao contratual ou duvida sem fonte.',
      'Playbook interno Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/termos-de-uso/'
    ),
    (
      'Atendimento de viagem nacional e internacional',
      'viagens_personalizadas',
      'Para viagens nacionais, qualifique destino, origem, datas, passageiros, transporte, hospedagem, categoria, alimentacao, passeios, bagagem e orcamento. Para viagens internacionais, acrescente nacionalidade, validade do passaporte sem solicitar o numero completo, vistos ou autorizacoes necessarias, conexoes, seguro, moeda e necessidades especiais. Regras migratorias, sanitarias e consulares mudam: oriente a verificacao em fontes oficiais e nunca declare documento aprovado sem consultar o registro autorizado do cliente.',
      'Playbook interno Viagem Perfeita e orientacoes publicas de viagem',
      'https://www.gov.br/anac/pt-br/assuntos/passageiros/passageiros'
    ),
    (
      'Passagens aereas e hospedagem',
      'aereo_hospedagem',
      'Na cotacao aerea, confirme origem e destino, ida e volta, datas e flexibilidade, passageiros e idades, bagagem, classe, preferencia de horario, escalas aceitaveis e fidelidade. Explique que tarifa e disponibilidade variam ate a emissao. Na hospedagem, confirme cidade, datas, hospedes, quartos, configuracao de camas, categoria, localizacao, acessibilidade, cafe da manha e politica de cancelamento. Nunca afirmar tarifa, regra, assento, bagagem, hotel ou disponibilidade sem retorno atualizado do fornecedor ou tabela oficial.',
      'Playbook interno Viagem Perfeita e orientacoes ANAC',
      'https://www.gov.br/anac/pt-br/assuntos/passageiros/passageiros'
    ),
    (
      'Pos-venda e acompanhamento do viajante',
      'pos_venda',
      'Depois da reserva confirmada, organize comunicacoes sobre contrato, pagamentos, documentos pendentes, reunioes, bagagem, seguro, horarios e atualizacoes operacionais. Lembretes devem identificar a reserva e a proxima acao sem expor dados sensiveis. Para parcela, documento ou contrato, consulte o banco e responda somente com o registro do proprio cliente autenticado. Em alteracao, cancelamento, emergencia, reclamacao ou informacao divergente, priorize atendimento humano e registre historico.',
      'Playbook interno Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/'
    ),
    (
      'Tom de voz e experiencia humana no WhatsApp',
      'tom_de_voz',
      'Use portugues brasileiro, linguagem acolhedora, profissional e objetiva. Cumprimente, use o primeiro nome com moderacao e responda primeiro a pergunta feita. Envie mensagens curtas, com uma ideia principal por bloco. Evite excesso de emojis, urgencia artificial, pressao e frases roboticas. Demonstre escuta resumindo preferencia ou preocupacao real do cliente. Termine com uma unica proxima acao clara. Se um humano assumir, a IA deve pausar. Ao retornar, reconheca o que ja foi tratado e nao reinicie a conversa.',
      'Playbook interno Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/'
    ),
    (
      'Limites contra erros e informacao nao confirmada',
      'seguranca_da_informacao',
      'Nunca invente ou estime como fato: preco, cambio, desconto, vaga, data, roteiro, hotel, voo, companhia, bagagem, refeicao, ingresso, seguro, visto, vacina, prazo, parcela, multa, reembolso ou cobertura. Nao copie condicoes de concorrentes para ofertas da Viagem Perfeita. Conteudo de terceiros serve apenas para melhorar a estrutura do atendimento. Quando a fonte autorizada estiver ausente, vencida ou conflitante, diga que precisa confirmar e transfira para um consultor. Nunca solicite senha, codigo de verificacao, cartao ou documento completo pelo chat.',
      'Politica interna Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/politica-de-privacidade/'
    )
  ) as article(title, category, content, source, source_url)
  where not exists (
    select 1 from public.knowledge_base_articles existing
    where existing.organization_id = org_id and existing.title = article.title
  );
end $$;
