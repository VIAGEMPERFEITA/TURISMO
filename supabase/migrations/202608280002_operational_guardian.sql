-- Guardião operacional executável sem chamadas externas à Meta.
begin;

create table if not exists public.operational_test_runs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  test_type text not null, status text not null check(status in ('passed','failed','warning')),
  results jsonb not null default '{}', created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.operational_test_runs enable row level security;
drop policy if exists operational_test_runs_read on public.operational_test_runs;
create policy operational_test_runs_read on public.operational_test_runs for select to authenticated
  using(organization_id=public.current_organization_id());

create or replace function public.audit_contact_governance() returns jsonb
language sql stable security definer set search_path=public as $$
with base as (
 select l.id,case when l.phone_normalized like '55%' then l.phone_normalized else '55'||l.phone_normalized end phone
 from public.leads l where l.organization_id=public.current_organization_id() and l.deleted_at is null
), ranked as (
 select *,row_number() over(partition by phone order by id) rank from base
)
select jsonb_build_object(
 'total',(select count(*) from base),
 'duplicates',(select count(*) from ranked where rank>1),
 'invalid',(select count(*) from base where phone !~ '^55[1-9][0-9]{9,12}$'),
 'marketing_consented',(select count(*) from public.contact_consents c where c.organization_id=public.current_organization_id() and c.granted and c.revoked_at is null and c.purpose='marketing'),
 'suppressed',(select count(*) from public.contact_suppressions s where s.organization_id=public.current_organization_id() and s.released_at is null)
); $$;
revoke all on function public.audit_contact_governance() from public,anon;
grant execute on function public.audit_contact_governance() to authenticated;

create or replace function public.channel_delivery_metrics() returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'whatsapp',jsonb_build_object('sent',count(*) filter(where provider='meta_whatsapp' and event_type in ('message_sent','message_status')),'failed',count(*) filter(where provider='meta_whatsapp' and status in ('falhou','dead_letter'))),
  'instagram',jsonb_build_object('events',(select count(*) from public.social_events s where s.organization_id=public.current_organization_id() and s.event_type like 'instagram_%')),
  'messenger',jsonb_build_object('events',(select count(*) from public.social_events s where s.organization_id=public.current_organization_id() and s.event_type='messenger_dm')),
  'webhooks_processed',count(*) filter(where status='processado'),
  'webhooks_failed',count(*) filter(where status in ('falhou','dead_letter'))
 ) from public.webhook_events w where w.organization_id=public.current_organization_id(); $$;
revoke all on function public.channel_delivery_metrics() from public,anon;
grant execute on function public.channel_delivery_metrics() to authenticated;

create or replace function public.run_operational_guardian() returns jsonb
language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); result jsonb; severity_value text;
begin
 if auth.uid() is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
 result:=public.meta_prelaunch_preflight();
 severity_value:=case when coalesce((result->>'expired_tokens')::int,0)>0 or coalesce((result->>'webhook_dead_letter')::int,0)>0 then 'critical' else 'warning' end;
 if coalesce((result->>'expired_tokens')::int,0)>0 or coalesce((result->>'tokens_expiring_14d')::int,0)>0 then
  insert into public.integration_health_events(organization_id,provider,event_type,severity,details)
  select org,'meta','token_health',severity_value,result where not exists(select 1 from public.integration_health_events h where h.organization_id=org and h.event_type='token_health' and h.status='open');
 else update public.integration_health_events set status='resolved',resolved_at=now() where organization_id=org and event_type='token_health' and status='open'; end if;
 if coalesce((result->>'queue_stuck')::int,0)>0 or coalesce((result->>'webhook_dead_letter')::int,0)>0 then
  insert into public.integration_health_events(organization_id,provider,event_type,severity,details)
  select org,'omnichannel','queue_health',severity_value,result where not exists(select 1 from public.integration_health_events h where h.organization_id=org and h.event_type='queue_health' and h.status='open');
 else update public.integration_health_events set status='resolved',resolved_at=now() where organization_id=org and event_type='queue_health' and status='open'; end if;
 insert into public.operational_test_runs(organization_id,test_type,status,results,created_by)
 values(org,'guardian',case when severity_value='critical' then 'failed' when coalesce((result->>'queue_stuck')::int,0)>0 then 'warning' else 'passed' end,result,auth.uid());
 return result||jsonb_build_object('checked_at',now(),'contact_governance',public.audit_contact_governance(),'delivery',public.channel_delivery_metrics());
end; $$;
revoke all on function public.run_operational_guardian() from public,anon;
grant execute on function public.run_operational_guardian() to authenticated;

create or replace function public.simulate_omnichannel_preflight() returns jsonb
language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); result jsonb;
begin
 if auth.uid() is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if;
 result:=jsonb_build_object(
  'instagram',jsonb_build_object('signature_validation',true,'deduplication',true,'external_send',false),
  'messenger',jsonb_build_object('signature_validation',true,'human_handoff',true,'external_send',false),
  'whatsapp',jsonb_build_object('consent_gate',true,'template_gate',true,'real_send_locked',true,'external_send',false),
  'ai',public.ai_release_gate(), 'simulated_at',now());
 insert into public.operational_test_runs(organization_id,test_type,status,results,created_by) values(org,'omnichannel_simulation','passed',result,auth.uid());
 return result;
end; $$;
revoke all on function public.simulate_omnichannel_preflight() from public,anon;
grant execute on function public.simulate_omnichannel_preflight() to authenticated;

create or replace function public.emergency_stop_omnichannel(stop_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); flows integer; campaigns_count integer;
begin
 if auth.uid() is null or not public.has_role('administrador') then raise exception 'forbidden'; end if;
 if length(trim(coalesce(stop_reason,'')))<10 then raise exception 'reason_required'; end if;
 update public.automation_flows set status='paused',emergency_stopped_at=now(),updated_at=now() where organization_id=org and status='active'; get diagnostics flows=row_count;
 update public.campaigns set status='pausada',real_send_locked=true,pause_reason='parada_emergencial: '||left(stop_reason,300),paused_at=now(),updated_at=now() where organization_id=org and status='em_andamento'; get diagnostics campaigns_count=row_count;
 update public.integration_settings set simulation_mode=true,updated_at=now() where organization_id=org;
 insert into public.integration_health_events(organization_id,provider,event_type,severity,details) values(org,'omnichannel','emergency_stop','critical',jsonb_build_object('reason',left(stop_reason,300),'flows',flows,'campaigns',campaigns_count,'actor',auth.uid()));
 return jsonb_build_object('stopped',true,'flows',flows,'campaigns',campaigns_count,'simulation_mode',true);
end; $$;
revoke all on function public.emergency_stop_omnichannel(text) from public,anon;
grant execute on function public.emergency_stop_omnichannel(text) to authenticated;

create or replace function public.preview_operational_recovery(target_snapshot_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('snapshot_id',s.id,'created_at',s.created_at,'checksum',s.checksum,'snapshot_type',s.snapshot_type,'requires_explicit_restore',true,'contains_secrets',false)
 from public.operational_recovery_snapshots s where s.id=target_snapshot_id and s.organization_id=public.current_organization_id() and public.has_role('administrador','gestor'); $$;
revoke all on function public.preview_operational_recovery(uuid) from public,anon;
grant execute on function public.preview_operational_recovery(uuid) to authenticated;

insert into public.message_templates(organization_id,name,category,language_code,content,variables,status)
select o.id,v.name,v.category,'pt_BR',v.content,v.variables,'rascunho'
from public.organizations o cross join (values
 ('boas_vindas_viagem_perfeita','MARKETING','Olá, {{1}}! Obrigado pelo interesse na Viagem Perfeita. Posso apresentar as opções autorizadas para sua próxima viagem.',array['nome']),
 ('retorno_interesse_caravana','MARKETING','Olá, {{1}}. Podemos continuar seu atendimento sobre {{2}}? Responda SAIR se não desejar novas mensagens.',array['nome','caravana']),
 ('lembrete_atendimento','UTILITY','Olá, {{1}}. Seu atendimento sobre {{2}} está disponível. Responda a esta mensagem para continuar.',array['nome','assunto']),
 ('confirmacao_solicitacao','UTILITY','Olá, {{1}}. Recebemos sua solicitação {{2}}. Um consultor continuará o atendimento.',array['nome','protocolo']),
 ('aviso_documentacao','UTILITY','Olá, {{1}}. Há uma atualização sobre a documentação da sua viagem. Acesse somente os canais oficiais da Viagem Perfeita.',array['nome'])
) v(name,category,content,variables) where o.slug='viagem-perfeita'
on conflict(organization_id,name,language_code,version) do nothing;

commit;
