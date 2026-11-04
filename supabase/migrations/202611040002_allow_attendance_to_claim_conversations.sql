begin;

-- A função "atendimento" já participa da fila compartilhada, mas a rotina de
-- assumir conversas ainda bloqueava esse papel. Mantém as mesmas garantias de
-- organização, bloqueio e auditoria usadas pelos consultores.
create or replace function public.claim_conversation(target_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare c public.conversations%rowtype; target_org uuid:=public.current_organization_id();
begin
  if not public.has_role('administrador','gestor','consultor','atendimento') then raise exception 'not_allowed'; end if;
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

revoke all on function public.claim_conversation(uuid) from public,anon,authenticated;
grant execute on function public.claim_conversation(uuid) to authenticated;

commit;
