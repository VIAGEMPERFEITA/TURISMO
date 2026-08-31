begin;
create or replace function public.resolve_contact_import_issue(target_issue_id uuid,resolution_action text,corrected_name text default null,corrected_phone text default null,resolution_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); issue public.contact_import_issues%rowtype; normalized text; target_lead uuid; target_pipeline uuid; target_stage uuid; was_duplicate boolean:=false;
begin
 if auth.uid() is null or org is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
 if resolution_action not in('corrigir','ignorar') then raise exception 'invalid_action'; end if;
 if length(trim(coalesce(resolution_reason,'')))<5 then raise exception 'resolution_reason_required'; end if;
 select * into issue from public.contact_import_issues where id=target_issue_id and organization_id=org and status='pendente' for update;
 if issue.id is null then raise exception 'issue_not_found_or_resolved'; end if;
 if resolution_action='ignorar' then update public.contact_import_issues set status='ignorado',resolution_note=left(trim(resolution_reason),1000),resolved_by=auth.uid(),resolved_at=now() where id=issue.id;return jsonb_build_object('resolved',true,'status','ignorado');end if;
 normalized:=regexp_replace(coalesce(corrected_phone,''),'[^0-9]','','g');if normalized not like '55%' and length(normalized) in(10,11) then normalized:='55'||normalized;end if;
 if normalized!~'^55[1-9][0-9]{9,10}$' then raise exception 'invalid_corrected_phone';end if;if length(trim(coalesce(corrected_name,'')))<2 then raise exception 'corrected_name_required';end if;
 select id into target_lead from public.leads where organization_id=org and deleted_at is null and phone_normalized=normalized order by updated_at desc limit 1;
 if target_lead is null then
  select p.id,s.id into target_pipeline,target_stage from public.pipelines p join public.pipeline_stages s on s.pipeline_id=p.id and s.code='novo_lead' where p.organization_id=org and p.entity_type='lead' and p.is_default limit 1;
  insert into public.leads(organization_id,name,phone,phone_normalized,source,source_detail,consent,pipeline_id,pipeline_stage_id,notes_summary) values(org,left(trim(corrected_name),160),corrected_phone,normalized,'Importação VCF','Contato corrigido na fila de saneamento',false,target_pipeline,target_stage,'Contato corrigido manualmente. Sem consentimento para campanhas.') returning id into target_lead;
  insert into public.lead_activities(lead_id,user_id,activity_type,title,description,metadata) values(target_lead,auth.uid(),'contact_import_corrected','Contato corrigido na fila de importação',left(trim(resolution_reason),1000),jsonb_build_object('issue_id',issue.id,'consent',false));
 else was_duplicate:=true;end if;
 update public.contact_import_issues set status='corrigido',resolution_note=left(trim(resolution_reason),1000),resolved_lead_id=target_lead,resolved_by=auth.uid(),resolved_at=now() where id=issue.id;
 return jsonb_build_object('resolved',true,'status','corrigido','lead_id',target_lead,'duplicate',was_duplicate,'consent',false);
end;$$;
revoke all on function public.resolve_contact_import_issue(uuid,text,text,text,text) from public,anon;
grant execute on function public.resolve_contact_import_issue(uuid,text,text,text,text) to authenticated;
commit;
