-- Fluxos não continuam ativos quando o canal oficial perdeu autenticação.
begin;

update public.automation_flows af set status='paused',updated_at=now()
where af.channel='instagram' and af.status='active'
and exists(select 1 from public.channel_accounts ca where ca.organization_id=af.organization_id and ca.channel='instagram' and ca.status='degraded');

insert into public.audit_logs(organization_id,action,entity_type,after_data)
select distinct ca.organization_id,'instagram_flows_auto_paused','automation_flow',jsonb_build_object('reason','instagram_access_token_invalid')
from public.channel_accounts ca where ca.channel='instagram' and ca.status='degraded'
and not exists(select 1 from public.audit_logs al where al.organization_id=ca.organization_id and al.action='instagram_flows_auto_paused' and al.created_at>now()-interval '1 day');

commit;
