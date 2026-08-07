-- Fase 3: integridade e automações dos módulos operacionais do CRM.

alter table public.reservations
  add constraint reservations_travelers_positive check(travelers_count>0) not valid,
  add constraint reservations_values_non_negative check(
    (total_value is null or total_value>=0) and
    (final_value is null or final_value>=0) and discount>=0
  ) not valid;
alter table public.payments
  add constraint payments_amount_positive check(amount>0) not valid;
alter table public.documents
  add constraint documents_type_not_blank check(length(trim(document_type))>0) not valid;

create index if not exists customers_org_status_name_idx on public.customers(organization_id,status,name);
create index if not exists reservations_org_status_created_idx on public.reservations(organization_id,status,created_at desc);
create index if not exists payments_reservation_status_due_idx on public.payments(reservation_id,status,due_date);
create index if not exists documents_reservation_status_idx on public.documents(reservation_id,status,expires_at);

create sequence if not exists public.reservation_code_sequence start 1000;
create or replace function public.set_reservation_code() returns trigger
language plpgsql set search_path=public
as $$
begin
  if new.reservation_code is null or trim(new.reservation_code)='' then
    new.reservation_code='VP-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.reservation_code_sequence')::text,6,'0');
  end if;
  return new;
end $$;
drop trigger if exists set_reservation_code_trigger on public.reservations;
create trigger set_reservation_code_trigger before insert on public.reservations
for each row execute function public.set_reservation_code();

create or replace function public.sync_reservation_payment_status() returns trigger
language plpgsql security definer set search_path=public
as $$
declare target_reservation uuid; total_due numeric; total_paid numeric;
begin
  target_reservation=coalesce(new.reservation_id,old.reservation_id);
  select coalesce(sum(amount),0),coalesce(sum(amount) filter(where status='pago'),0)
  into total_due,total_paid from public.payments where reservation_id=target_reservation and status<>'cancelado';
  update public.reservations set
    payment_status=case when total_due=0 then 'pendente' when total_paid>=total_due then 'pago' when total_paid>0 then 'parcial' else 'pendente' end,
    updated_at=now()
  where id=target_reservation;
  return coalesce(new,old);
end $$;
drop trigger if exists sync_reservation_payment_status_trigger on public.payments;
create trigger sync_reservation_payment_status_trigger
after insert or update of amount,status or delete on public.payments
for each row execute function public.sync_reservation_payment_status();

create or replace function public.convert_lead_to_customer(target_lead_id uuid)
returns uuid language plpgsql security definer set search_path=public
as $$
declare source_lead public.leads%rowtype; customer_id uuid;
begin
  if not public.has_role('administrador','gestor','consultor') or not public.can_access_lead(target_lead_id) then
    raise exception 'acesso não autorizado';
  end if;
  select * into source_lead from public.leads where id=target_lead_id for update;
  if source_lead.converted_customer_id is not null then return source_lead.converted_customer_id; end if;
  insert into public.customers(organization_id,lead_id,name,phone,email,city,state,status)
  values(source_lead.organization_id,source_lead.id,source_lead.name,source_lead.phone,source_lead.email,source_lead.city,source_lead.state,'ativo')
  returning id into customer_id;
  update public.leads set converted_customer_id=customer_id,updated_at=now() where id=source_lead.id;
  insert into public.lead_activities(lead_id,user_id,activity_type,title,metadata)
  values(source_lead.id,auth.uid(),'lead_converted','Lead convertido em cliente',jsonb_build_object('customer_id',customer_id));
  return customer_id;
end $$;
revoke all on function public.convert_lead_to_customer(uuid) from public,anon;
grant execute on function public.convert_lead_to_customer(uuid) to authenticated;

comment on function public.convert_lead_to_customer(uuid) is 'Converte um lead acessível em cliente, de forma transacional e sem duplicar a conversão.';
