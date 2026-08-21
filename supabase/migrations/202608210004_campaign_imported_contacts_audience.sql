-- Materializa públicos de campanha com consentimento, supressão e deduplicação.
begin;

create or replace function public.prepare_campaign_audience(target_campaign_id uuid, requested_audience_type text)
returns table(total_found integer,eligible_count integer,without_consent_count integer,invalid_phone_count integer,suppressed_count integer,duplicate_count integer)
language plpgsql security definer set search_path=public as $$
declare
  target_org uuid:=public.current_organization_id();
  campaign_row public.campaigns%rowtype;
begin
  if auth.uid() is null or target_org is null or not public.has_role('administrador','gestor','consultor') then raise exception 'forbidden'; end if;
  if requested_audience_type not in ('leads_com_consentimento','contatos_importados_vcf') then raise exception 'invalid_audience_type'; end if;
  select * into campaign_row from public.campaigns where id=target_campaign_id and organization_id=target_org for update;
  if campaign_row.id is null then raise exception 'campaign_not_found'; end if;
  if campaign_row.status not in ('rascunho','agendada') then raise exception 'campaign_not_editable'; end if;

  delete from public.campaign_recipients where campaign_id=target_campaign_id;
  delete from public.campaign_audiences where campaign_id=target_campaign_id;

  create temporary table campaign_candidates on commit drop as
  with base as (
    select l.id,l.name,l.phone,l.phone_normalized,l.consent,
      case when regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') like '55%'
        then regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g')
        else '55'||regexp_replace(coalesce(l.phone_normalized,l.phone,''),'[^0-9]','','g') end as normalized_phone
    from public.leads l
    where l.organization_id=target_org and l.deleted_at is null and l.archived_at is null
      and (requested_audience_type='leads_com_consentimento' or l.source='Importação VCF')
  ), evaluated as (
    select b.*,
      (b.consent=true and exists(select 1 from public.contact_consents cc where cc.organization_id=target_org and cc.lead_id=b.id and cc.phone_e164=b.normalized_phone and cc.channel='whatsapp' and cc.purpose='marketing' and cc.granted=true and cc.revoked_at is null)) as has_marketing_consent,
      exists(select 1 from public.contact_suppressions cs where cs.organization_id=target_org and cs.phone_e164=b.normalized_phone and cs.channel='whatsapp' and cs.released_at is null and cs.scope in ('marketing','todos')) as is_suppressed,
      (b.normalized_phone ~ '^55[1-9][0-9]{9,10}$') as is_valid_phone
    from base b
  ), ranked as (
    select e.*,row_number() over(partition by normalized_phone order by id) as phone_rank from evaluated e
  ) select * from ranked;

  select count(*)::integer,
    count(*) filter(where has_marketing_consent and not is_suppressed and is_valid_phone and phone_rank=1)::integer,
    count(*) filter(where not has_marketing_consent)::integer,
    count(*) filter(where has_marketing_consent and not is_suppressed and not is_valid_phone)::integer,
    count(*) filter(where has_marketing_consent and is_suppressed)::integer,
    count(*) filter(where has_marketing_consent and not is_suppressed and is_valid_phone and phone_rank>1)::integer
  into total_found,eligible_count,without_consent_count,invalid_phone_count,suppressed_count,duplicate_count
  from campaign_candidates;

  insert into public.campaign_audiences(campaign_id,audience_type,filters,total_found,eligible_count,without_consent_count,invalid_phone_count,suppressed_count,duplicate_count)
  values(target_campaign_id,requested_audience_type,jsonb_build_object('source',case when requested_audience_type='contatos_importados_vcf' then 'Importação VCF' else 'CRM' end,'consent_required',true,'suppression_excluded',true,'deduplicate',true),total_found,eligible_count,without_consent_count,invalid_phone_count,suppressed_count,duplicate_count);

  insert into public.campaign_recipients(organization_id,campaign_id,lead_id,phone_e164,display_name,variables,eligibility_reason,status,idempotency_key,scheduled_at)
  select target_org,target_campaign_id,id,normalized_phone,name,jsonb_build_object('nome',coalesce(name,'Cliente')),'consentimento de marketing válido','pendente',target_campaign_id::text||':'||normalized_phone||':v'||campaign_row.version::text,campaign_row.scheduled_at
  from campaign_candidates where has_marketing_consent and not is_suppressed and is_valid_phone and phone_rank=1;

  update public.campaigns set
    audience_snapshot=jsonb_build_object('type',requested_audience_type,'total_found',total_found,'eligible',eligible_count,'without_consent',without_consent_count,'invalid_phone',invalid_phone_count,'suppressed',suppressed_count,'duplicates',duplicate_count,'consent_required',true,'prepared_at',now()),
    status=case when eligible_count=0 then 'rascunho' else status end,
    updated_at=now()
  where id=target_campaign_id;
  insert into public.campaign_audit_logs(organization_id,campaign_id,actor_id,action,current_data)
  values(target_org,target_campaign_id,auth.uid(),'audience_prepared',jsonb_build_object('type',requested_audience_type,'total',total_found,'eligible',eligible_count,'without_consent',without_consent_count,'invalid',invalid_phone_count,'suppressed',suppressed_count,'duplicates',duplicate_count));
  return next;
end;
$$;

revoke all on function public.prepare_campaign_audience(uuid,text) from public,anon;
grant execute on function public.prepare_campaign_audience(uuid,text) to authenticated;

commit;
