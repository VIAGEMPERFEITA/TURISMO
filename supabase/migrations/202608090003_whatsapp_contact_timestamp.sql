-- Mantém a recência comercial alinhada ao início real do atendimento.

create or replace function public.record_public_whatsapp_started(target_lead_id uuid,origin text default 'site') returns void
language plpgsql security definer set search_path=public as $$
begin
  if target_lead_id is null or length(trim(coalesce(origin,'')))>160 then raise exception 'Evento inválido';end if;
  if not exists(select 1 from public.leads where id=target_lead_id and organization_id=public.default_organization_id() and deleted_at is null) then raise exception 'Lead não encontrado';end if;
  update public.leads set whatsapp_started=true,last_contact_at=now(),updated_at=now() where id=target_lead_id;
  if not exists(select 1 from public.lead_activities where lead_id=target_lead_id and activity_type='whatsapp_started' and created_at>now()-interval '1 minute') then
    insert into public.lead_activities(lead_id,activity_type,title,description,metadata) values(target_lead_id,'whatsapp_started','Atendimento iniciado no WhatsApp',left(trim(origin),160),jsonb_build_object('event','whatsapp_started'));
  end if;
end $$;

revoke all on function public.record_public_whatsapp_started(uuid,text) from public;
grant execute on function public.record_public_whatsapp_started(uuid,text) to anon,authenticated;
