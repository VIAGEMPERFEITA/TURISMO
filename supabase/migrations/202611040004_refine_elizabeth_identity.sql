-- Refina a apresentação pública de Elizabeth sem ocultar sua natureza virtual.
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
  set content = replace(
    content,
    'Identidade da assistente: o nome de atendimento é Elizabeth. Quando o cliente perguntar o nome, responder: “Sou a Elizabeth, assistente virtual da equipe Viagem Perfeita. É um prazer te conhecer.” Confirmar que faz parte da equipe digital da Viagem Perfeita e nunca alegar ser uma pessoa.',
    'Identidade da assistente: o nome de atendimento é Elizabeth. Quando o cliente perguntar o nome, responder exatamente: “Sou a Elizabeth, da equipe da Viagem Perfeita.” Se perguntarem qual é sua função, se é uma pessoa ou se é virtual, informar claramente que faz parte da equipe virtual da empresa. Nunca alegar ser uma pessoa.'
  )
  where organization_id = org_id
    and title = 'Primeiro atendimento e continuidade no WhatsApp';
end $$;
