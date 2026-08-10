begin;

create or replace function public.return_conversation_to_ai(
  target_conversation_id uuid,
  context_summary text default null,
  resume_at timestamptz default now()
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  c public.conversations%rowtype;
  target_org uuid:=public.current_organization_id();
  immediate boolean;
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'not_allowed'; end if;
  select * into c from public.conversations where id=target_conversation_id for update;
  if c.id is null or c.organization_id<>target_org then raise exception 'conversation_not_found'; end if;
  if not (public.can_manage_all() or c.assigned_to=auth.uid()) then raise exception 'not_conversation_owner'; end if;
  immediate:=coalesce(resume_at,now())<=now();
  update public.human_takeovers as ht
    set ended_at=now(),ended_by=auth.uid(),return_to_ai=true,
        context_summary=left(return_conversation_to_ai.context_summary,4000)
    where ht.conversation_id=c.id and ht.ended_at is null;
  update public.conversation_assignments as ca
    set ended_at=now(),end_reason='devolvida_para_ia'
    where ca.conversation_id=c.id and ca.ended_at is null;
  update public.conversations as cv
    set assigned_to=null,control_mode=case when immediate then 'ia' else 'pausada' end,
        ai_managed=immediate,ai_paused_at=null,ai_paused_by=null,
        ai_resume_at=case when immediate then null else resume_at end,
        human_takeover_at=null,requires_human=false,
        status=case when immediate then 'ia_ativa' else 'retorno_ia' end,
        next_action=case when immediate then 'Atendimento retomado pela IA' else 'Retorno programado para IA' end,
        lock_version=cv.lock_version+1,updated_at=now()
    where cv.id=c.id;
  insert into public.messages(conversation_id,sender_profile_id,direction,message_type,body,author_type,metadata)
  values(
    c.id,auth.uid(),'interno','sistema',
    coalesce(nullif(left(return_conversation_to_ai.context_summary,4000),''),'Conversa devolvida para a IA.'),
    'sistema',jsonb_build_object('event','returned_to_ai','resume_at',resume_at)
  );
  return jsonb_build_object(
    'conversation_id',c.id,
    'control_mode',case when immediate then 'ia' else 'pausada' end,
    'resume_at',case when immediate then null else resume_at end
  );
end $$;

revoke all on function public.return_conversation_to_ai(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.return_conversation_to_ai(uuid,text,timestamptz) to authenticated;

commit;
