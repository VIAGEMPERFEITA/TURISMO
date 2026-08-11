-- Auditoria operacional dos módulos que passaram a permitir cadastro e edição no CRM.
-- Pagamentos e documentos herdam a organização da reserva relacionada.

create or replace function public.write_crm_audit_log() returns trigger
language plpgsql security definer set search_path=public
as $$
declare
  row_before jsonb;
  row_after jsonb;
  entity uuid;
  org uuid;
  reservation uuid;
begin
  row_before=case when tg_op='INSERT' then null else to_jsonb(old) end;
  row_after=case when tg_op='DELETE' then null else to_jsonb(new) end;
  entity=coalesce((row_after->>'id')::uuid,(row_before->>'id')::uuid);
  org=coalesce(
    nullif(row_after->>'organization_id','')::uuid,
    nullif(row_before->>'organization_id','')::uuid
  );

  if org is null and tg_table_name in ('payments','documents') then
    reservation=coalesce(
      nullif(row_after->>'reservation_id','')::uuid,
      nullif(row_before->>'reservation_id','')::uuid
    );
    select organization_id into org from public.reservations where id=reservation;
  end if;

  if org is null then
    raise exception 'Não foi possível identificar a organização para auditoria de %.',tg_table_name;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,before_data,after_data)
  values(org,auth.uid(),lower(tg_op),tg_table_name,entity,row_before,row_after);
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['leads','tasks','customers','reservations','payments','documents'] loop
    execute format('drop trigger if exists crm_audit_trigger on public.%I',table_name);
    execute format('create trigger crm_audit_trigger after insert or update or delete on public.%I for each row execute function public.write_crm_audit_log()',table_name);
  end loop;
end $$;

create index if not exists audit_logs_entity_history_idx
  on public.audit_logs(organization_id,entity_id,created_at desc);

