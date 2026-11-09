-- Repara a persistência e a leitura da cadência comercial governada.
-- A política continua limitada ao tenant atual, exige modelo aprovado para
-- operação real e nunca torna contatos sem consentimento elegíveis.
begin;

grant select, insert, update on public.sales_followup_policies to authenticated;
grant select on public.sales_followup_attempts to authenticated;

create or replace function public.sales_followup_preview()
returns jsonb language sql stable security definer set search_path=public as $$
  with policy as (
    select * from sales_followup_policies where organization_id=current_organization_id()
  ), candidates as (
    select distinct on(c.id) c.id conversation_id,c.lead_id,l.name,
      regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') phone_e164,
      c.last_message_at,
      coalesce((select count(*) from sales_followup_attempts a where a.conversation_id=c.id and a.status not in ('cancelada','bloqueada','respondida')),0) attempts
    from conversations c join leads l on l.id=c.lead_id cross join policy p
    where c.organization_id=current_organization_id() and c.channel='whatsapp'
      and c.status in ('aberta','aguardando_cliente') and l.deleted_at is null
      and l.converted_customer_id is null and c.last_message_at <= now()-(p.first_delay_hours||' hours')::interval
      and exists(select 1 from messages m where m.conversation_id=c.id and m.direction='entrada')
      and (select m.direction from messages m where m.conversation_id=c.id order by m.sent_at desc,m.created_at desc limit 1)='saida'
      and not exists(select 1 from sales_followup_attempts a where a.conversation_id=c.id and a.created_at>now()-(p.interval_hours||' hours')::interval)
      and exists(select 1 from contact_consents cc where cc.organization_id=c.organization_id and cc.lead_id=l.id and cc.channel='whatsapp' and cc.purpose='marketing' and cc.granted and cc.revoked_at is null)
      and not exists(select 1 from contact_suppressions s where s.organization_id=c.organization_id and s.phone_e164=regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') and s.channel='whatsapp' and s.scope in ('marketing','todos') and s.released_at is null)
      and regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') ~ '^[1-9][0-9]{9,14}$'
  )
  select jsonb_build_object(
    'eligible_count',count(*) filter(where attempts<(select max_attempts from policy)),
    'enabled',coalesce((select enabled from policy),false),
    'simulation_mode',coalesce((select simulation_mode from policy),true),
    'first_delay_hours',coalesce((select first_delay_hours from policy),48),
    'interval_hours',coalesce((select interval_hours from policy),72),
    'max_attempts',coalesce((select max_attempts from policy),3),
    'business_hour_start',coalesce((select business_hour_start from policy),9),
    'business_hour_end',coalesce((select business_hour_end from policy),18),
    'template_id',(select template_id from policy),
    'template_ready',exists(select 1 from message_templates t,policy p where t.id=p.template_id and t.status='aprovado'),
    'contacts',coalesce(jsonb_agg(jsonb_build_object('conversation_id',conversation_id,'lead_id',lead_id,'name',name,'phone_e164',phone_e164,'last_message_at',last_message_at,'attempts',attempts) order by last_message_at) filter(where attempts<(select max_attempts from policy)),'[]'::jsonb)
  ) from candidates;
$$;

revoke all on function public.sales_followup_preview() from public,anon;
grant execute on function public.sales_followup_preview() to authenticated;

create or replace function public.update_sales_followup_policy(
  policy_enabled boolean, policy_simulation boolean, delay_hours integer, spacing_hours integer,
  attempt_limit integer, start_hour integer, end_hour integer, approved_template uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();
begin
  if org is null or not has_role('administrador','gestor') then raise exception 'forbidden'; end if;
  if policy_enabled and not policy_simulation and not exists(select 1 from message_templates where id=approved_template and organization_id=org and status='aprovado') then raise exception 'approved_template_required'; end if;
  insert into sales_followup_policies(organization_id,enabled,simulation_mode,first_delay_hours,interval_hours,max_attempts,business_hour_start,business_hour_end,template_id,updated_by,updated_at)
  values(org,policy_enabled,policy_simulation,delay_hours,spacing_hours,attempt_limit,start_hour,end_hour,approved_template,auth.uid(),now())
  on conflict(organization_id) do update set enabled=excluded.enabled,simulation_mode=excluded.simulation_mode,first_delay_hours=excluded.first_delay_hours,interval_hours=excluded.interval_hours,max_attempts=excluded.max_attempts,business_hour_start=excluded.business_hour_start,business_hour_end=excluded.business_hour_end,template_id=excluded.template_id,updated_by=auth.uid(),updated_at=now();
  return sales_followup_preview();
end $$;

revoke all on function public.update_sales_followup_policy(boolean,boolean,integer,integer,integer,integer,integer,uuid) from public,anon;
grant execute on function public.update_sales_followup_policy(boolean,boolean,integer,integer,integer,integer,integer,uuid) to authenticated;

commit;
