-- Permite que a equipe comercial cadastre clientes e reservas diretamente pelo CRM.
-- A política anterior exigia que consultores partissem de um lead já atribuído,
-- o que bloqueava cadastros manuais legítimos feitos pelas telas operacionais.

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and public.has_role('administrador','gestor','consultor')
);

drop policy if exists reservations_insert on public.reservations;
create policy reservations_insert on public.reservations
for insert to authenticated
with check (
  organization_id = public.current_organization_id()
  and public.has_role('administrador','gestor','consultor')
  and exists (
    select 1
    from public.customers customer
    where customer.id = customer_id
      and customer.organization_id = public.current_organization_id()
  )
  and (
    caravan_id is null
    or exists (
      select 1
      from public.caravans caravan
      where caravan.id = caravan_id
        and caravan.organization_id = public.current_organization_id()
    )
  )
);
