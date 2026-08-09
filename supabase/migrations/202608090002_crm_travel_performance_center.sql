-- Central de performance comercial para agência de viagens.
-- Consolida SLA, funil, consultores, caravanas e motivos de perda sem expor dados pessoais.

begin;

create or replace function public.crm_performance_center(
  date_from date default (current_date - 30),
  date_to date default current_date
) returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  org_id uuid;
  result jsonb;
begin
  if not public.has_role('administrador','gestor') then
    raise exception 'acesso não autorizado';
  end if;
  if date_from > date_to then raise exception 'período inválido'; end if;
  org_id := public.current_organization_id();

  select jsonb_build_object(
    'period', jsonb_build_object('from',date_from,'to',date_to),
    'sla', jsonb_build_object(
      'open_conversations',(select count(*) from public.conversations c where c.organization_id=org_id and c.status<>'encerrada'),
      'awaiting_team',(select count(*) from public.conversations c where c.organization_id=org_id and c.status='aguardando_equipe'),
      'waiting_over_sla',(select count(*) from public.conversations c where c.organization_id=org_id and c.status='aguardando_equipe' and coalesce(c.last_customer_message_at,c.started_at)<now()-interval '15 minutes'),
      'unassigned',(select count(*) from public.conversations c where c.organization_id=org_id and c.status<>'encerrada' and c.assigned_to is null),
      'ai_active',(select count(*) from public.conversations c where c.organization_id=org_id and c.status<>'encerrada' and c.control_mode='ia'),
      'human_active',(select count(*) from public.conversations c where c.organization_id=org_id and c.status<>'encerrada' and c.control_mode in ('humano','assistida')),
      'avg_first_response_minutes',(select coalesce(round(avg(extract(epoch from (c.first_response_at-c.started_at))/60)::numeric,1),0) from public.conversations c where c.organization_id=org_id and c.first_response_at is not null and c.started_at::date between date_from and date_to)
    ),
    'consultants',(
      select coalesce(jsonb_agg(row_data order by total desc),'[]'::jsonb) from(
        select jsonb_build_object('name',coalesce(p.full_name,'Sem responsável'),'total',count(l.id),'converted',count(l.id) filter(where l.converted_customer_id is not null),'lost',count(l.id) filter(where l.status='perdido'),'conversion_rate',case when count(l.id)=0 then 0 else round(100.0*count(l.id) filter(where l.converted_customer_id is not null)/count(l.id),1) end) row_data,count(l.id) total
        from public.leads l left join public.profiles p on p.id=l.assigned_to
        where l.organization_id=org_id and l.deleted_at is null and l.created_at::date between date_from and date_to
        group by p.id,p.full_name
      ) s
    ),
    'caravans',(
      select coalesce(jsonb_agg(row_data order by interests desc),'[]'::jsonb) from(
        select jsonb_build_object('name',coalesce(c.name,li.destination,li.experience_name,'Não informada'),'interests',count(distinct li.lead_id),'reservations',count(distinct r.id),'confirmed',count(distinct r.id) filter(where r.status in ('confirmada','concluida')),'revenue',coalesce(sum(distinct r.final_value) filter(where r.status in ('confirmada','concluida')),0)) row_data,count(distinct li.lead_id) interests
        from public.lead_interests li join public.leads l on l.id=li.lead_id and l.organization_id=org_id
        left join public.caravans c on c.id=li.caravan_id
        left join public.reservations r on r.lead_id=l.id and (li.caravan_id is null or r.caravan_id=li.caravan_id)
        where l.deleted_at is null and l.created_at::date between date_from and date_to
        group by c.id,c.name,li.destination,li.experience_name
      ) s
    ),
    'loss_reasons',(
      select coalesce(jsonb_agg(row_data order by total desc),'[]'::jsonb) from(
        select jsonb_build_object('reason',coalesce(nullif(trim(lost_reason),''),'Não informado'),'total',count(*)) row_data,count(*) total
        from public.leads where organization_id=org_id and deleted_at is null and status='perdido' and updated_at::date between date_from and date_to
        group by coalesce(nullif(trim(lost_reason),''),'Não informado')
      ) s
    ),
    'stage_aging',(
      select coalesce(jsonb_agg(row_data order by position),'[]'::jsonb) from(
        select jsonb_build_object('stage',coalesce(ps.name,replace(l.status::text,'_',' ')),'total',count(*),'avg_days',round(avg(extract(epoch from (now()-l.updated_at))/86400)::numeric,1),'stalled',count(*) filter(where l.updated_at<now()-interval '7 days')) row_data,coalesce(ps.position,999) position
        from public.leads l left join public.pipeline_stages ps on ps.id=l.pipeline_stage_id
        where l.organization_id=org_id and l.deleted_at is null and l.status not in ('perdido','arquivado','reserva_confirmada','passageiro_confirmado')
        group by ps.id,ps.name,ps.position,l.status
      ) s
    ),
    'activity_by_hour',(
      select coalesce(jsonb_agg(row_data order by weekday,hour_of_day),'[]'::jsonb) from(
        select jsonb_build_object('weekday',extract(isodow from m.sent_at)::integer,'hour',extract(hour from m.sent_at)::integer,'total',count(*)) row_data,extract(isodow from m.sent_at)::integer weekday,extract(hour from m.sent_at)::integer hour_of_day
        from public.messages m join public.conversations c on c.id=m.conversation_id
        where c.organization_id=org_id and m.sent_at::date between date_from and date_to and m.direction='entrada'
        group by extract(isodow from m.sent_at),extract(hour from m.sent_at)
      ) s
    )
  ) into result;
  return result;
end $$;

revoke all on function public.crm_performance_center(date,date) from public,anon;
grant execute on function public.crm_performance_center(date,date) to authenticated;
comment on function public.crm_performance_center(date,date) is 'BI agregado: SLA, conversão, gargalos, caravanas e horários. Restrito a administradores e gestores.';

commit;
