-- Aprendizado diário governado: evidência anonimizada, novos testes e sugestões sem autopublicação.
begin;

create table if not exists public.ai_learning_cycles (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 cycle_date date not null default current_date, status text not null check(status in ('completed','attention','blocked')),
 scenarios_total integer not null default 0, passed integer not null default 0, failed integer not null default 0,
 critical_failures integer not null default 0, new_scenarios integer not null default 0, suggestions_created integer not null default 0,
 anonymized_metrics jsonb not null default '{}', gate_snapshot jsonb not null default '{}', created_at timestamptz not null default now(),
 unique(organization_id,cycle_date)
);
create table if not exists public.ai_learning_findings (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 cycle_id uuid not null references public.ai_learning_cycles(id) on delete cascade, category text not null, severity text not null check(severity in ('info','warning','critical')),
 title text not null, evidence jsonb not null default '{}', recommended_action text not null, status text not null default 'open' check(status in ('open','reviewed','resolved')),
 created_at timestamptz not null default now(), unique(cycle_id,category,title)
);
alter table public.ai_learning_cycles enable row level security;
alter table public.ai_learning_findings enable row level security;
create policy ai_learning_cycles_read on public.ai_learning_cycles for select to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));
create policy ai_learning_findings_read on public.ai_learning_findings for select to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));

create or replace function public.run_daily_ai_learning_for_org(target_org uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare gate jsonb; cycle_id uuid; failures integer; new_count integer:=0; suggestion_count integer:=0; rec record; metrics jsonb;
begin
 with latest as (select distinct on(r.scenario_id) r.scenario_id,r.status,r.created_at from public.ai_test_runs r where r.organization_id=target_org order by r.scenario_id,r.created_at desc)
 select jsonb_build_object('total',count(*) filter(where s.active),'passed',count(*) filter(where s.active and l.status='passou'),'critical_failures',count(*) filter(where s.active and s.critical and coalesce(l.status,'ausente')<>'passou'))
 into gate from public.ai_test_scenarios s left join latest l on l.scenario_id=s.id where s.organization_id=target_org;
 failures:=coalesce((gate->>'total')::int,0)-coalesce((gate->>'passed')::int,0);
 select jsonb_build_object('actions_24h',count(*),'failed_actions_24h',count(*) filter(where not success),'handoffs_24h',count(*) filter(where action_name='handoff_to_human'),'average_duration_ms',coalesce(round(avg(duration_ms)),0),'personal_data_copied',false)
 into metrics from public.ai_actions where organization_id=target_org and created_at>=now()-interval '24 hours';
 insert into public.ai_learning_cycles(organization_id,status,scenarios_total,passed,failed,critical_failures,anonymized_metrics,gate_snapshot)
 values(target_org,case when coalesce((gate->>'critical_failures')::int,0)>0 then 'blocked' when failures>0 then 'attention' else 'completed' end,coalesce((gate->>'total')::int,0),coalesce((gate->>'passed')::int,0),failures,coalesce((gate->>'critical_failures')::int,0),metrics,gate)
 on conflict(organization_id,cycle_date) do update set status=excluded.status,scenarios_total=excluded.scenarios_total,passed=excluded.passed,failed=excluded.failed,critical_failures=excluded.critical_failures,anonymized_metrics=excluded.anonymized_metrics,gate_snapshot=excluded.gate_snapshot,created_at=now()
 returning id into cycle_id;
 for rec in with latest as (select distinct on(r.scenario_id) r.scenario_id,r.status from public.ai_test_runs r where r.organization_id=target_org order by r.scenario_id,r.created_at desc)
  select s.* from public.ai_test_scenarios s left join latest l on l.scenario_id=s.id where s.organization_id=target_org and s.active and coalesce(l.status,'ausente')<>'passou' order by s.critical desc,s.updated_at limit 5
 loop
  insert into public.ai_learning_findings(organization_id,cycle_id,category,severity,title,evidence,recommended_action)
  values(target_org,cycle_id,rec.category,case when rec.critical then 'critical' else 'warning' end,'Cenário sem aprovação: '||rec.title,jsonb_build_object('scenario_code',rec.scenario_code,'expected_behavior',rec.expected_behavior),'Revisar fontes e instruções; executar novamente a matriz antes de publicar.') on conflict do nothing;
  if found then suggestion_count:=suggestion_count+1; end if;
  insert into public.ai_test_scenarios(organization_id,scenario_code,category,title,input_message,expected_behavior,critical)
  values(target_org,'daily-'||to_char(current_date,'YYYYMMDD')||'-'||left(rec.scenario_code,60),rec.category,'Variação diária — '||rec.title,left(rec.input_message||' Explique sem inventar informações e preserve todas as regras de segurança.',4000),rec.expected_behavior,rec.critical)
  on conflict do nothing;
  if found then new_count:=new_count+1; end if;
 end loop;
 insert into public.improvement_suggestions(organization_id,category,title,description,evidence,expected_impact,risk_level,status,proposed_by)
 select target_org,'ai_daily_learning','Ciclo diário da IA — '||current_date,'Revisar descobertas do ciclo diário antes de qualquer alteração em produção.',jsonb_build_object('cycle_id',cycle_id,'gate',gate,'metrics',metrics),'Melhorar precisão e segurança sem aprendizado autônomo não supervisionado',case when coalesce((gate->>'critical_failures')::int,0)>0 then 'high' else 'medium' end,'suggested','daily-learning-guardian'
 where not exists(select 1 from public.improvement_suggestions i where i.organization_id=target_org and i.proposed_by='daily-learning-guardian' and i.created_at::date=current_date);
 if found then suggestion_count:=suggestion_count+1; end if;
 update public.ai_learning_cycles set new_scenarios=new_count,suggestions_created=suggestion_count where id=cycle_id;
 return jsonb_build_object('cycle_id',cycle_id,'status',case when coalesce((gate->>'critical_failures')::int,0)>0 then 'blocked' when failures>0 then 'attention' else 'completed' end,'gate',gate,'anonymized_metrics',metrics,'new_scenarios',new_count,'suggestions',suggestion_count,'auto_publish',false);
end; $$;
revoke all on function public.run_daily_ai_learning_for_org(uuid) from public,anon,authenticated;

create or replace function public.run_daily_ai_learning() returns jsonb language plpgsql security definer set search_path=public as $$
begin if auth.uid() is null or not public.has_role('administrador','gestor') then raise exception 'forbidden'; end if; return public.run_daily_ai_learning_for_org(public.current_organization_id()); end; $$;
revoke all on function public.run_daily_ai_learning() from public,anon; grant execute on function public.run_daily_ai_learning() to authenticated;

create or replace function public.run_all_daily_ai_learning() returns void language plpgsql security definer set search_path=public as $$
declare org record; begin for org in select id from public.organizations loop perform public.run_daily_ai_learning_for_org(org.id); end loop; end; $$;
revoke all on function public.run_all_daily_ai_learning() from public,anon,authenticated;

do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  if exists(select 1 from cron.job where jobname='viagem-perfeita-daily-ai-learning') then perform cron.unschedule('viagem-perfeita-daily-ai-learning'); end if;
  perform cron.schedule('viagem-perfeita-daily-ai-learning','15 8 * * *','select public.run_all_daily_ai_learning()');
 end if;
end $$;

commit;
