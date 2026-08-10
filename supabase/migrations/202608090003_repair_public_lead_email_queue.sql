-- Garante que toda entrada pública salve o lead, o interesse, a atividade e a
-- notificação na mesma transação. O envio permanece posterior e independente.
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

  insert into public.email_notifications(organization_id,event_type,lead_id,recipient,subject,metadata)
  values(target_org_id,event_name,target_id,'viagemperfeitatrip@gmail.com',(case when existing then 'Novo interesse — ' else 'Novo lead — ' end)||coalesce(nullif(left(lead_payload->>'experience_name',120),''),'Atendimento geral')||' — '||left(clean_name,100),jsonb_build_object('interest_id',interest_id,'source','site'))
  returning id into notification_id;

  return jsonb_build_object('lead_id',target_id,'interest_id',interest_id,'notification_id',notification_id,'duplicate',existing,'email_status','pendente');
end $$;

revoke all on function public.upsert_public_lead(jsonb) from public;
grant execute on function public.upsert_public_lead(jsonb) to anon,authenticated;

