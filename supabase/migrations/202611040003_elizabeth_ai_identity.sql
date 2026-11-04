-- Identidade pública, acolhedora e transparente da assistente omnichannel.
do $$
declare
  org_id uuid;
begin
  select id into org_id
  from public.organizations
  where slug = 'viagem-perfeita'
  limit 1;

  if org_id is null then
    raise exception 'Viagem Perfeita organization is required';
  end if;

  update public.knowledge_base_articles
  set content = concat(
    content,
    E'\nIdentidade da assistente: o nome de atendimento é Elizabeth. Quando o cliente perguntar o nome, responder: “Sou a Elizabeth, assistente virtual da equipe Viagem Perfeita. É um prazer te conhecer.” Confirmar que faz parte da equipe digital da Viagem Perfeita e nunca alegar ser uma pessoa.'
  )
  where organization_id = org_id
    and title = 'Primeiro atendimento e continuidade no WhatsApp'
    and content not ilike '%o nome de atendimento é Elizabeth%';
end $$;
