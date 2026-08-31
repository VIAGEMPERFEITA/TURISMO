-- Segmentação operacional e revisão não destrutiva da base importada.
begin;

create or replace function public.contact_base_segments()
returns jsonb language sql stable security definer set search_path=public as $$
 with base as (
  select id,name,source,email,
   case when regexp_replace(coalesce(phone_normalized,phone,''),'[^0-9]','','g') like '55%'
    then regexp_replace(coalesce(phone_normalized,phone,''),'[^0-9]','','g')
    else '55'||regexp_replace(coalesce(phone_normalized,phone,''),'[^0-9]','','g') end phone_e164
  from public.leads where organization_id=public.current_organization_id() and deleted_at is null
 ), ranked as (
  select *,count(*) over(partition by phone_e164) phone_count from base
 ), ddds as (
  select substring(phone_e164 from 3 for 2) label,count(*) amount from base
  where phone_e164~'^55[1-9][0-9]{9,10}$' group by 1 order by 2 desc limit 20
 ), origins as (
  select coalesce(nullif(source,''),'Não informada') label,count(*) amount from base group by 1 order by 2 desc limit 20
 ), duplicate_groups as (
  select phone_e164,jsonb_agg(jsonb_build_object('id',id,'name',name,'source',source,'has_email',email is not null) order by name) contacts,count(*) amount
  from ranked where phone_count>1 and phone_e164~'^55[1-9][0-9]{9,10}$' group by phone_e164 order by count(*) desc,phone_e164 limit 50
 ) select jsonb_build_object(
  'by_ddd',coalesce((select jsonb_agg(jsonb_build_object('label',label,'amount',amount)) from ddds),'[]'::jsonb),
  'by_source',coalesce((select jsonb_agg(jsonb_build_object('label',label,'amount',amount)) from origins),'[]'::jsonb),
  'duplicate_groups',coalesce((select jsonb_agg(jsonb_build_object('phone_e164',phone_e164,'amount',amount,'contacts',contacts)) from duplicate_groups),'[]'::jsonb)
 );
$$;

revoke all on function public.contact_base_segments() from public,anon;
grant execute on function public.contact_base_segments() to authenticated;
commit;
