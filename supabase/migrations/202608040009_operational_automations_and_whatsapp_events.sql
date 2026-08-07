-- Automações comerciais, financeiras, documentais e evento assistido do WhatsApp.

alter table public.tasks add column if not exists reservation_id uuid references public.reservations(id) on delete cascade;
alter table public.tasks add column if not exists proposal_id uuid references public.proposals(id) on delete cascade;
alter table public.tasks add column if not exists task_type text;
alter table public.tasks add column if not exists automation_key text;
create unique index if not exists tasks_automation_key_uidx on public.tasks(organization_id,automation_key) where automation_key is not null;

alter table public.email_notifications add column if not exists proposal_id uuid references public.proposals(id) on delete cascade;
alter table public.email_notifications add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace function public.record_public_whatsapp_started(target_lead_id uuid,origin text default 'site') returns void
language plpgsql security definer set search_path=public as $$
begin
  if target_lead_id is null or length(trim(coalesce(origin,'')))>160 then raise exception 'Evento inválido';end if;
  if not exists(select 1 from public.leads where id=target_lead_id and organization_id=public.default_organization_id() and deleted_at is null) then raise exception 'Lead não encontrado';end if;
  update public.leads set whatsapp_started=true,updated_at=now() where id=target_lead_id;
  if not exists(select 1 from public.lead_activities where lead_id=target_lead_id and activity_type='whatsapp_started' and created_at>now()-interval '1 minute') then
    insert into public.lead_activities(lead_id,activity_type,title,description,metadata) values(target_lead_id,'whatsapp_started','Atendimento iniciado no WhatsApp',left(trim(origin),160),jsonb_build_object('event','whatsapp_started'));
  end if;
end $$;
revoke all on function public.record_public_whatsapp_started(uuid,text) from public;
grant execute on function public.record_public_whatsapp_started(uuid,text) to anon,authenticated;

create or replace function public.prepare_reservation_operations() returns trigger
language plpgsql security definer set search_path=public as $$
declare customer_name text;notification_id uuid;
begin
  insert into public.tasks(organization_id,lead_id,reservation_id,assigned_to,created_by,title,description,due_at,priority,status,task_type,automation_key)
  values(new.organization_id,new.lead_id,new.id,null,new.created_by,'Confirmar entrada da reserva','Validar o pagamento da entrada e confirmar a continuidade da reserva.',now()+interval '1 day','alta','pendente','reserva_entrada','reservation-entry:'||new.id::text)
  on conflict(organization_id,automation_key) where automation_key is not null do nothing;
  insert into public.document_requests(organization_id,reservation_id,document_type,status,requested_by,due_at,notes)
  select new.organization_id,new.id,item,'pendente',new.created_by,now()+interval '7 days','Checklist automático criado no início da reserva.' from unnest(array['Passaporte','Documento de identidade','Contrato','Seguro viagem']) item
  where not exists(select 1 from public.document_requests d where d.reservation_id=new.id and d.document_type=item);
  select name into customer_name from public.customers where id=new.customer_id;
  insert into public.email_notifications(organization_id,event_type,lead_id,reservation_id,recipient,subject,metadata)
  values(new.organization_id,'reservation_started',new.lead_id,new.id,'viagemperfeitatrip@gmail.com','Reserva iniciada — '||coalesce(customer_name,new.reservation_code),jsonb_build_object('reservation_code',new.reservation_code)) returning id into notification_id;
  insert into public.automation_runs(organization_id,event_type,entity_type,entity_id,status,output_data,finished_at) values(new.organization_id,'reservation_started','reservation',new.id,'concluido',jsonb_build_object('email_notification_id',notification_id),now());
  return new;
end $$;
drop trigger if exists prepare_reservation_operations_trigger on public.reservations;
create trigger prepare_reservation_operations_trigger after insert on public.reservations for each row execute function public.prepare_reservation_operations();

create or replace function public.handle_proposal_status_automation() returns trigger
language plpgsql security definer set search_path=public as $$
declare event_name text;notification_id uuid;
begin
  if old.status is not distinct from new.status then return new;end if;
  if new.status='enviada' then
    insert into public.tasks(organization_id,lead_id,proposal_id,assigned_to,created_by,title,description,due_at,priority,status,task_type,automation_key)
    values(new.organization_id,new.lead_id,new.id,new.responsible_id,new.created_by,'Follow-up da proposta '||new.proposal_number,'Verificar retorno do cliente três dias após o envio.',now()+interval '3 days','media','pendente','follow_up_proposta','proposal-followup:'||new.id::text)
    on conflict(organization_id,automation_key) where automation_key is not null do nothing;
    event_name='proposal_sent';
  elsif new.status='aceita' then event_name='proposal_accepted';
  else return new;end if;
  insert into public.email_notifications(organization_id,event_type,lead_id,proposal_id,recipient,subject,metadata)
  values(new.organization_id,event_name,new.lead_id,new.id,'viagemperfeitatrip@gmail.com',(case when new.status='aceita' then 'Proposta aceita — ' else 'Proposta enviada — ' end)||new.proposal_number,jsonb_build_object('proposal_number',new.proposal_number,'status',new.status)) returning id into notification_id;
  insert into public.automation_runs(organization_id,event_type,entity_type,entity_id,status,output_data,finished_at) values(new.organization_id,event_name,'proposal',new.id,'concluido',jsonb_build_object('email_notification_id',notification_id),now());
  return new;
end $$;
drop trigger if exists handle_proposal_status_automation_trigger on public.proposals;
create trigger handle_proposal_status_automation_trigger after update of status on public.proposals for each row execute function public.handle_proposal_status_automation();

create or replace function public.run_operational_automation_cycle() returns jsonb
language plpgsql security definer set search_path=public as $$
declare org_id uuid:=public.default_organization_id();no_response integer:=0;overdue_payments integer:=0;due_payments integer:=0;pending_documents integer:=0;expiring_proposals integer:=0;
begin
  if auth.role()<>'service_role' and not public.can_manage_all() then raise exception 'Acesso não autorizado';end if;
  insert into public.tasks(organization_id,lead_id,assigned_to,title,description,due_at,priority,status,task_type,automation_key)
  select l.organization_id,l.id,l.assigned_to,'Follow-up de lead sem resposta','Lead sem interação registrada há pelo menos 24 horas.',now(),'alta','pendente','follow_up_lead','lead-no-response:'||l.id::text
  from public.leads l where l.organization_id=org_id and l.deleted_at is null and l.status in('novo_lead','primeiro_contato','em_atendimento','aguardando_resposta') and coalesce(l.last_contact_at,l.created_at)<=now()-interval '24 hours'
  on conflict(organization_id,automation_key) where automation_key is not null do nothing;
  get diagnostics no_response=row_count;

  update public.payments p set status='atrasado',updated_at=now() from public.reservations r where p.reservation_id=r.id and r.organization_id=org_id and p.status='pendente' and p.due_date<current_date;
  get diagnostics overdue_payments=row_count;
  insert into public.tasks(organization_id,lead_id,reservation_id,assigned_to,title,description,due_at,priority,status,task_type,automation_key)
  select r.organization_id,r.lead_id,r.id,r.created_by,'Cobrar parcela vencida','Pagamento "'||p.description||'" venceu em '||to_char(p.due_date,'DD/MM/YYYY')||'.',now(),'alta','pendente','pagamento_vencido','payment-overdue:'||p.id::text
  from public.payments p join public.reservations r on r.id=p.reservation_id where r.organization_id=org_id and p.status='atrasado'
  on conflict(organization_id,automation_key) where automation_key is not null do nothing;

  insert into public.tasks(organization_id,lead_id,reservation_id,assigned_to,title,description,due_at,priority,status,task_type,automation_key)
  select r.organization_id,r.lead_id,r.id,r.created_by,'Parcela próxima do vencimento','Pagamento "'||p.description||'" vence em '||to_char(p.due_date,'DD/MM/YYYY')||'.',now(),'media','pendente','parcela_a_vencer','payment-due:'||p.id::text
  from public.payments p join public.reservations r on r.id=p.reservation_id where r.organization_id=org_id and p.status='pendente' and p.due_date between current_date and current_date+3
  on conflict(organization_id,automation_key) where automation_key is not null do nothing;
  get diagnostics due_payments=row_count;

  insert into public.tasks(organization_id,lead_id,reservation_id,assigned_to,title,description,due_at,priority,status,task_type,automation_key)
  select d.organization_id,r.lead_id,d.reservation_id,r.created_by,'Documento pendente: '||d.document_type,'Documento não recebido dentro do prazo cadastrado.',now(),'alta','pendente','documento_pendente','document-overdue:'||d.id::text
  from public.document_requests d join public.reservations r on r.id=d.reservation_id where d.organization_id=org_id and d.status='pendente' and d.due_at<now()
  on conflict(organization_id,automation_key) where automation_key is not null do nothing;
  get diagnostics pending_documents=row_count;

  update public.proposals set status='vencida',updated_at=now() where organization_id=org_id and status in('aprovada','enviada','visualizada') and valid_until<now();
  get diagnostics expiring_proposals=row_count;

  insert into public.automation_runs(organization_id,event_type,entity_type,status,input_data,output_data,finished_at)
  values(org_id,'scheduled_cycle','organization','concluido',jsonb_build_object('executed_at',now()),jsonb_build_object('lead_followups',no_response,'payments_marked_overdue',overdue_payments,'payments_due_tasks',due_payments,'document_tasks',pending_documents,'proposals_expired',expiring_proposals),now());
  return jsonb_build_object('lead_followups',no_response,'payments_marked_overdue',overdue_payments,'payments_due_tasks',due_payments,'document_tasks',pending_documents,'proposals_expired',expiring_proposals);
end $$;
revoke all on function public.run_operational_automation_cycle() from public,anon;
grant execute on function public.run_operational_automation_cycle() to authenticated,service_role;

insert into public.automation_rules(organization_id,name,event_type,conditions,actions) values
(public.default_organization_id(),'Follow-up após 24 horas','scheduled_cycle','{"lead_without_response_hours":24}'::jsonb,'[{"type":"create_task","priority":"alta"}]'::jsonb),
(public.default_organization_id(),'Follow-up de proposta em 3 dias','proposal_sent','{"proposal_status":"enviada","delay_days":3}'::jsonb,'[{"type":"create_task","priority":"media"}]'::jsonb),
(public.default_organization_id(),'Checklist de reserva','reservation_started','{"reservation_status":"pre_reserva"}'::jsonb,'[{"type":"create_checklist"},{"type":"request_documents"},{"type":"queue_email"}]'::jsonb),
(public.default_organization_id(),'Parcela próxima do vencimento','scheduled_cycle','{"due_within_days":3}'::jsonb,'[{"type":"create_task"}]'::jsonb)
on conflict(organization_id,name) do update set conditions=excluded.conditions,actions=excluded.actions,active=true,updated_at=now();

