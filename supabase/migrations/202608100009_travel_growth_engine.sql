-- Acelerador comercial para turismo: aquisição, atribuição, score, cadências e previsão.
-- Integrações externas permanecem bloqueadas em simulação até aprovação explícita.

create table if not exists public.acquisition_channels (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null, name text not null, channel_type text not null, platform text not null,
  enabled boolean not null default true, simulation_mode boolean not null default true,
  credentials_configured boolean not null default false, real_activation_approved boolean not null default false,
  monthly_budget numeric(14,2) not null default 0, target_cpl numeric(12,2), target_cac numeric(12,2),
  settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,code), check(not real_activation_approved or credentials_configured)
);
create table if not exists public.keyword_clusters (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, funnel_stage text not null check(funnel_stage in('descoberta','consideracao','decisao','marca','pos_venda')),
  destination text, intent text not null, keywords text[] not null default '{}', negative_keywords text[] not null default '{}',
  landing_path text, recommended_channel text, priority smallint not null default 50 check(priority between 0 and 100),
  status text not null default 'rascunho' check(status in('rascunho','aprovado','pausado')),
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,name)
);
create table if not exists public.lead_touchpoints (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade, channel_id uuid references public.acquisition_channels(id) on delete set null,
  event_type text not null check(event_type in('visit','form_submit','whatsapp_click','message','qualification','proposal','reservation','payment','campaign_response')),
  platform text, source text, medium text, campaign text, content text, term text, keyword text, landing_page text, referrer text,
  metadata jsonb not null default '{}'::jsonb, event_at timestamptz not null default now()
);
create index if not exists lead_touchpoints_attribution_idx on public.lead_touchpoints(organization_id,event_at desc,source,medium,campaign);
create index if not exists lead_touchpoints_lead_idx on public.lead_touchpoints(lead_id,event_at desc);

create table if not exists public.lead_scores (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade, fit_score smallint not null default 0,
  intent_score smallint not null default 0, engagement_score smallint not null default 0, total_score smallint not null default 0,
  tier text not null default 'D' check(tier in('A','B','C','D')), reasons jsonb not null default '[]'::jsonb,
  next_best_action text, sla_due_at timestamptz, calculated_at timestamptz not null default now(), unique(lead_id)
);
create table if not exists public.sales_cadences (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, goal text not null, trigger_tier text, trigger_stage text, active boolean not null default true,
  simulation_mode boolean not null default true, requires_consent boolean not null default true, max_attempts smallint not null default 5,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,name)
);
create table if not exists public.sales_cadence_steps (
  id uuid primary key default gen_random_uuid(), cadence_id uuid not null references public.sales_cadences(id) on delete cascade,
  position smallint not null, delay_minutes integer not null default 0, channel text not null check(channel in('whatsapp','email','telefone','tarefa','ia')),
  action_type text not null, template_key text, instructions text, requires_human_approval boolean not null default true,
  active boolean not null default true, unique(cadence_id,position)
);
create table if not exists public.lead_cadence_enrollments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade, cadence_id uuid not null references public.sales_cadences(id) on delete cascade,
  status text not null default 'ativa' check(status in('ativa','pausada','concluida','cancelada')),
  current_step smallint not null default 0, next_step_at timestamptz, stopped_reason text, enrolled_at timestamptz not null default now(),
  unique(lead_id,cadence_id,status)
);
create table if not exists public.acquisition_goals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null, caravan_id uuid references public.caravans(id) on delete set null,
  target_leads integer not null default 0, target_qualified integer not null default 0, target_reservations integer not null default 0,
  target_revenue numeric(14,2) not null default 0, planned_budget numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), unique(organization_id,period_start,caravan_id)
);
create table if not exists public.acquisition_experiments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, hypothesis text not null, primary_metric text not null, variant_a jsonb not null default '{}'::jsonb,
  variant_b jsonb not null default '{}'::jsonb, status text not null default 'rascunho' check(status in('rascunho','simulacao','ativo','concluido','cancelado')),
  simulation_mode boolean not null default true, result jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

do $$ declare t text; begin foreach t in array array['acquisition_channels','keyword_clusters','lead_touchpoints','lead_scores','sales_cadences','sales_cadence_steps','lead_cadence_enrollments','acquisition_goals','acquisition_experiments'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy acquisition_channels_staff on public.acquisition_channels for select to authenticated using(organization_id=public.current_organization_id());
create policy acquisition_channels_managers on public.acquisition_channels for all to authenticated using(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor'));
create policy keyword_clusters_staff on public.keyword_clusters for select to authenticated using(organization_id=public.current_organization_id());
create policy keyword_clusters_managers on public.keyword_clusters for all to authenticated using(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor'));
create policy touchpoints_staff on public.lead_touchpoints for select to authenticated using(organization_id=public.current_organization_id());
create policy scores_staff on public.lead_scores for select to authenticated using(organization_id=public.current_organization_id());
create policy cadences_staff on public.sales_cadences for select to authenticated using(organization_id=public.current_organization_id());
create policy cadence_steps_staff on public.sales_cadence_steps for select to authenticated using(exists(select 1 from public.sales_cadences c where c.id=cadence_id and c.organization_id=public.current_organization_id()));
create policy enrollments_staff on public.lead_cadence_enrollments for select to authenticated using(organization_id=public.current_organization_id());
create policy acquisition_goals_staff on public.acquisition_goals for select to authenticated using(organization_id=public.current_organization_id());
create policy acquisition_experiments_staff on public.acquisition_experiments for select to authenticated using(organization_id=public.current_organization_id());
create policy growth_managers_cadences on public.sales_cadences for all to authenticated using(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor'));
create policy growth_managers_steps on public.sales_cadence_steps for all to authenticated using(exists(select 1 from public.sales_cadences c where c.id=cadence_id and c.organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor'))) with check(exists(select 1 from public.sales_cadences c where c.id=cadence_id and c.organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor')));
create policy growth_staff_enrollments on public.lead_cadence_enrollments for all to authenticated using(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor','consultor')) with check(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor','consultor'));
create policy growth_managers_goals on public.acquisition_goals for all to authenticated using(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor'));
create policy growth_managers_experiments on public.acquisition_experiments for all to authenticated using(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.current_role() in('administrador','gestor'));

create or replace function public.recalculate_lead_acquisition_score(target_lead_id uuid) returns public.lead_scores language plpgsql security definer set search_path=public as $$
declare l public.leads%rowtype; i public.lead_interests%rowtype; org uuid; fit int:=0; intent int:=0; engagement int:=0; total int; grade text; reasons jsonb:='[]'; result public.lead_scores%rowtype;
begin
 select * into l from public.leads where id=target_lead_id and deleted_at is null; if not found then raise exception 'lead not found'; end if;
 org:=l.organization_id; select * into i from public.lead_interests where lead_id=l.id order by created_at desc limit 1;
 if i.caravan_id is not null or coalesce(i.experience_name,'')<>'' then fit:=fit+15; reasons:=reasons||'"caravana definida"'::jsonb; end if;
 if coalesce(i.destination,'')<>'' then fit:=fit+10; end if; if coalesce(i.desired_period,'')<>'' then fit:=fit+5; end if;
 if coalesce(i.travelers_count,0)>=2 then fit:=fit+5; end if; if coalesce(i.departure_city,'')<>'' then fit:=fit+5; end if;
 if lower(coalesce(i.main_interest,'')) similar to '%(reserv|vaga|disponibilidade|valor|orçamento|orcamento)%' then intent:=intent+30; reasons:=reasons||'"intenção comercial alta"'::jsonb; else intent:=intent+12; end if;
 if l.whatsapp_started then intent:=intent+15; reasons:=reasons||'"WhatsApp iniciado"'::jsonb; end if;
 if l.status in('proposta_enviada','negociacao','reserva_iniciada','aguardando_pagamento') then intent:=intent+20; elsif l.status in('primeiro_contato','em_atendimento','roteiro_enviado','aguardando_resposta') then intent:=intent+10; end if;
 select least(20,count(*)*5) into engagement from public.lead_touchpoints where lead_id=l.id;
 total:=least(100,fit+intent+engagement); grade:=case when total>=75 then 'A' when total>=55 then 'B' when total>=35 then 'C' else 'D' end;
 insert into public.lead_scores(organization_id,lead_id,fit_score,intent_score,engagement_score,total_score,tier,reasons,next_best_action,sla_due_at,calculated_at)
 values(org,l.id,fit,intent,engagement,total,grade,reasons,case grade when 'A' then 'Contato humano imediato e proposta consultiva' when 'B' then 'Qualificar orçamento e disponibilidade' when 'C' then 'Nutrir com roteiro e prova social' else 'Nutrição educativa com consentimento' end,now()+case grade when 'A' then interval '5 minutes' when 'B' then interval '30 minutes' when 'C' then interval '4 hours' else interval '1 day' end,now())
 on conflict(lead_id) do update set fit_score=excluded.fit_score,intent_score=excluded.intent_score,engagement_score=excluded.engagement_score,total_score=excluded.total_score,tier=excluded.tier,reasons=excluded.reasons,next_best_action=excluded.next_best_action,sla_due_at=excluded.sla_due_at,calculated_at=now() returning * into result;
 update public.leads set temperature=case grade when 'A' then 'prioridade'::public.lead_temperature when 'B' then 'quente'::public.lead_temperature when 'C' then 'morno'::public.lead_temperature else 'frio'::public.lead_temperature end,next_action_at=result.sla_due_at where id=l.id and status not in('reserva_confirmada','passageiro_confirmado','perdido','arquivado');
 return result;
end $$;

create or replace function public.growth_on_interest() returns trigger language plpgsql security definer set search_path=public as $$ declare l public.leads%rowtype; s public.lead_scores%rowtype; begin
 select * into l from public.leads where id=new.lead_id;
 insert into public.lead_touchpoints(organization_id,lead_id,event_type,platform,source,medium,campaign,content,term,landing_page,referrer,metadata)
 values(l.organization_id,l.id,'form_submit','site',l.utm_source,l.utm_medium,l.utm_campaign,l.utm_content,l.utm_term,l.landing_page,l.referrer,jsonb_build_object('interest_id',new.id)) on conflict do nothing;
 s:=public.recalculate_lead_acquisition_score(l.id);
 if s.tier in('A','B') and not exists(select 1 from public.tasks where lead_id=l.id and status='pendente' and title='Atender lead prioritário') then
  insert into public.tasks(organization_id,lead_id,assigned_to,title,description,due_at,priority,status) values(l.organization_id,l.id,l.assigned_to,'Atender lead prioritário',s.next_best_action,s.sla_due_at,case s.tier when 'A' then 'alta' else 'media' end,'pendente');
 end if; return new;
end $$;
drop trigger if exists growth_interest_trigger on public.lead_interests;
create trigger growth_interest_trigger after insert on public.lead_interests for each row execute function public.growth_on_interest();

create or replace function public.acquisition_performance_center(date_from date default current_date-30,date_to date default current_date) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); result jsonb;
begin
 if org is null then raise exception 'organization required'; end if;
 select jsonb_build_object(
  'funnel',jsonb_build_object('visits',(select count(*) from public.lead_touchpoints where organization_id=org and event_type='visit' and event_at::date between date_from and date_to),'leads',(select count(*) from public.leads where organization_id=org and created_at::date between date_from and date_to and deleted_at is null),'qualified',(select count(*) from public.lead_scores where organization_id=org and tier in('A','B') and calculated_at::date between date_from and date_to),'proposals',(select count(*) from public.leads where organization_id=org and status in('proposta_enviada','negociacao') and updated_at::date between date_from and date_to),'reservations',(select count(*) from public.reservations where organization_id=org and created_at::date between date_from and date_to)),
  'scores',(select coalesce(jsonb_agg(x order by x.tier),'[]') from(select tier,count(*) total from public.lead_scores where organization_id=org group by tier)x),
  'channels',(select coalesce(jsonb_agg(x order by x.leads desc),'[]') from(select coalesce(nullif(utm_source,''),'direto') source,count(*) leads,count(*) filter(where status in('reserva_confirmada','passageiro_confirmado')) conversions from public.leads where organization_id=org and created_at::date between date_from and date_to and deleted_at is null group by 1)x),
  'keywords',(select coalesce(jsonb_agg(x order by x.leads desc),'[]') from(select coalesce(nullif(utm_term,''),'sem palavra-chave') keyword,count(*) leads from public.leads where organization_id=org and created_at::date between date_from and date_to and deleted_at is null group by 1 limit 12)x),
  'forecast',jsonb_build_object('weighted_leads',(select coalesce(round(sum(case tier when 'A' then .65 when 'B' then .35 when 'C' then .15 else .05 end),1),0) from public.lead_scores where organization_id=org),'estimated_revenue',(select coalesce(round(sum(case tier when 'A' then .65 when 'B' then .35 when 'C' then .15 else .05 end)*19386,2),0) from public.lead_scores where organization_id=org)),
  'overdue_sla',(select count(*) from public.lead_scores s join public.leads l on l.id=s.lead_id where s.organization_id=org and s.sla_due_at<now() and l.status not in('reserva_confirmada','passageiro_confirmado','perdido','arquivado'))
 ) into result; return result;
end $$;
grant execute on function public.recalculate_lead_acquisition_score(uuid),public.acquisition_performance_center(date,date) to authenticated;

do $$ declare org uuid; cadence uuid; begin for org in select id from public.organizations loop
 insert into public.acquisition_channels(organization_id,code,name,channel_type,platform,simulation_mode,settings) values
 (org,'google-organico','Google orgânico e SEO','organic_search','Google',true,'{"requires_consent":false}'),(org,'google-ads','Google Ads','paid_search','Google',true,'{"approval_required":true}'),(org,'meta-ads','Meta Ads','paid_social','Meta',true,'{"approval_required":true}'),(org,'instagram','Instagram orgânico','organic_social','Instagram',true,'{}'),(org,'facebook','Facebook orgânico','organic_social','Facebook',true,'{}'),(org,'youtube','YouTube','organic_social','YouTube',true,'{}'),(org,'whatsapp','WhatsApp','direct','WhatsApp',true,'{}'),(org,'email','E-mail e newsletter','email','Resend',true,'{"consent_required":true}'),(org,'parcerias','Igrejas e líderes','partnership','Parcerias',true,'{}'),(org,'indicacoes','Indicações','referral','Indicação',true,'{}') on conflict(organization_id,code) do nothing;
 insert into public.keyword_clusters(organization_id,name,funnel_stage,destination,intent,keywords,negative_keywords,landing_path,recommended_channel,priority,status) values
 (org,'Israel e Terra Santa — decisão','decisao','Israel','reserva',array['caravana israel 2027','viagem terra santa 2027','preço caravana israel','pacote israel com guia em português','caravana evangélica israel'],array['emprego','grátis','papel de parede'],'/destinos/israel','Google Ads + SEO',95,'aprovado'),
 (org,'Paris, Egito e Israel 2027','decisao','Paris • Egito • Israel','reserva',array['caravana paris egito israel 2027','pacote paris egito israel março 2027','viagem bíblica egito israel','roteiro paris egito israel'],array['emprego','grátis'],'/caravanas/paris-egito-israel-marco-2027','Google Ads + Meta',100,'aprovado'),
 (org,'Turismo religioso — consideração','consideracao',null,'roteiro',array['turismo religioso internacional','viagem bíblica em grupo','caravana cristã internacional','viagem com pastor para israel'],array['emprego','curso gratuito'],'/caravanas','SEO + Meta',80,'aprovado'),
 (org,'Segurança e documentação','descoberta',null,'informação',array['é seguro viajar para israel','documentos para viajar para israel','passaporte para terra santa','seguro viagem israel'],array['notícias ao vivo','mapa de guerra'],'/blog','SEO + YouTube',65,'aprovado') on conflict(organization_id,name) do nothing;
 insert into public.sales_cadences(organization_id,name,goal,trigger_tier,simulation_mode,requires_consent,max_attempts) values(org,'Novo lead prioritário','Converter interesse qualificado em atendimento consultivo','A',true,true,5) on conflict(organization_id,name) do update set goal=excluded.goal returning id into cadence;
 insert into public.sales_cadence_steps(cadence_id,position,delay_minutes,channel,action_type,template_key,instructions,requires_human_approval) values
 (cadence,1,0,'ia','acolhimento','lead_recebido','Confirmar recebimento e resumir o interesse sem inventar preço ou disponibilidade.',false),(cadence,2,5,'tarefa','contato_humano',null,'Consultor revisa contexto e inicia atendimento personalizado.',true),(cadence,3,240,'whatsapp','enviar_roteiro','roteiro_caravana','Enviar somente roteiro oficial publicado para a caravana.',true),(cadence,4,1440,'telefone','qualificar','qualificacao_consultiva','Entender motivação, viajantes, embarque, orçamento e objeções.',true),(cadence,5,4320,'whatsapp','follow_up','follow_up_consultivo','Retomar com valor útil e opção clara de falar com consultor.',true) on conflict(cadence_id,position) do nothing;
 end loop; end $$;

-- Classifica a base existente sem disparar mensagens ou campanhas.
do $$ declare item record; begin
 for item in select id from public.leads where deleted_at is null loop
  perform public.recalculate_lead_acquisition_score(item.id);
 end loop;
end $$;
