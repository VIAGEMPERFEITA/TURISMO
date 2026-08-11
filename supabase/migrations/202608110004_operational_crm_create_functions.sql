-- Entradas transacionais para cadastros manuais no CRM.
-- A organização é sempre obtida da sessão autenticada, nunca aceita do navegador.

create or replace function public.crm_create_customer(customer_data jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  customer_id uuid;
  org_id uuid:=public.current_organization_id();
begin
  if auth.uid() is null or org_id is null or not public.has_role('administrador','gestor','consultor') then
    raise exception 'crm_access_denied';
  end if;
  if nullif(trim(customer_data->>'name'),'') is null then
    raise exception 'customer_name_required';
  end if;

  insert into public.customers(
    organization_id,lead_id,name,phone,email,city,state,birth_date,status
  ) values (
    org_id,
    nullif(customer_data->>'lead_id','')::uuid,
    trim(customer_data->>'name'),
    nullif(trim(customer_data->>'phone'),''),
    nullif(lower(trim(customer_data->>'email')),''),
    nullif(trim(customer_data->>'city'),''),
    nullif(trim(customer_data->>'state'),''),
    nullif(customer_data->>'birth_date','')::date,
    coalesce(nullif(customer_data->>'status',''),'ativo')
  ) returning id into customer_id;

  return customer_id;
end $$;

create or replace function public.crm_create_reservation(reservation_data jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  reservation_id uuid;
  org_id uuid:=public.current_organization_id();
  selected_customer uuid:=nullif(reservation_data->>'customer_id','')::uuid;
  selected_caravan uuid:=nullif(reservation_data->>'caravan_id','')::uuid;
begin
  if auth.uid() is null or org_id is null or not public.has_role('administrador','gestor','consultor') then
    raise exception 'crm_access_denied';
  end if;
  if selected_customer is null or not exists(
    select 1 from public.customers where id=selected_customer and organization_id=org_id
  ) then raise exception 'invalid_customer'; end if;
  if selected_caravan is not null and not exists(
    select 1 from public.caravans where id=selected_caravan and organization_id=org_id
  ) then raise exception 'invalid_caravan'; end if;

  insert into public.reservations(
    organization_id,customer_id,caravan_id,lead_id,reservation_code,status,
    travelers_count,departure_city,final_value,payment_status,created_by
  ) values (
    org_id,selected_customer,selected_caravan,
    nullif(reservation_data->>'lead_id','')::uuid,
    nullif(trim(reservation_data->>'reservation_code'),''),
    coalesce(nullif(reservation_data->>'status',''),'pre_reserva'),
    greatest(coalesce(nullif(reservation_data->>'travelers_count','')::integer,1),1),
    nullif(trim(reservation_data->>'departure_city'),''),
    nullif(reservation_data->>'final_value','')::numeric,
    coalesce(nullif(reservation_data->>'payment_status',''),'pendente'),
    auth.uid()
  ) returning id into reservation_id;

  return reservation_id;
end $$;

revoke all on function public.crm_create_customer(jsonb) from public,anon;
revoke all on function public.crm_create_reservation(jsonb) from public,anon;
grant execute on function public.crm_create_customer(jsonb) to authenticated;
grant execute on function public.crm_create_reservation(jsonb) to authenticated;
