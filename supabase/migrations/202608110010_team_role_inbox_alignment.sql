begin;

-- Atendentes precisam participar da caixa compartilhada como os consultores.
create or replace function public.sync_default_inbox_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active = true and new.role in ('administrador','gestor','consultor','atendimento') then
    insert into public.inbox_queue_members(queue_id, profile_id, active)
    select q.id, new.id, true
    from public.inbox_queues q
    where q.organization_id = new.organization_id and q.is_default = true and q.active = true
    on conflict(queue_id, profile_id) do update set active = true;
  else
    update public.inbox_queue_members qm
    set active = false
    from public.inbox_queues q
    where qm.queue_id = q.id and qm.profile_id = new.id and q.is_default = true;
  end if;

  return new;
end;
$$;

insert into public.inbox_queue_members(queue_id, profile_id, active)
select q.id, p.id, true
from public.inbox_queues q
join public.profiles p on p.organization_id = q.organization_id
where q.is_default = true and q.active = true
  and p.active = true
  and p.role in ('administrador','gestor','consultor','atendimento')
on conflict(queue_id, profile_id) do update set active = true;

commit;
