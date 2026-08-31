-- Governança da base de contatos: qualidade e consentimento documentado.
begin;

create or replace function public.contact_base_quality()
returns jsonb language sql stable security definer set search_path=public as $$
 with imported as (
  select id,email,
   case when regexp_replace(coalesce(phone_normalized,phone,''),'[^0-9]','','g') like '55%'
    then regexp_replace(coalesce(phone_normalized,phone,''),'[^0-9]','','g')
    else '55'||regexp_replace(coalesce(phone_normalized,phone,''),'[^0-9]','','g') end phone_e164
  from public.leads
  where organization_id=public.current_organization_id() and source='Importação VCF' and deleted_at is null
 ), grouped as (select phone_e164,count(*) amount from imported group by phone_e164)
 select jsonb_build_object(
  'total',(select count(*) from imported),
  'unique_phones',(select count(*) from grouped where phone_e164~'^55[1-9][0-9]{9,10}$'),
  'duplicate_records',(select coalesce(sum(amount-1),0) from grouped where amount>1),
  'with_email',(select count(*) from imported where email is not null and email<>''),
  'consented',(select count(*) from public.contact_consents c where c.organization_id=public.current_organization_id() and c.channel='whatsapp' and c.purpose='marketing' and c.granted and c.revoked_at is null),
  'suppressed',(select count(*) from public.contact_suppressions s where s.organization_id=public.current_organization_id() and s.channel='whatsapp' and s.released_at is null)
 );
$$;

create or replace function public.record_marketing_consent(target_lead_id uuid, consent_source text, evidence text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); target_lead public.leads%rowtype; normalized text; consent_id uuid;
begin
 if auth.uid() is null or org is null or not public.has_role('administrador','gestor','consultor') then raise exception 'forbidden'; end if;
 if consent_source not in ('whatsapp_inbound','site_form','signed_form','manual_documented') then raise exception 'invalid_consent_source'; end if;
 if length(trim(coalesce(evidence,'')))<10 then raise exception 'consent_evidence_required'; end if;
 select * into target_lead from public.leads where id=target_lead_id and organization_id=org and deleted_at is null for update;
 if target_lead.id is null then raise exception 'lead_not_found'; end if;
 normalized:=regexp_replace(coalesce(target_lead.phone_normalized,target_lead.phone,''),'[^0-9]','','g');
 if normalized not like '55%' then normalized:='55'||normalized; end if;
 if normalized!~'^55[1-9][0-9]{9,10}$' then raise exception 'invalid_phone'; end if;
 insert into public.contact_consents(organization_id,lead_id,phone_e164,channel,purpose,granted,source,granted_at,revoked_at,revocation_reason,recorded_by)
 values(org,target_lead.id,normalized,'whatsapp','marketing',true,consent_source,now(),null,null,auth.uid())
 on conflict(organization_id,phone_e164,channel,purpose) do update set lead_id=excluded.lead_id,granted=true,source=excluded.source,granted_at=now(),revoked_at=null,revocation_reason=null,recorded_by=auth.uid(),updated_at=now()
 returning id into consent_id;
 update public.leads set consent=true,consent_at=now(),updated_at=now(),notes_summary=concat_ws(E'\n',nullif(notes_summary,''),'Consentimento de marketing documentado: '||left(trim(evidence),300)) where id=target_lead.id;
 insert into public.lead_activities(lead_id,user_id,activity_type,title,description,metadata)
 values(target_lead.id,auth.uid(),'marketing_consent_recorded','Consentimento de marketing registrado',left(trim(evidence),1000),jsonb_build_object('source',consent_source,'consent_id',consent_id,'channel','whatsapp'));
 return jsonb_build_object('recorded',true,'lead_id',target_lead.id,'consent_id',consent_id,'phone_e164',normalized);
end;
$$;

revoke all on function public.contact_base_quality() from public,anon;
revoke all on function public.record_marketing_consent(uuid,text,text) from public,anon;
grant execute on function public.contact_base_quality() to authenticated;
grant execute on function public.record_marketing_consent(uuid,text,text) to authenticated;

commit;
