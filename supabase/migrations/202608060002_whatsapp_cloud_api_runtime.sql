-- Runtime seguro para entrada e saída pela WhatsApp Cloud API.
begin;

create or replace function public.enqueue_whatsapp_text(
  target_conversation_id uuid,
  message_body text,
  target_idempotency_key text default null
) returns uuid language plpgsql security definer set search_path=public
as $$
declare
  c public.conversations%rowtype;
  new_message_id uuid;
  outbound_id uuid;
  key_value text;
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'not_allowed'; end if;
  if length(trim(coalesce(message_body,''))) not between 1 and 4096 then raise exception 'invalid_message'; end if;
  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null or c.organization_id<>public.current_organization_id() then raise exception 'conversation_not_found'; end if;
  if c.channel<>'whatsapp' or c.whatsapp_account_id is null or c.contact_wa_id is null then raise exception 'not_whatsapp_conversation'; end if;
  if c.status='encerrada' then raise exception 'conversation_closed'; end if;
  if not (public.can_manage_all() or c.assigned_to=auth.uid()) then raise exception 'not_conversation_owner'; end if;
  if c.customer_service_window_expires_at is null or c.customer_service_window_expires_at<=now() then raise exception 'template_required_outside_service_window'; end if;
  key_value:=coalesce(nullif(trim(target_idempotency_key),''),gen_random_uuid()::text);

  select id into outbound_id from public.whatsapp_outbound_messages
  where organization_id=c.organization_id and idempotency_key=key_value;
  if outbound_id is not null then return outbound_id; end if;

  insert into public.messages(conversation_id,sender_profile_id,direction,message_type,body,delivery_status,whatsapp_account_id,provider,author_type)
  values(c.id,auth.uid(),'saida','texto',trim(message_body),'pendente',c.whatsapp_account_id,'meta_whatsapp','humano')
  returning id into new_message_id;

  insert into public.whatsapp_outbound_messages(
    organization_id,whatsapp_account_id,conversation_id,message_id,requested_by,author_type,message_type,
    recipient_wa_id,payload,idempotency_key
  ) values(
    c.organization_id,c.whatsapp_account_id,c.id,new_message_id,auth.uid(),'humano','texto',
    c.contact_wa_id,jsonb_build_object('type','text','text',jsonb_build_object('preview_url',false,'body',trim(message_body))),key_value
  ) returning id into outbound_id;
  update public.conversations set last_message_at=now(),first_response_at=coalesce(first_response_at,now()),updated_at=now() where id=c.id;
  return outbound_id;
end $$;

revoke all on function public.enqueue_whatsapp_text(uuid,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_whatsapp_text(uuid,text,text) to authenticated;

create index if not exists whatsapp_outbound_external_message_idx
  on public.whatsapp_outbound_messages(external_message_id)
  where external_message_id is not null;

comment on function public.enqueue_whatsapp_text(uuid,text,text) is
'Registra mensagem humana e fila de saída atomicamente. O envio externo é feito somente pela Edge Function privada.';

commit;
