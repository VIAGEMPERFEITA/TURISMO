begin;

create or replace function public.enqueue_instagram_text(
  target_conversation_id uuid,
  message_body text,
  target_idempotency_key text default null
) returns uuid language plpgsql security definer set search_path=public
as $$
declare
  c public.conversations%rowtype;
  account public.channel_accounts%rowtype;
  new_message_id uuid;
  outbound_id uuid;
  key_value text;
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'not_allowed'; end if;
  if length(trim(coalesce(message_body,''))) not between 1 and 1000 then raise exception 'invalid_message'; end if;
  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null or c.organization_id<>public.current_organization_id() then raise exception 'conversation_not_found'; end if;
  if c.channel<>'instagram' or c.channel_account_id is null or c.external_thread_id is null then raise exception 'not_instagram_conversation'; end if;
  if c.status='encerrada' then raise exception 'conversation_closed'; end if;
  if not (public.can_manage_all() or c.assigned_to=auth.uid()) then raise exception 'not_conversation_owner'; end if;
  if c.customer_service_window_expires_at is null or c.customer_service_window_expires_at<=now() then raise exception 'instagram_service_window_expired'; end if;
  select * into account from public.channel_accounts where id=c.channel_account_id;
  if account.id is null or account.status<>'connected' then raise exception 'instagram_account_not_connected'; end if;
  key_value:=coalesce(nullif(trim(target_idempotency_key),''),gen_random_uuid()::text);
  select id into outbound_id from public.instagram_outbound_messages where organization_id=c.organization_id and idempotency_key=key_value;
  if outbound_id is not null then return outbound_id; end if;
  insert into public.messages(conversation_id,sender_profile_id,direction,message_type,body,delivery_status,provider,author_type)
  values(c.id,auth.uid(),'saida','texto',trim(message_body),'pendente','meta_instagram','humano') returning id into new_message_id;
  insert into public.instagram_outbound_messages(organization_id,channel_account_id,conversation_id,message_id,recipient_id,payload,idempotency_key)
  values(c.organization_id,c.channel_account_id,c.id,new_message_id,c.external_thread_id,jsonb_build_object('text',trim(message_body)),key_value)
  returning id into outbound_id;
  update public.conversations set last_message_at=now(),first_response_at=coalesce(first_response_at,now()),updated_at=now() where id=c.id;
  return outbound_id;
end $$;

revoke all on function public.enqueue_instagram_text(uuid,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_instagram_text(uuid,text,text) to authenticated;
comment on function public.enqueue_instagram_text(uuid,text,text) is 'Registra uma resposta humana do Instagram Direct e sua fila de saída de modo atômico e auditável.';

commit;
