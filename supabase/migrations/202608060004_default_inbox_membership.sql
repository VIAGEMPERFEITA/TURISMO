-- Mantém automaticamente a equipe ativa vinculada à fila principal de atendimento.
begin;

insert into public.inbox_queue_members(queue_id,profile_id,active)
select q.id,p.id,true
from public.profiles p
join public.inbox_queues q on q.organization_id=p.organization_id and q.is_default=true and q.active=true
where p.active=true and p.role in ('administrador','gestor','consultor')
on conflict(queue_id,profile_id) do update set active=true;

create or replace function public.sync_default_inbox_membership()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.active=true and new.role in ('administrador','gestor','consultor') then
    insert into public.inbox_queue_members(queue_id,profile_id,active)
    select q.id,new.id,true
    from public.inbox_queues q
    where q.organization_id=new.organization_id and q.is_default=true and q.active=true
    on conflict(queue_id,profile_id) do update set active=true;
  else
    update public.inbox_queue_members qm
    set active=false
    from public.inbox_queues q
    where qm.queue_id=q.id and qm.profile_id=new.id and q.is_default=true;
  end if;
  return new;
end $$;

drop trigger if exists profiles_sync_default_inbox_membership on public.profiles;
create trigger profiles_sync_default_inbox_membership
after insert or update of organization_id,role,active on public.profiles
for each row execute function public.sync_default_inbox_membership();

revoke all on function public.sync_default_inbox_membership() from public,anon,authenticated;

commit;
