-- Garante que toda organização, inclusive as criadas antes do onboarding multi-tenant,
-- possua um funil comercial utilizável pelo quadro do CRM.

insert into public.pipelines (organization_id, name, entity_type, is_default, active)
select o.id, 'Funil comercial', 'lead', true, true
from public.organizations o
where not exists (
  select 1
  from public.pipelines p
  where p.organization_id = o.id
    and p.entity_type = 'lead'
    and p.is_default = true
    and p.active = true
)
on conflict (organization_id, name, entity_type)
do update set is_default = true, active = true, updated_at = now();

with stages(name, code, position, color, is_won, is_lost) as (
  values
    ('Novo lead', 'novo_lead', 10, '#2563EB', false, false),
    ('Primeiro contato', 'primeiro_contato', 20, '#0EA5E9', false, false),
    ('Em atendimento', 'em_atendimento', 30, '#14B8A6', false, false),
    ('Roteiro enviado', 'roteiro_enviado', 40, '#8B5CF6', false, false),
    ('Proposta enviada', 'proposta_enviada', 50, '#A855F7', false, false),
    ('Aguardando resposta', 'aguardando_resposta', 60, '#F59E0B', false, false),
    ('Negociação', 'negociacao', 70, '#F97316', false, false),
    ('Reserva iniciada', 'reserva_iniciada', 80, '#EA580C', false, false),
    ('Aguardando pagamento', 'aguardando_pagamento', 90, '#D97706', false, false),
    ('Reserva confirmada', 'reserva_confirmada', 100, '#16A34A', true, false),
    ('Documentação pendente', 'documentacao_pendente', 110, '#CA8A04', false, false),
    ('Passageiro confirmado', 'passageiro_confirmado', 120, '#15803D', true, false),
    ('Perdido', 'perdido', 130, '#DC2626', false, true),
    ('Arquivado', 'arquivado', 140, '#64748B', false, true)
)
insert into public.pipeline_stages (pipeline_id, name, code, position, color, is_won, is_lost, active)
select p.id, s.name, s.code, s.position, s.color, s.is_won, s.is_lost, true
from public.pipelines p
cross join stages s
where p.entity_type = 'lead'
  and p.is_default = true
  and p.active = true
on conflict (pipeline_id, code)
do update set
  name = excluded.name,
  position = excluded.position,
  color = excluded.color,
  is_won = excluded.is_won,
  is_lost = excluded.is_lost,
  active = true,
  updated_at = now();

update public.leads l
set pipeline_id = p.id,
    pipeline_stage_id = s.id,
    updated_at = now()
from public.pipelines p
join public.pipeline_stages s on s.pipeline_id = p.id
where p.organization_id = l.organization_id
  and p.entity_type = 'lead'
  and p.is_default = true
  and p.active = true
  and s.code = l.status::text
  and (l.pipeline_id is null or l.pipeline_stage_id is null);
