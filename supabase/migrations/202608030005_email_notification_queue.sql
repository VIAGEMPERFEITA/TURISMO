-- A notificação é uma segunda camada: o lead, interesse e atividade são gravados
-- antes da criação do item de fila. Falha de e-mail nunca reverte o lead.
alter table public.leads add column if not exists email_notification_status text not null default 'pendente';
alter table public.leads add column if not exists email_notification_sent_at timestamptz;

create table if not exists public.email_notifications(
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  lead_id uuid references public.leads(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  recipient text not null default 'viagemperfeitatrip@gmail.com',
  subject text not null,
  status text not null default 'pendente' check(status in('pendente','processando','enviado','falhou','cancelado')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  last_error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_notifications_queue_idx on public.email_notifications(status,scheduled_at);
create index if not exists email_notifications_lead_idx on public.email_notifications(lead_id,created_at desc);
alter table public.email_notifications enable row level security;
create policy managers_email_notifications_read on public.email_notifications for select to authenticated using(public.current_role() in ('administrador','gestor'));
create policy managers_email_notifications_retry on public.email_notifications for update to authenticated using(public.current_role() in ('administrador','gestor')) with check(public.current_role() in ('administrador','gestor'));

insert into public.system_settings(key,value) values('email_notifications','{"new_lead":true,"new_interest":true,"reservation_started":true,"reservation_confirmed":true,"overdue_payment":true,"pending_document":true,"daily_digest":true,"daily_digest_hour":"18:00","max_attempts":3}'::jsonb) on conflict(key) do nothing;

create or replace function public.upsert_public_lead(lead_payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare target_id uuid;interest_id uuid;notification_id uuid;existing boolean:=false;event_name text;
begin
  if coalesce(trim(lead_payload->>'name'),'')='' or coalesce(trim(lead_payload->>'phone_normalized'),'')='' or coalesce((lead_payload->>'consent')::boolean,false)=false then raise exception 'invalid lead';end if;
  select id into target_id from public.leads where deleted_at is null and (phone_normalized=lead_payload->>'phone_normalized' or (nullif(lower(lead_payload->>'email'),'') is not null and lower(email)=lower(lead_payload->>'email'))) order by updated_at desc limit 1;
  if target_id is null then
    insert into public.leads(name,phone,phone_normalized,email,city,state,source,source_detail,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_page,referrer,consent,consent_at,email_notification_status)
    values(lead_payload->>'name',lead_payload->>'phone',lead_payload->>'phone_normalized',nullif(lead_payload->>'email',''),nullif(lead_payload->>'city',''),nullif(lead_payload->>'state',''),coalesce(lead_payload->>'source','Site'),lead_payload->>'source_detail',lead_payload->>'utm_source',lead_payload->>'utm_medium',lead_payload->>'utm_campaign',lead_payload->>'utm_content',lead_payload->>'utm_term',lead_payload->>'landing_page',lead_payload->>'referrer',true,coalesce((lead_payload->>'consent_at')::timestamptz,now()),'pendente') returning id into target_id;
  else
    existing:=true;update public.leads set updated_at=now(),name=coalesce(nullif(lead_payload->>'name',''),name),phone=coalesce(nullif(lead_payload->>'phone',''),phone),email=coalesce(nullif(lead_payload->>'email',''),email),city=coalesce(nullif(lead_payload->>'city',''),city),state=coalesce(nullif(lead_payload->>'state',''),state),email_notification_status='pendente' where id=target_id;
  end if;
  insert into public.lead_interests(lead_id,experience_name,destination,desired_period,duration,travelers_count,accommodation,departure_city,payment_preference,main_interest,custom_notes)
  values(target_id,lead_payload->>'experience_name',lead_payload->>'destination',lead_payload->>'desired_period',lead_payload->>'duration',nullif(lead_payload->>'travelers','')::integer,lead_payload->>'accommodation',lead_payload->>'departureCity',lead_payload->>'paymentPreference',lead_payload->>'interest',lead_payload->>'notes') returning id into interest_id;
  event_name:=case when existing then 'new_interest' else 'new_lead' end;
  insert into public.lead_activities(lead_id,activity_type,title,description,metadata) values(target_id,case when existing then 'new_interest' else 'lead_created' end,case when existing then 'Contato existente demonstrou novo interesse' else 'Lead criado pelo site' end,lead_payload->>'source_detail',jsonb_build_object('landing_page',lead_payload->>'landing_page','experience_name',lead_payload->>'experience_name','duration',lead_payload->>'duration','interest_id',interest_id));
  insert into public.email_notifications(event_type,lead_id,recipient,subject) values(event_name,target_id,'viagemperfeitatrip@gmail.com',(case when existing then 'Novo interesse — ' else 'Novo lead — ' end)||coalesce(nullif(lead_payload->>'experience_name',''),'Atendimento geral')||' — '||lead_payload->>'name') returning id into notification_id;
  return jsonb_build_object('lead_id',target_id,'interest_id',interest_id,'notification_id',notification_id,'duplicate',existing,'email_status','pendente');
end $$;
grant execute on function public.upsert_public_lead(jsonb) to anon,authenticated;
