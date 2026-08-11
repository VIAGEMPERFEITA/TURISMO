-- Evita que gatilhos relacionais falhem quando uma tabela não possui todos os
-- campos das outras entidades validadas pela mesma função.
-- A leitura via JSONB é segura mesmo se um gatilho legado estiver associado a
-- uma tabela inesperada, enquanto a validação continua restrita pelo nome dela.

create or replace function public.validate_financial_and_document_relations()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  payload jsonb := to_jsonb(new);
  target_organization uuid := nullif(payload->>'organization_id','')::uuid;
  target_payment uuid := nullif(payload->>'payment_id','')::uuid;
  target_reservation uuid := nullif(payload->>'reservation_id','')::uuid;
begin
  if tg_table_name='payment_transactions' then
    if target_payment is null or target_organization is null or not exists(
      select 1
      from public.payments p
      join public.reservations r on r.id=p.reservation_id
      where p.id=target_payment and r.organization_id=target_organization
    ) then
      raise exception 'payment belongs to another organization';
    end if;
  elsif tg_table_name='document_requests' then
    if target_reservation is null or target_organization is null or not exists(
      select 1 from public.reservations r
      where r.id=target_reservation and r.organization_id=target_organization
    ) then
      raise exception 'reservation belongs to another organization';
    end if;
  end if;

  return new;
end $$;

