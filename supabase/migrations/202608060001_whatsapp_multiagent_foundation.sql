-- Central oficial de atendimento WhatsApp: caixa compartilhada, filas e alternância IA/humano.
-- Esta fase prepara o banco; tokens da Meta permanecem exclusivamente em Edge Function Secrets.

begin;

update public.organizations
set phone = '5531995285665', updated_at = now()
where slug = 'viagem-perfeita';

create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'WhatsApp principal',
  phone_e164 text not null check (phone_e164 ~ '^[1-9][0-9]{9,14}$'),
  display_phone text not null,
  waba_id text,
  phone_number_id text,
  meta_app_id text,
  api_version text not null default 'v23.0',
  status text not null default 'configuracao' check (status in ('configuracao','teste','ativo','pausado','erro','desativado')),
  coexistence_enabled boolean not null default false,
  verified_name text,
  quality_rating text,
  token_secret_name text not null default 'META_WHATSAPP_ACCESS_TOKEN',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone_e164),
  unique (phone_number_id)
);

comment on column public.whatsapp_accounts.token_secret_name is
'Somente o nome do secret. O token real nunca é persistido no banco.';

insert into public.whatsapp_accounts(organization_id,name,phone_e164,display_phone,status)
select id,'WhatsApp principal','5531995285665','(31) 99528-5665','configuracao'
from public.organizations where slug='viagem-perfeita'
on conflict(organization_id,phone_e164) do update set
  display_phone=excluded.display_phone,
  updated_at=now();

create table if not exists public.inbox_queues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  routing_strategy text not null default 'least_active' check (routing_strategy in ('round_robin','least_active','manual','specialty')),
  max_wait_minutes integer not null default 15 check (max_wait_minutes between 1 and 1440),
  default_agent_capacity integer not null default 8 check (default_agent_capacity between 1 and 100),
  destination_tags text[] not null default '{}',
  is_default boolean not null default false,
  active boolean not null default true,
  last_assigned_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);
create unique index if not exists inbox_queues_one_default_idx
  on public.inbox_queues(organization_id) where is_default=true and active=true;

insert into public.inbox_queues(organization_id,name,description,is_default)
select id,'Atendimento geral','Fila principal da Viagem Perfeita Turismo',true
from public.organizations where slug='viagem-perfeita'
on conflict(organization_id,name) do update set is_default=true,active=true,updated_at=now();

create table if not exists public.inbox_queue_members (
  queue_id uuid not null references public.inbox_queues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  priority integer not null default 100 check (priority between 1 and 1000),
  capacity_override integer check (capacity_override between 1 and 100),
  specialties text[] not null default '{}',
  active boolean not null default true,
  last_assigned_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key(queue_id,profile_id)
);

create table if not exists public.agent_presence (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'offline' check (status in ('online','ausente','ocupado','offline')),
  accepts_automatic_assignments boolean not null default true,
  max_concurrent_conversations integer not null default 8 check (max_concurrent_conversations between 1 and 100),
  active_conversations integer not null default 0 check (active_conversations>=0),
  last_seen_at timestamptz,
  status_changed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations
  add column if not exists whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  add column if not exists queue_id uuid references public.inbox_queues(id) on delete set null,
  add column if not exists contact_wa_id text,
  add column if not exists control_mode text not null default 'humano',
  add column if not exists priority text not null default 'normal',
  add column if not exists ai_paused_at timestamptz,
  add column if not exists ai_paused_by uuid references public.profiles(id) on delete set null,
  add column if not exists ai_resume_at timestamptz,
  add column if not exists human_takeover_at timestamptz,
  add column if not exists last_customer_message_at timestamptz,
  add column if not exists customer_service_window_expires_at timestamptz,
  add column if not exists lock_version integer not null default 0,
  add column if not exists first_response_at timestamptz;

update public.conversations
set control_mode=case when ai_managed then 'ia' else 'humano' end
where control_mode is null or control_mode not in ('ia','humano','assistida','pausada');

alter table public.conversations drop constraint if exists conversations_control_mode_check;
alter table public.conversations add constraint conversations_control_mode_check
  check(control_mode in ('ia','humano','assistida','pausada'));
alter table public.conversations drop constraint if exists conversations_priority_check;
alter table public.conversations add constraint conversations_priority_check
  check(priority in ('baixa','normal','alta','urgente'));
alter table public.conversations drop constraint if exists conversations_status_check;
alter table public.conversations add constraint conversations_status_check
  check(status in ('aberta','ia_ativa','aguardando_equipe','humano_ativo','aguardando_cliente','retorno_ia','encerrada'));
alter table public.conversations drop constraint if exists conversations_lock_version_check;
alter table public.conversations add constraint conversations_lock_version_check check(lock_version>=0);

create unique index if not exists conversations_whatsapp_thread_uidx
  on public.conversations(organization_id,whatsapp_account_id,external_thread_id)
  where channel='whatsapp' and external_thread_id is not null;
create index if not exists conversations_shared_inbox_idx
  on public.conversations(organization_id,queue_id,status,priority,last_message_at desc)
  where status<>'encerrada';
create index if not exists conversations_ai_resume_idx
  on public.conversations(ai_resume_at)
  where status='retorno_ia' and ai_resume_at is not null;

alter table public.messages
  add column if not exists whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  add column if not exists provider text,
  add column if not exists author_type text not null default 'sistema',
  add column if not exists provider_timestamp timestamptz,
  add column if not exists reply_to_external_message_id text,
  add column if not exists error_code text,
  add column if not exists error_message text;

update public.messages set author_type=case
  when direction='entrada' then 'cliente'
  when sender_profile_id is not null then 'humano'
  when metadata->>'source'='ai_assistant' then 'ia'
  else 'sistema' end;
alter table public.messages drop constraint if exists messages_author_type_check;
alter table public.messages add constraint messages_author_type_check
  check(author_type in ('cliente','ia','humano','sistema'));
create unique index if not exists messages_provider_external_uidx
  on public.messages(provider,external_message_id)
  where provider is not null and external_message_id is not null;

create table if not exists public.conversation_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  queue_id uuid references public.inbox_queues(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assignment_source text not null default 'manual' check (assignment_source in ('manual','automatico','transferencia','retorno')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  check(ended_at is null or ended_at>=assigned_at)
);
create unique index if not exists conversation_one_active_assignment_idx
  on public.conversation_assignments(conversation_id) where ended_at is null;
create index if not exists conversation_assignments_profile_idx
  on public.conversation_assignments(profile_id,ended_at,assigned_at desc);

create table if not exists public.conversation_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  from_profile_id uuid references public.profiles(id) on delete set null,
  to_profile_id uuid references public.profiles(id) on delete set null,
  from_queue_id uuid references public.inbox_queues(id) on delete set null,
  to_queue_id uuid references public.inbox_queues(id) on delete set null,
  transferred_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  check(to_profile_id is not null or to_queue_id is not null)
);

create table if not exists public.human_takeovers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  return_to_ai boolean not null default false,
  context_summary text,
  ended_by uuid references public.profiles(id) on delete set null,
  check(ended_at is null or ended_at>=started_at)
);
create unique index if not exists human_takeovers_one_active_idx
  on public.human_takeovers(conversation_id) where ended_at is null;

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  whatsapp_account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  meta_template_id text,
  name text not null,
  language_code text not null default 'pt_BR',
  category text not null check(category in ('marketing','utility','authentication')),
  status text not null default 'rascunho' check(status in ('rascunho','pendente','aprovado','rejeitado','pausado','desativado')),
  components jsonb not null default '[]'::jsonb,
  purpose text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(whatsapp_account_id,name,language_code)
);

create table if not exists public.whatsapp_outbound_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  whatsapp_account_id uuid not null references public.whatsapp_accounts(id) on delete restrict,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  author_type text not null check(author_type in ('ia','humano','sistema')),
  message_type text not null default 'texto' check(message_type in ('texto','imagem','video','audio','documento','template','interativo')),
  recipient_wa_id text not null check(recipient_wa_id ~ '^[1-9][0-9]{9,15}$'),
  payload jsonb not null,
  template_id uuid references public.whatsapp_templates(id) on delete set null,
  idempotency_key text not null,
  status text not null default 'pendente' check(status in ('pendente','processando','enviado','entregue','lido','falhou','cancelado')),
  attempts integer not null default 0 check(attempts between 0 and 10),
  scheduled_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  next_attempt_at timestamptz,
  external_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
create index if not exists whatsapp_outbound_queue_idx
  on public.whatsapp_outbound_messages(status,scheduled_at,next_attempt_at)
  where status in ('pendente','falhou');

create table if not exists public.whatsapp_message_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  outbound_id uuid references public.whatsapp_outbound_messages(id) on delete cascade,
  external_message_id text not null,
  status text not null check(status in ('aceito','enviado','entregue','lido','falhou','excluido')),
  error_code text,
  error_message text,
  provider_timestamp timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check(message_id is not null or outbound_id is not null)
);
create index if not exists whatsapp_status_external_idx
  on public.whatsapp_message_status_history(external_message_id,created_at desc);

-- Eventos brutos usam webhook_events já existente; esta restrição evita uma tabela duplicada.
create index if not exists webhook_events_meta_whatsapp_idx
  on public.webhook_events(organization_id,status,received_at)
  where provider='meta_whatsapp';

create or replace function public.can_access_conversation(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.conversations c
    where c.id=target_conversation_id
      and c.organization_id=public.current_organization_id()
      and (
        public.can_manage_all()
        or c.assigned_to=auth.uid()
        or (c.lead_id is not null and public.can_access_lead(c.lead_id))
        or (c.customer_id is not null and public.can_access_customer(c.customer_id))
        or (c.queue_id is not null and exists(
          select 1 from public.inbox_queue_members qm
          where qm.queue_id=c.queue_id and qm.profile_id=auth.uid() and qm.active=true
        ))
      )
  )
$$;

create or replace function public.set_agent_presence(
  target_status text,
  accept_automatic boolean default true,
  target_capacity integer default 8
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare target_org uuid:=public.current_organization_id();
begin
  if auth.uid() is null or target_org is null then raise exception 'authentication_required'; end if;
  if target_status not in ('online','ausente','ocupado','offline') then raise exception 'invalid_presence_status'; end if;
  target_capacity:=greatest(1,least(target_capacity,100));
  insert into public.agent_presence(profile_id,organization_id,status,accepts_automatic_assignments,max_concurrent_conversations,last_seen_at,status_changed_at)
  values(auth.uid(),target_org,target_status,accept_automatic,target_capacity,now(),now())
  on conflict(profile_id) do update set
    status=excluded.status,
    accepts_automatic_assignments=excluded.accepts_automatic_assignments,
    max_concurrent_conversations=excluded.max_concurrent_conversations,
    last_seen_at=now(),
    status_changed_at=case when public.agent_presence.status is distinct from excluded.status then now() else public.agent_presence.status_changed_at end,
    updated_at=now();
  return jsonb_build_object('profile_id',auth.uid(),'status',target_status,'capacity',target_capacity);
end $$;

create or replace function public.claim_conversation(target_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare c public.conversations%rowtype; target_org uuid:=public.current_organization_id();
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'not_allowed'; end if;
  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null or c.organization_id<>target_org then raise exception 'conversation_not_found'; end if;
  if c.status='encerrada' then raise exception 'conversation_closed'; end if;
  if c.assigned_to is not null and c.assigned_to<>auth.uid() and not public.can_manage_all() then raise exception 'conversation_already_assigned'; end if;

  update public.conversation_assignments set ended_at=now(),end_reason='assumida_por_outro_atendente'
    where conversation_id=c.id and ended_at is null and profile_id<>auth.uid();
  if not exists(select 1 from public.conversation_assignments where conversation_id=c.id and profile_id=auth.uid() and ended_at is null) then
    insert into public.conversation_assignments(organization_id,conversation_id,queue_id,profile_id,assigned_by,assignment_source)
    values(target_org,c.id,c.queue_id,auth.uid(),auth.uid(),'manual');
  end if;
  update public.human_takeovers set ended_at=now(),ended_by=auth.uid(),return_to_ai=false
    where conversation_id=c.id and ended_at is null and profile_id<>auth.uid();
  if not exists(select 1 from public.human_takeovers where conversation_id=c.id and profile_id=auth.uid() and ended_at is null) then
    insert into public.human_takeovers(organization_id,conversation_id,profile_id) values(target_org,c.id,auth.uid());
  end if;
  update public.conversations set assigned_to=auth.uid(),control_mode='humano',ai_managed=false,
    ai_paused_at=now(),ai_paused_by=auth.uid(),ai_resume_at=null,human_takeover_at=now(),
    requires_human=false,status='humano_ativo',lock_version=lock_version+1,updated_at=now()
  where id=c.id;
  insert into public.messages(conversation_id,sender_profile_id,direction,message_type,body,author_type,metadata)
  values(c.id,auth.uid(),'interno','sistema','Atendimento assumido por um consultor.','sistema',jsonb_build_object('event','human_claimed'));
  return jsonb_build_object('conversation_id',c.id,'assigned_to',auth.uid(),'control_mode','humano');
end $$;

create or replace function public.transfer_conversation(
  target_conversation_id uuid,
  target_profile_id uuid default null,
  target_queue_id uuid default null,
  transfer_reason text default null
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare c public.conversations%rowtype; target_org uuid:=public.current_organization_id();
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'not_allowed'; end if;
  if target_profile_id is null and target_queue_id is null then raise exception 'transfer_target_required'; end if;
  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null or c.organization_id<>target_org then raise exception 'conversation_not_found'; end if;
  if not (public.can_manage_all() or c.assigned_to=auth.uid()) then raise exception 'not_conversation_owner'; end if;
  if target_profile_id is not null and not exists(
    select 1 from public.profiles p where p.id=target_profile_id and p.organization_id=target_org and p.active=true and p.role<>'visualizador'
  ) then raise exception 'invalid_target_profile'; end if;
  if target_queue_id is not null and not exists(
    select 1 from public.inbox_queues q where q.id=target_queue_id and q.organization_id=target_org and q.active=true
  ) then raise exception 'invalid_target_queue'; end if;

  insert into public.conversation_transfers(organization_id,conversation_id,from_profile_id,to_profile_id,from_queue_id,to_queue_id,transferred_by,reason)
  values(target_org,c.id,c.assigned_to,target_profile_id,c.queue_id,coalesce(target_queue_id,c.queue_id),auth.uid(),left(transfer_reason,1000));
  update public.conversation_assignments set ended_at=now(),end_reason='transferencia' where conversation_id=c.id and ended_at is null;
  update public.human_takeovers set ended_at=now(),ended_by=auth.uid(),return_to_ai=false where conversation_id=c.id and ended_at is null;

  if target_profile_id is not null then
    insert into public.conversation_assignments(organization_id,conversation_id,queue_id,profile_id,assigned_by,assignment_source)
    values(target_org,c.id,coalesce(target_queue_id,c.queue_id),target_profile_id,auth.uid(),'transferencia');
    insert into public.human_takeovers(organization_id,conversation_id,profile_id) values(target_org,c.id,target_profile_id);
  end if;
  update public.conversations set
    assigned_to=target_profile_id,
    queue_id=coalesce(target_queue_id,queue_id),
    control_mode=case when target_profile_id is null then 'pausada' else 'humano' end,
    ai_managed=false,
    requires_human=true,
    status=case when target_profile_id is null then 'aguardando_equipe' else 'humano_ativo' end,
    human_takeover_at=case when target_profile_id is null then null else now() end,
    lock_version=lock_version+1,updated_at=now()
  where id=c.id;
  return jsonb_build_object('conversation_id',c.id,'assigned_to',target_profile_id,'queue_id',coalesce(target_queue_id,c.queue_id));
end $$;

create or replace function public.return_conversation_to_ai(
  target_conversation_id uuid,
  context_summary text default null,
  resume_at timestamptz default now()
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare c public.conversations%rowtype; target_org uuid:=public.current_organization_id(); immediate boolean;
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'not_allowed'; end if;
  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null or c.organization_id<>target_org then raise exception 'conversation_not_found'; end if;
  if not (public.can_manage_all() or c.assigned_to=auth.uid()) then raise exception 'not_conversation_owner'; end if;
  immediate:=coalesce(resume_at,now())<=now();
  update public.human_takeovers set ended_at=now(),ended_by=auth.uid(),return_to_ai=true,context_summary=left(context_summary,4000)
    where conversation_id=c.id and ended_at is null;
  update public.conversation_assignments set ended_at=now(),end_reason='devolvida_para_ia'
    where conversation_id=c.id and ended_at is null;
  update public.conversations set assigned_to=null,control_mode=case when immediate then 'ia' else 'pausada' end,
    ai_managed=immediate,ai_paused_at=null,ai_paused_by=null,ai_resume_at=case when immediate then null else resume_at end,
    human_takeover_at=null,requires_human=false,status=case when immediate then 'ia_ativa' else 'retorno_ia' end,
    next_action=case when immediate then 'Atendimento retomado pela IA' else 'Retorno programado para IA' end,
    lock_version=lock_version+1,updated_at=now()
  where id=c.id;
  insert into public.messages(conversation_id,sender_profile_id,direction,message_type,body,author_type,metadata)
  values(c.id,auth.uid(),'interno','sistema',coalesce(nullif(left(context_summary,4000),''),'Conversa devolvida para a IA.'),'sistema',jsonb_build_object('event','returned_to_ai','resume_at',resume_at));
  return jsonb_build_object('conversation_id',c.id,'control_mode',case when immediate then 'ia' else 'pausada' end,'resume_at',case when immediate then null else resume_at end);
end $$;

create or replace function public.route_conversation_to_agent(
  target_conversation_id uuid,
  preferred_queue_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare c public.conversations%rowtype; selected_queue uuid; selected_profile uuid; target_org uuid;
begin
  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null then raise exception 'conversation_not_found'; end if;
  target_org:=c.organization_id;
  select q.id into selected_queue from public.inbox_queues q
    where q.organization_id=target_org and q.active=true
      and q.id=coalesce(preferred_queue_id,c.queue_id,q.id)
    order by case when q.id=coalesce(preferred_queue_id,c.queue_id) then 0 when q.is_default then 1 else 2 end,q.created_at limit 1 for update;
  if selected_queue is null then raise exception 'active_queue_not_found'; end if;

  select qm.profile_id into selected_profile
  from public.inbox_queue_members qm
  join public.profiles p on p.id=qm.profile_id and p.active=true and p.organization_id=target_org and p.role<>'visualizador'
  join public.agent_presence ap on ap.profile_id=qm.profile_id and ap.organization_id=target_org
  where qm.queue_id=selected_queue and qm.active=true and ap.status='online' and ap.accepts_automatic_assignments=true
    and (select count(*) from public.conversations x where x.assigned_to=qm.profile_id and x.status<>'encerrada' and x.control_mode='humano')
      < coalesce(qm.capacity_override,ap.max_concurrent_conversations)
  order by
    (select count(*) from public.conversations x where x.assigned_to=qm.profile_id and x.status<>'encerrada' and x.control_mode='humano'),
    qm.last_assigned_at nulls first,qm.priority,p.full_name
  limit 1 for update of qm skip locked;

  if selected_profile is null then
    update public.conversations set queue_id=selected_queue,assigned_to=null,control_mode='pausada',ai_managed=false,
      requires_human=true,status='aguardando_equipe',lock_version=lock_version+1,updated_at=now() where id=c.id;
    return jsonb_build_object('assigned',false,'conversation_id',c.id,'queue_id',selected_queue);
  end if;

  update public.conversation_assignments set ended_at=now(),end_reason='redistribuicao' where conversation_id=c.id and ended_at is null;
  insert into public.conversation_assignments(organization_id,conversation_id,queue_id,profile_id,assignment_source)
  values(target_org,c.id,selected_queue,selected_profile,'automatico');
  insert into public.human_takeovers(organization_id,conversation_id,profile_id) values(target_org,c.id,selected_profile)
    on conflict(conversation_id) where ended_at is null do nothing;
  update public.inbox_queue_members set last_assigned_at=now() where queue_id=selected_queue and profile_id=selected_profile;
  update public.inbox_queues set last_assigned_profile_id=selected_profile,updated_at=now() where id=selected_queue;
  update public.conversations set queue_id=selected_queue,assigned_to=selected_profile,control_mode='humano',ai_managed=false,
    requires_human=false,status='humano_ativo',human_takeover_at=now(),lock_version=lock_version+1,updated_at=now() where id=c.id;
  return jsonb_build_object('assigned',true,'conversation_id',c.id,'queue_id',selected_queue,'profile_id',selected_profile);
end $$;

create or replace function public.resume_due_ai_conversations()
returns integer language plpgsql security definer set search_path=public
as $$
declare affected integer;
begin
  update public.conversations set control_mode='ia',ai_managed=true,ai_resume_at=null,status='ia_ativa',
    next_action='Atendimento retomado automaticamente pela IA',lock_version=lock_version+1,updated_at=now()
  where status='retorno_ia' and control_mode='pausada' and ai_resume_at<=now() and assigned_to is null;
  get diagnostics affected=row_count;
  return affected;
end $$;

-- Segurança e visibilidade da caixa compartilhada.
alter table public.whatsapp_accounts enable row level security;
alter table public.inbox_queues enable row level security;
alter table public.inbox_queue_members enable row level security;
alter table public.agent_presence enable row level security;
alter table public.conversation_assignments enable row level security;
alter table public.conversation_transfers enable row level security;
alter table public.human_takeovers enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_outbound_messages enable row level security;
alter table public.whatsapp_message_status_history enable row level security;

create policy whatsapp_accounts_read on public.whatsapp_accounts for select to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy whatsapp_accounts_manage on public.whatsapp_accounts for all to authenticated
  using(organization_id=public.current_organization_id() and public.has_role('administrador'))
  with check(organization_id=public.current_organization_id() and public.has_role('administrador'));
create policy inbox_queues_read on public.inbox_queues for select to authenticated
  using(organization_id=public.current_organization_id());
create policy inbox_queues_manage on public.inbox_queues for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy inbox_queue_members_read on public.inbox_queue_members for select to authenticated
  using(exists(select 1 from public.inbox_queues q where q.id=queue_id and q.organization_id=public.current_organization_id()));
create policy inbox_queue_members_manage on public.inbox_queue_members for all to authenticated
  using(exists(select 1 from public.inbox_queues q where q.id=queue_id and q.organization_id=public.current_organization_id() and public.can_manage_all()))
  with check(exists(select 1 from public.inbox_queues q where q.id=queue_id and q.organization_id=public.current_organization_id() and public.can_manage_all()));
create policy agent_presence_read on public.agent_presence for select to authenticated
  using(organization_id=public.current_organization_id());
create policy agent_presence_self on public.agent_presence for all to authenticated
  using(organization_id=public.current_organization_id() and profile_id=auth.uid())
  with check(organization_id=public.current_organization_id() and profile_id=auth.uid());
create policy agent_presence_managers on public.agent_presence for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy conversation_assignments_read on public.conversation_assignments for select to authenticated
  using(organization_id=public.current_organization_id() and public.can_access_conversation(conversation_id));
create policy conversation_transfers_read on public.conversation_transfers for select to authenticated
  using(organization_id=public.current_organization_id() and public.can_access_conversation(conversation_id));
create policy human_takeovers_read on public.human_takeovers for select to authenticated
  using(organization_id=public.current_organization_id() and public.can_access_conversation(conversation_id));
create policy whatsapp_templates_read on public.whatsapp_templates for select to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy whatsapp_templates_manage on public.whatsapp_templates for all to authenticated
  using(organization_id=public.current_organization_id() and public.can_manage_all())
  with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy whatsapp_outbound_read on public.whatsapp_outbound_messages for select to authenticated
  using(organization_id=public.current_organization_id() and public.can_access_conversation(conversation_id));
create policy whatsapp_status_history_read on public.whatsapp_message_status_history for select to authenticated
  using(
    organization_id=public.current_organization_id()
    and (
      (message_id is not null and exists(
        select 1 from public.messages m
        where m.id=message_id and public.can_access_conversation(m.conversation_id)
      ))
      or
      (outbound_id is not null and exists(
        select 1 from public.whatsapp_outbound_messages o
        where o.id=outbound_id and public.can_access_conversation(o.conversation_id)
      ))
    )
  );

create policy conversations_queue_read on public.conversations for select to authenticated
  using(organization_id=public.current_organization_id() and queue_id is not null and exists(
    select 1 from public.inbox_queue_members qm where qm.queue_id=conversations.queue_id and qm.profile_id=auth.uid() and qm.active=true
  ));
create policy messages_queue_read on public.messages for select to authenticated
  using(exists(select 1 from public.conversations c join public.inbox_queue_members qm on qm.queue_id=c.queue_id
    where c.id=conversation_id and c.organization_id=public.current_organization_id() and qm.profile_id=auth.uid() and qm.active=true));

-- Escritas de histórico e filas passam apenas pelas funções transacionais ou service_role.
revoke insert,update,delete on public.conversation_assignments,public.conversation_transfers,public.human_takeovers,public.whatsapp_message_status_history from authenticated,anon;
revoke insert,update,delete on public.whatsapp_outbound_messages from authenticated,anon;
revoke all on public.whatsapp_accounts,public.inbox_queues,public.inbox_queue_members,public.agent_presence,public.conversation_assignments,public.conversation_transfers,public.human_takeovers,public.whatsapp_templates,public.whatsapp_outbound_messages,public.whatsapp_message_status_history from anon;

revoke all on function public.can_access_conversation(uuid),public.set_agent_presence(text,boolean,integer),public.claim_conversation(uuid),public.transfer_conversation(uuid,uuid,uuid,text),public.return_conversation_to_ai(uuid,text,timestamptz),public.route_conversation_to_agent(uuid,uuid),public.resume_due_ai_conversations() from public,anon,authenticated;
grant execute on function public.can_access_conversation(uuid),public.set_agent_presence(text,boolean,integer),public.claim_conversation(uuid),public.transfer_conversation(uuid,uuid,uuid,text),public.return_conversation_to_ai(uuid,text,timestamptz) to authenticated;
grant execute on function public.route_conversation_to_agent(uuid,uuid),public.resume_due_ai_conversations() to service_role;

-- Atualização automática e auditoria das mudanças operacionais sensíveis.
do $$
declare table_name text;
begin
  foreach table_name in array array['whatsapp_accounts','inbox_queues','agent_presence','whatsapp_templates','whatsapp_outbound_messages'] loop
    execute format('drop trigger if exists set_updated_at_trigger on public.%I',table_name);
    execute format('create trigger set_updated_at_trigger before update on public.%I for each row execute function public.set_updated_at()',table_name);
  end loop;
  foreach table_name in array array['conversation_assignments','conversation_transfers','human_takeovers'] loop
    execute format('drop trigger if exists crm_audit_trigger on public.%I',table_name);
    execute format('create trigger crm_audit_trigger after insert or update or delete on public.%I for each row execute function public.write_crm_audit_log()',table_name);
  end loop;
end $$;

-- Realtime alimentará a caixa de entrada sem polling agressivo.
do $$
declare table_name text;
begin
  foreach table_name in array array['conversations','messages','agent_presence','whatsapp_outbound_messages'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
end $$;

comment on function public.claim_conversation(uuid) is 'Atendente assume atomicamente uma conversa e pausa a IA.';
comment on function public.transfer_conversation(uuid,uuid,uuid,text) is 'Transfere conversa entre atendentes ou filas com histórico completo.';
comment on function public.return_conversation_to_ai(uuid,text,timestamptz) is 'Encerra a intervenção humana e devolve contexto para a IA imediatamente ou no horário escolhido.';
comment on function public.route_conversation_to_agent(uuid,uuid) is 'Distribuição automática least-active; executada somente pelo backend service_role.';

commit;
