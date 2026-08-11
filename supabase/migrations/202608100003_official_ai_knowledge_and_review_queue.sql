begin;

-- Conversas reais podem sugerir melhorias, mas nunca alimentam a IA sem revisão humana.
create table if not exists public.knowledge_review_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  proposed_title text not null,
  proposed_category text not null,
  proposed_content text not null,
  source_context text,
  status text not null default 'pendente'
    check(status in('pendente','em_revisao','aprovado','rejeitado','arquivado')),
  detected_by text not null default 'ia'
    check(detected_by in('ia','atendente','gestor','sistema')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  promoted_article_id uuid references public.knowledge_base_articles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(status not in('aprovado','rejeitado') or (reviewed_by is not null and reviewed_at is not null))
);

create unique index if not exists knowledge_review_candidates_source_message_idx
  on public.knowledge_review_candidates(organization_id,source_message_id)
  where source_message_id is not null;
create index if not exists knowledge_review_candidates_queue_idx
  on public.knowledge_review_candidates(organization_id,status,created_at desc);

alter table public.knowledge_review_candidates enable row level security;

drop policy if exists knowledge_review_candidates_staff_read on public.knowledge_review_candidates;
create policy knowledge_review_candidates_staff_read
  on public.knowledge_review_candidates for select to authenticated
  using(organization_id=public.current_organization_id());

drop policy if exists knowledge_review_candidates_managers_write on public.knowledge_review_candidates;
create policy knowledge_review_candidates_managers_write
  on public.knowledge_review_candidates for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());

do $$
declare
  org_id uuid;
  approver_id uuid;
begin
  select id into org_id from public.organizations where slug='viagem-perfeita' limit 1;
  select id into approver_id
  from public.profiles
  where organization_id=org_id and active=true and role in('administrador','gestor')
  order by case when role='administrador' then 0 else 1 end, created_at
  limit 1;

  if org_id is null or approver_id is null then
    raise exception 'Viagem Perfeita organization and approver are required';
  end if;

  insert into public.knowledge_base_articles
    (organization_id,title,category,content,source,source_url,version,approved_by,
     approved_at,published,audience,valid_from,lifecycle_status,usable_by_ai,responsible_id)
  select org_id,a.title,a.category,a.content,a.source,a.source_url,1,approver_id,
         now(),true,a.audience,now(),'aprovado',true,approver_id
  from (values
    (
      'Identidade e canais oficiais da Viagem Perfeita',
      'institucional',
      'Nome de atendimento: Viagem Perfeita Turismo. Razao social: VP TURISMO E EVENTOS. CNPJ: 28.279.846/0001-21. WhatsApp oficial: +55 31 99528-5665. Site oficial: https://www.viagemperfeitaturismo.com.br. Instagram: @viagemperfeitatrip. E-mail de contato: viagemperfeitatrip@gmail.com. Atendimento informado no site: segunda a sexta, das 9h as 18h. Para qualquer canal, dado ou horario divergente, priorize a configuracao oficial mais recente e encaminhe para revisao humana.',
      'Configuracao oficial Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/',
      'externo'
    ),
    (
      'Primeiro atendimento e continuidade no WhatsApp',
      'atendimento_whatsapp',
      'Comece respondendo diretamente ao motivo do contato. Identifique-se como assistente virtual da Viagem Perfeita sem fingir ser uma pessoa. Use mensagens curtas e naturais. Reaproveite dados que o cliente ja informou no site ou na conversa. Qualifique progressivamente e registre destino, periodo, embarque, viajantes, acomodacao, investimento e interesse. Se houver pedido de atendente, negociacao, reclamacao, urgencia, documento pessoal, pagamento ou baixa confianca na resposta, pause a IA e transfira com resumo completo. Quando a IA retornar, continue do ponto em que o humano parou.',
      'Politica operacional Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/contato/',
      'ambos'
    ),
    (
      'Governanca do aprendizado por atendimentos',
      'governanca_ia',
      'Conversas reais servem para detectar perguntas frequentes, objecoes e lacunas, mas nao se tornam conhecimento automaticamente. Todo candidato deve ser anonimizado, registrado na fila de revisao e aprovado por administrador ou gestor. Remova senhas, codigos, documentos, dados financeiros e dados pessoais desnecessarios. Uma resposta de atendente so pode ser promovida quando estiver alinhada a fonte oficial vigente. Preco, cambio, disponibilidade, voo, hotel, roteiro e condicao comercial exigem fonte identificada e validade.',
      'Politica interna Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/politica-de-privacidade/',
      'interno'
    ),
    (
      'Protecao de dados durante o atendimento',
      'privacidade',
      'Colete apenas os dados necessarios para atender, cotar ou reservar. Nunca solicite senha, codigo de autenticacao, numero completo de cartao ou envio indiscriminado de documentos pelo chat. Para passaporte e documentos, explique o canal seguro e transfira ao processo autorizado. Nao revele dados de reserva, parcela, contrato ou documento sem identificar o cliente conforme a politica vigente. Em caso de duvida, interrompa a automacao e encaminhe para um responsavel.',
      'Politica de privacidade Viagem Perfeita',
      'https://www.viagemperfeitaturismo.com.br/politica-de-privacidade/',
      'externo'
    )
  ) as a(title,category,content,source,source_url,audience)
  where not exists(
    select 1 from public.knowledge_base_articles k
    where k.organization_id=org_id and k.title=a.title
  );
end $$;

commit;
