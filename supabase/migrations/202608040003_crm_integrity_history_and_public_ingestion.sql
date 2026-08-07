-- Fase 1: integridade, históricos automáticos e entrada pública segura.

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path=public
as $$ begin new.updated_at=now(); return new; end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations','profiles','teams','pipelines','pipeline_stages','caravans',
    'caravan_itinerary_days','leads','lead_notes','tasks','customers','contact_channels',
    'conversations','reservations','reservation_travelers','payments','documents',
    'email_notifications','destinations_content','experiences_content','faqs_content',
    'articles_content','media_content','testimonials_content','leaders_content','partners_content'
  ] loop
    execute format('drop trigger if exists set_updated_at_trigger on public.%I',table_name);
    execute format('create trigger set_updated_at_trigger before update on public.%I for each row execute function public.set_updated_at()',table_name);
  end loop;
end $$;

-- Funil padrão. O código é estável para integrações; o nome pode ser editado no CRM.
insert into public.pipelines(organization_id,name,entity_type,is_default)
select id,'Funil comercial','lead',true from public.organizations where slug='viagem-perfeita'
on conflict(organization_id,name,entity_type) do update set is_default=true,active=true,updated_at=now();

with target_pipeline as(
  select p.id from public.pipelines p join public.organizations o on o.id=p.organization_id
  where o.slug='viagem-perfeita' and p.name='Funil comercial' and p.entity_type='lead'
), stages(name,code,position,color,is_won,is_lost) as(values
  ('Novo lead','novo_lead',10,'#2563EB',false,false),
  ('Primeiro contato','primeiro_contato',20,'#0EA5E9',false,false),
  ('Em atendimento','em_atendimento',30,'#14B8A6',false,false),
  ('Roteiro enviado','roteiro_enviado',40,'#8B5CF6',false,false),
  ('Proposta enviada','proposta_enviada',50,'#A855F7',false,false),
  ('Aguardando resposta','aguardando_resposta',60,'#F59E0B',false,false),
  ('Negociação','negociacao',70,'#F97316',false,false),
  ('Reserva iniciada','reserva_iniciada',80,'#EA580C',false,false),
  ('Aguardando pagamento','aguardando_pagamento',90,'#D97706',false,false),
  ('Reserva confirmada','reserva_confirmada',100,'#16A34A',true,false),
  ('Documentação pendente','documentacao_pendente',110,'#CA8A04',false,false),
  ('Passageiro confirmado','passageiro_confirmado',120,'#15803D',true,false),
  ('Perdido','perdido',130,'#DC2626',false,true),
  ('Arquivado','arquivado',140,'#64748B',false,true)
)
insert into public.pipeline_stages(pipeline_id,name,code,position,color,is_won,is_lost)
select target_pipeline.id,stages.name,stages.code,stages.position,stages.color,stages.is_won,stages.is_lost from target_pipeline cross join stages
on conflict(pipeline_id,code) do update set name=excluded.name,position=excluded.position,color=excluded.color,is_won=excluded.is_won,is_lost=excluded.is_lost,active=true,updated_at=now();

update public.leads l set
  pipeline_id=p.id,
  pipeline_stage_id=s.id
from public.pipelines p join public.pipeline_stages s on s.pipeline_id=p.id
where p.organization_id=l.organization_id and p.entity_type='lead' and p.is_default=true and s.code=l.status::text
  and (l.pipeline_id is null or l.pipeline_stage_id is null);

create or replace function public.record_lead_status_history() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.lead_status_history(organization_id,lead_id,to_status,to_stage_id,changed_by,reason)
    values(new.organization_id,new.id,new.status,new.pipeline_stage_id,auth.uid(),'Criação do lead');
  elsif new.status is distinct from old.status or new.pipeline_stage_id is distinct from old.pipeline_stage_id then
    insert into public.lead_status_history(organization_id,lead_id,from_status,to_status,from_stage_id,to_stage_id,changed_by)
    values(new.organization_id,new.id,old.status,new.status,old.pipeline_stage_id,new.pipeline_stage_id,auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists lead_status_history_trigger on public.leads;
create trigger lead_status_history_trigger after insert or update of status,pipeline_stage_id on public.leads for each row execute function public.record_lead_status_history();

create or replace function public.record_reservation_status_history() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.reservation_status_history(organization_id,reservation_id,to_status,changed_by,reason)
    values(new.organization_id,new.id,new.status,auth.uid(),'Criação da reserva');
  elsif new.status is distinct from old.status then
    insert into public.reservation_status_history(organization_id,reservation_id,from_status,to_status,changed_by)
    values(new.organization_id,new.id,old.status,new.status,auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists reservation_status_history_trigger on public.reservations;
create trigger reservation_status_history_trigger after insert or update of status on public.reservations for each row execute function public.record_reservation_status_history();

create or replace function public.sync_primary_lead_assignment() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    update public.lead_assignments set unassigned_at=now(),is_primary=false
      where lead_id=new.id and unassigned_at is null and is_primary=true;
    if new.assigned_to is not null then
      insert into public.lead_assignments(organization_id,lead_id,profile_id,assigned_by,is_primary)
      values(new.organization_id,new.id,new.assigned_to,auth.uid(),true)
      on conflict(lead_id,profile_id) where unassigned_at is null do update set is_primary=true,assigned_by=excluded.assigned_by,assigned_at=now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists sync_primary_lead_assignment_trigger on public.leads;
create trigger sync_primary_lead_assignment_trigger after update of assigned_to on public.leads for each row execute function public.sync_primary_lead_assignment();

-- Impede vínculos cruzados entre organizações, inclusive quando service_role é usado.
create or replace function public.validate_lead_relations() returns trigger
language plpgsql set search_path=public
as $$
begin
  if new.assigned_to is not null and not exists(select 1 from public.profiles p where p.id=new.assigned_to and p.organization_id=new.organization_id and p.active=true) then raise exception 'assigned profile belongs to another organization or is inactive'; end if;
  if new.pipeline_id is not null and not exists(select 1 from public.pipelines p where p.id=new.pipeline_id and p.organization_id=new.organization_id) then raise exception 'pipeline belongs to another organization'; end if;
  if new.pipeline_stage_id is not null and not exists(select 1 from public.pipeline_stages s join public.pipelines p on p.id=s.pipeline_id where s.id=new.pipeline_stage_id and p.organization_id=new.organization_id and (new.pipeline_id is null or p.id=new.pipeline_id)) then raise exception 'pipeline stage is incompatible with lead organization or pipeline'; end if;
  return new;
end $$;
drop trigger if exists validate_lead_relations_trigger on public.leads;
create trigger validate_lead_relations_trigger before insert or update of organization_id,assigned_to,pipeline_id,pipeline_stage_id on public.leads for each row execute function public.validate_lead_relations();

create or replace function public.validate_reservation_relations() returns trigger
language plpgsql set search_path=public
as $$
begin
  if not exists(select 1 from public.customers c where c.id=new.customer_id and c.organization_id=new.organization_id) then raise exception 'customer belongs to another organization'; end if;
  if new.lead_id is not null and not exists(select 1 from public.leads l where l.id=new.lead_id and l.organization_id=new.organization_id) then raise exception 'lead belongs to another organization'; end if;
  if new.caravan_id is not null and not exists(select 1 from public.caravans c where c.id=new.caravan_id and c.organization_id=new.organization_id) then raise exception 'caravan belongs to another organization'; end if;
  return new;
end $$;
drop trigger if exists validate_reservation_relations_trigger on public.reservations;
create trigger validate_reservation_relations_trigger before insert or update of organization_id,customer_id,lead_id,caravan_id on public.reservations for each row execute function public.validate_reservation_relations();

create or replace function public.validate_assignment_relations() returns trigger
language plpgsql set search_path=public
as $$
begin
  if not exists(select 1 from public.leads l where l.id=new.lead_id and l.organization_id=new.organization_id) then raise exception 'assignment lead belongs to another organization'; end if;
  if not exists(select 1 from public.profiles p where p.id=new.profile_id and p.organization_id=new.organization_id and p.active=true) then raise exception 'assignment profile belongs to another organization or is inactive'; end if;
  if new.assigned_by is not null and not exists(select 1 from public.profiles p where p.id=new.assigned_by and p.organization_id=new.organization_id) then raise exception 'assigner belongs to another organization'; end if;
  return new;
end $$;
drop trigger if exists validate_assignment_relations_trigger on public.lead_assignments;
create trigger validate_assignment_relations_trigger before insert or update of organization_id,lead_id,profile_id,assigned_by on public.lead_assignments for each row execute function public.validate_assignment_relations();

create or replace function public.validate_team_membership() returns trigger
language plpgsql set search_path=public
as $$
begin
  if not exists(select 1 from public.teams t join public.profiles p on p.id=new.profile_id where t.id=new.team_id and p.organization_id=t.organization_id) then raise exception 'team and profile belong to different organizations'; end if;
  return new;
end $$;
drop trigger if exists validate_team_membership_trigger on public.team_members;
create trigger validate_team_membership_trigger before insert or update of team_id,profile_id on public.team_members for each row execute function public.validate_team_membership();

create or replace function public.validate_conversation_relations() returns trigger
language plpgsql set search_path=public
as $$
begin
  if new.lead_id is not null and not exists(select 1 from public.leads l where l.id=new.lead_id and l.organization_id=new.organization_id) then raise exception 'conversation lead belongs to another organization'; end if;
  if new.customer_id is not null and not exists(select 1 from public.customers c where c.id=new.customer_id and c.organization_id=new.organization_id) then raise exception 'conversation customer belongs to another organization'; end if;
  if new.assigned_to is not null and not exists(select 1 from public.profiles p where p.id=new.assigned_to and p.organization_id=new.organization_id and p.active=true) then raise exception 'conversation assignee belongs to another organization or is inactive'; end if;
  return new;
end $$;
drop trigger if exists validate_conversation_relations_trigger on public.conversations;
create trigger validate_conversation_relations_trigger before insert or update of organization_id,lead_id,customer_id,assigned_to on public.conversations for each row execute function public.validate_conversation_relations();

create or replace function public.validate_financial_and_document_relations() returns trigger
language plpgsql set search_path=public
as $$
begin
  if tg_table_name='payment_transactions' and not exists(select 1 from public.payments p join public.reservations r on r.id=p.reservation_id where p.id=new.payment_id and r.organization_id=new.organization_id) then raise exception 'payment belongs to another organization'; end if;
  if tg_table_name='document_requests' and not exists(select 1 from public.reservations r where r.id=new.reservation_id and r.organization_id=new.organization_id) then raise exception 'reservation belongs to another organization'; end if;
  return new;
end $$;
drop trigger if exists validate_payment_transaction_relations_trigger on public.payment_transactions;
create trigger validate_payment_transaction_relations_trigger before insert or update of organization_id,payment_id on public.payment_transactions for each row execute function public.validate_financial_and_document_relations();
drop trigger if exists validate_document_request_relations_trigger on public.document_requests;
create trigger validate_document_request_relations_trigger before insert or update of organization_id,reservation_id on public.document_requests for each row execute function public.validate_financial_and_document_relations();

create or replace function public.write_crm_audit_log() returns trigger
language plpgsql security definer set search_path=public
as $$
declare row_before jsonb; row_after jsonb; entity uuid; org uuid;
begin
  row_before=case when tg_op='INSERT' then null else to_jsonb(old) end;
  row_after=case when tg_op='DELETE' then null else to_jsonb(new) end;
  entity=coalesce((row_after->>'id')::uuid,(row_before->>'id')::uuid);
  org=coalesce((row_after->>'organization_id')::uuid,(row_before->>'organization_id')::uuid);
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,before_data,after_data)
  values(org,auth.uid(),lower(tg_op),tg_table_name,entity,row_before,row_after);
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['leads','customers','reservations'] loop
    execute format('drop trigger if exists crm_audit_trigger on public.%I',table_name);
    execute format('create trigger crm_audit_trigger after insert or update or delete on public.%I for each row execute function public.write_crm_audit_log()',table_name);
  end loop;
end $$;

-- Entrada pública: valida, deduplica, cria interesse, atividade e fila de e-mail na mesma transação.
-- O envio do e-mail permanece assíncrono e nunca antecede a persistência do lead.
create or replace function public.upsert_public_lead(lead_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  target_org_id uuid:=public.default_organization_id();
  target_id uuid;
  target_pipeline_id uuid;
  target_stage_id uuid;
  interest_id uuid;
  notification_id uuid;
  existing boolean:=false;
  event_name text;
  clean_name text:=trim(coalesce(lead_payload->>'name',''));
  clean_phone text:=regexp_replace(coalesce(lead_payload->>'phone_normalized',''),'\D','','g');
  clean_email text:=nullif(lower(trim(coalesce(lead_payload->>'email',''))),'');
  travelers integer:=greatest(1,least(99,coalesce(nullif(lead_payload->>'travelers','')::integer,1)));
begin
  if target_org_id is null then raise exception 'organization not configured'; end if;
  if length(clean_name)<3 or length(clean_name)>160 then raise exception 'invalid name'; end if;
  if clean_phone !~ '^[0-9]{10,15}$' then raise exception 'invalid phone'; end if;
  if clean_email is not null and clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid email'; end if;
  if coalesce((lead_payload->>'consent')::boolean,false)=false then raise exception 'consent required'; end if;
  if pg_column_size(lead_payload)>32768 then raise exception 'payload too large'; end if;

  select p.id,s.id into target_pipeline_id,target_stage_id
  from public.pipelines p join public.pipeline_stages s on s.pipeline_id=p.id and s.code='novo_lead'
  where p.organization_id=target_org_id and p.entity_type='lead' and p.is_default=true limit 1;

  select id into target_id from public.leads
  where organization_id=target_org_id and deleted_at is null
    and (phone_normalized=clean_phone or (clean_email is not null and lower(email)=clean_email))
  order by updated_at desc limit 1 for update;

  if target_id is null then
    insert into public.leads(organization_id,name,phone,phone_normalized,email,city,state,source,source_detail,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_page,referrer,consent,consent_at,email_notification_status,pipeline_id,pipeline_stage_id)
    values(target_org_id,clean_name,left(coalesce(lead_payload->>'phone',''),40),clean_phone,clean_email,nullif(left(trim(coalesce(lead_payload->>'city','')),120),''),nullif(upper(left(trim(coalesce(lead_payload->>'state','')),2)),''),'Site',left(lead_payload->>'source_detail',160),left(lead_payload->>'utm_source',160),left(lead_payload->>'utm_medium',160),left(lead_payload->>'utm_campaign',160),left(lead_payload->>'utm_content',160),left(lead_payload->>'utm_term',160),left(lead_payload->>'landing_page',1000),left(lead_payload->>'referrer',1000),true,now(),'pendente',target_pipeline_id,target_stage_id)
    returning id into target_id;
  else
    existing=true;
    update public.leads set updated_at=now(),name=clean_name,phone=left(coalesce(nullif(lead_payload->>'phone',''),phone),40),email=coalesce(clean_email,email),city=coalesce(nullif(left(trim(coalesce(lead_payload->>'city','')),120),''),city),state=coalesce(nullif(upper(left(trim(coalesce(lead_payload->>'state','')),2)),''),state),email_notification_status='pendente' where id=target_id;
  end if;

  insert into public.lead_interests(lead_id,experience_name,destination,desired_period,duration,travelers_count,accommodation,departure_city,payment_preference,main_interest,custom_notes)
  values(target_id,nullif(left(trim(coalesce(lead_payload->>'experience_name','')),240),''),nullif(left(trim(coalesce(lead_payload->>'destination','')),240),''),nullif(left(trim(coalesce(lead_payload->>'desired_period','')),160),''),nullif(left(trim(coalesce(lead_payload->>'duration','')),80),''),travelers,nullif(left(trim(coalesce(lead_payload->>'accommodation','')),80),''),nullif(left(trim(coalesce(lead_payload->>'departureCity','')),120),''),nullif(left(trim(coalesce(lead_payload->>'paymentPreference','')),120),''),nullif(left(trim(coalesce(lead_payload->>'interest','')),160),''),nullif(left(trim(coalesce(lead_payload->>'notes','')),1200),'')) returning id into interest_id;

  event_name=case when existing then 'new_interest' else 'new_lead' end;
  insert into public.lead_activities(lead_id,activity_type,title,description,metadata)
  values(target_id,case when existing then 'new_interest' else 'lead_created' end,case when existing then 'Contato existente demonstrou novo interesse' else 'Lead criado pelo site' end,left(lead_payload->>'source_detail',160),jsonb_build_object('landing_page',left(lead_payload->>'landing_page',1000),'experience_name',left(lead_payload->>'experience_name',240),'duration',left(lead_payload->>'duration',80),'interest_id',interest_id));

  insert into public.email_notifications(organization_id,event_type,lead_id,recipient,subject)
  values(target_org_id,event_name,target_id,'viagemperfeitatrip@gmail.com',(case when existing then 'Novo interesse — ' else 'Novo lead — ' end)||coalesce(nullif(left(lead_payload->>'experience_name',120),''),'Atendimento geral')||' — '||left(clean_name,100)) returning id into notification_id;

  return jsonb_build_object('lead_id',target_id,'interest_id',interest_id,'notification_id',notification_id,'duplicate',existing,'email_status','pendente');
end $$;

revoke all on function public.upsert_public_lead(jsonb) from public;
grant execute on function public.upsert_public_lead(jsonb) to anon,authenticated;

-- Objetos internos nunca são acessados diretamente pelo cliente.
revoke all on public.audit_logs,public.webhook_events from anon,authenticated;
grant select on public.audit_logs to authenticated;
