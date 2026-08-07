-- Orquestração idempotente da IA para conversas recebidas pelo WhatsApp.
begin;

create table if not exists public.whatsapp_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  source_message_id uuid not null references public.messages(id) on delete cascade,
  status text not null default 'processando'
    check(status in ('processando','processado','ignorado','falhou')),
  attempts integer not null default 1 check(attempts between 1 and 10),
  response_text text,
  response_message_id uuid references public.messages(id) on delete set null,
  outbound_id uuid references public.whatsapp_outbound_messages(id) on delete set null,
  provider_response_id text,
  last_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_message_id)
);

create index if not exists whatsapp_ai_jobs_pending_idx
  on public.whatsapp_ai_jobs(status,updated_at)
  where status in ('processando','falhou');

alter table public.whatsapp_ai_jobs enable row level security;

drop policy if exists whatsapp_ai_jobs_read on public.whatsapp_ai_jobs;
create policy whatsapp_ai_jobs_read on public.whatsapp_ai_jobs for select to authenticated
using(
  organization_id=public.current_organization_id()
  and public.can_access_conversation(conversation_id)
);

revoke insert,update,delete on public.whatsapp_ai_jobs from authenticated,anon;
revoke all on public.whatsapp_ai_jobs from anon;

create or replace function public.enqueue_whatsapp_ai_text(
  target_conversation_id uuid,
  source_message_id uuid,
  message_body text
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  c public.conversations%rowtype;
  source_message public.messages%rowtype;
  existing_outbound public.whatsapp_outbound_messages%rowtype;
  new_message_id uuid;
  outbound_id uuid;
  key_value text;
begin
  if length(trim(coalesce(message_body,''))) not between 1 and 4096 then
    raise exception 'invalid_message';
  end if;

  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null then raise exception 'conversation_not_found'; end if;
  if c.channel<>'whatsapp' or c.whatsapp_account_id is null or c.contact_wa_id is null then
    raise exception 'not_whatsapp_conversation';
  end if;
  if c.status='encerrada' then raise exception 'conversation_closed'; end if;
  if c.control_mode<>'ia' or not c.ai_managed or c.requires_human or c.assigned_to is not null then
    raise exception 'ai_not_in_control';
  end if;
  if c.customer_service_window_expires_at is null or c.customer_service_window_expires_at<=now() then
    raise exception 'template_required_outside_service_window';
  end if;

  select * into source_message from public.messages
  where id=source_message_id and conversation_id=c.id and direction='entrada';
  if source_message.id is null then raise exception 'source_message_not_found'; end if;

  key_value:='ai-reply:' || source_message.id::text;
  select * into existing_outbound from public.whatsapp_outbound_messages
  where organization_id=c.organization_id and idempotency_key=key_value;
  if existing_outbound.id is not null then
    return jsonb_build_object(
      'outbound_id',existing_outbound.id,
      'message_id',existing_outbound.message_id,
      'idempotent',true
    );
  end if;

  insert into public.messages(
    conversation_id,direction,message_type,body,delivery_status,
    whatsapp_account_id,provider,author_type,metadata
  ) values(
    c.id,'saida','texto',trim(message_body),'pendente',
    c.whatsapp_account_id,'meta_whatsapp','ia',
    jsonb_build_object('source','whatsapp_ai','reply_to_message_id',source_message.id)
  ) returning id into new_message_id;

  insert into public.whatsapp_outbound_messages(
    organization_id,whatsapp_account_id,conversation_id,message_id,
    author_type,message_type,recipient_wa_id,payload,idempotency_key
  ) values(
    c.organization_id,c.whatsapp_account_id,c.id,new_message_id,
    'ia','texto',c.contact_wa_id,
    jsonb_build_object('type','text','text',jsonb_build_object('preview_url',false,'body',trim(message_body))),
    key_value
  ) returning id into outbound_id;

  update public.conversations set
    last_message_at=now(),
    first_response_at=coalesce(first_response_at,now()),
    updated_at=now()
  where id=c.id;

  return jsonb_build_object('outbound_id',outbound_id,'message_id',new_message_id,'idempotent',false);
end $$;

revoke all on function public.enqueue_whatsapp_ai_text(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.enqueue_whatsapp_ai_text(uuid,uuid,text) to service_role;

comment on table public.whatsapp_ai_jobs is
'Processamento idempotente de cada mensagem recebida antes da resposta automática da IA.';
comment on function public.enqueue_whatsapp_ai_text(uuid,uuid,text) is
'Registra a resposta da IA e a fila oficial do WhatsApp atomicamente, somente enquanto a IA controla a conversa.';

commit;
