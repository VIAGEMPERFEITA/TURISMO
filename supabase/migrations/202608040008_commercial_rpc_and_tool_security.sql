-- RPCs controladas para preços, simulação, propostas e ferramentas da IA.

create or replace function public.authorized_discount_limit(target_caravan_id uuid,actor_type text) returns numeric
language plpgsql stable security definer set search_path=public as $$
declare pricing public.caravan_pricing%rowtype; config_limit numeric:=3; effective_actor text; role_limit numeric:=0;
begin
  select * into pricing from public.caravan_pricing where caravan_id=target_caravan_id and active=true order by updated_at desc limit 1;
  if pricing.id is null then raise exception 'Tabela comercial não cadastrada';end if;
  if auth.role()='service_role' then
    effective_actor='ia';
  else
    effective_actor=coalesce(public.current_role()::text,'cliente');
  end if;
  select coalesce(ai_discount_max,3) into config_limit from public.ai_configurations where organization_id=pricing.organization_id;
  role_limit=case effective_actor when 'ia' then least(pricing.ai_discount_max,config_limit) when 'consultor' then pricing.consultant_discount_max when 'gestor' then pricing.manager_discount_max when 'administrador' then 100 else 0 end;
  return greatest(0,least(role_limit,100));
end $$;
revoke all on function public.authorized_discount_limit(uuid,text) from public,anon;
grant execute on function public.authorized_discount_limit(uuid,text) to authenticated,service_role;

create or replace function public.save_caravan_pricing(pricing_payload jsonb,justification text) returns uuid
language plpgsql security definer set search_path=public as $$
declare target_id uuid;target_caravan uuid;target_org uuid;existing_id uuid;
begin
  if not public.can_manage_all() then raise exception 'Acesso não autorizado';end if;
  if length(trim(coalesce(justification,'')))<5 then raise exception 'A justificativa deve conter pelo menos 5 caracteres';end if;
  target_caravan=(pricing_payload->>'caravan_id')::uuid;target_org=public.current_organization_id();
  if not exists(select 1 from public.caravans where id=target_caravan and organization_id=target_org) then raise exception 'Caravana não encontrada';end if;
  existing_id=nullif(pricing_payload->>'id','')::uuid;
  perform set_config('app.pricing_justification',trim(justification),true);
  if existing_id is null then
    update public.caravan_pricing set active=false,updated_by=auth.uid(),updated_at=now() where caravan_id=target_caravan and active=true;
    insert into public.caravan_pricing(organization_id,caravan_id,currency,base_price,promotional_price,single_room_supplement,child_price,leader_price,minimum_entry,maximum_installments,installment_type,cash_discount_max,ai_discount_max,consultant_discount_max,manager_discount_max,promotion_start,promotion_end,proposal_validity_days,active,created_by,updated_by)
    values(target_org,target_caravan,coalesce(nullif(pricing_payload->>'currency',''),'BRL'),(pricing_payload->>'base_price')::numeric,nullif(pricing_payload->>'promotional_price','')::numeric,coalesce(nullif(pricing_payload->>'single_room_supplement','')::numeric,0),nullif(pricing_payload->>'child_price','')::numeric,nullif(pricing_payload->>'leader_price','')::numeric,coalesce(nullif(pricing_payload->>'minimum_entry','')::numeric,0),coalesce(nullif(pricing_payload->>'maximum_installments','')::integer,1),coalesce(nullif(pricing_payload->>'installment_type',''),'fixa'),coalesce(nullif(pricing_payload->>'cash_discount_max','')::numeric,0),least(coalesce(nullif(pricing_payload->>'ai_discount_max','')::numeric,3),3),coalesce(nullif(pricing_payload->>'consultant_discount_max','')::numeric,3),coalesce(nullif(pricing_payload->>'manager_discount_max','')::numeric,5),nullif(pricing_payload->>'promotion_start','')::timestamptz,nullif(pricing_payload->>'promotion_end','')::timestamptz,coalesce(nullif(pricing_payload->>'proposal_validity_days','')::integer,7),coalesce((pricing_payload->>'active')::boolean,true),auth.uid(),auth.uid()) returning id into target_id;
  else
    update public.caravan_pricing set currency=coalesce(nullif(pricing_payload->>'currency',''),currency),base_price=coalesce(nullif(pricing_payload->>'base_price','')::numeric,base_price),promotional_price=nullif(pricing_payload->>'promotional_price','')::numeric,single_room_supplement=coalesce(nullif(pricing_payload->>'single_room_supplement','')::numeric,single_room_supplement),child_price=nullif(pricing_payload->>'child_price','')::numeric,leader_price=nullif(pricing_payload->>'leader_price','')::numeric,minimum_entry=coalesce(nullif(pricing_payload->>'minimum_entry','')::numeric,minimum_entry),maximum_installments=coalesce(nullif(pricing_payload->>'maximum_installments','')::integer,maximum_installments),installment_type=coalesce(nullif(pricing_payload->>'installment_type',''),installment_type),cash_discount_max=coalesce(nullif(pricing_payload->>'cash_discount_max','')::numeric,cash_discount_max),ai_discount_max=least(coalesce(nullif(pricing_payload->>'ai_discount_max','')::numeric,ai_discount_max),3),consultant_discount_max=coalesce(nullif(pricing_payload->>'consultant_discount_max','')::numeric,consultant_discount_max),manager_discount_max=coalesce(nullif(pricing_payload->>'manager_discount_max','')::numeric,manager_discount_max),promotion_start=nullif(pricing_payload->>'promotion_start','')::timestamptz,promotion_end=nullif(pricing_payload->>'promotion_end','')::timestamptz,proposal_validity_days=coalesce(nullif(pricing_payload->>'proposal_validity_days','')::integer,proposal_validity_days),active=coalesce((pricing_payload->>'active')::boolean,active),updated_by=auth.uid(),updated_at=now() where id=existing_id and organization_id=target_org returning id into target_id;
    if target_id is null then raise exception 'Tabela comercial não encontrada';end if;
  end if;
  return target_id;
end $$;
revoke all on function public.save_caravan_pricing(jsonb,text) from public,anon;
grant execute on function public.save_caravan_pricing(jsonb,text) to authenticated;

create or replace function public.simulate_commercial_offer(simulation_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare target_caravan uuid;target_lead uuid;pricing public.caravan_pricing%rowtype;actor_type text;travelers integer;requested_discount numeric;allowed_discount numeric;gross numeric;entry_value numeric;installment_count integer;first_due date;interest numeric;fee numeric;schedule jsonb;simulation_id uuid;approval_id uuid;accommodation_value text;
begin
  if auth.role() not in('authenticated','service_role') then raise exception 'Acesso não autorizado';end if;
  target_caravan=(simulation_payload->>'caravan_id')::uuid;target_lead=nullif(simulation_payload->>'lead_id','')::uuid;
  actor_type=case when auth.role()='service_role' then 'ia' else coalesce(public.current_role()::text,'cliente') end;
  if actor_type not in('ia','consultor','gestor','administrador') then raise exception 'Perfil sem permissão comercial';end if;
  select * into pricing from public.caravan_pricing where caravan_id=target_caravan and active=true order by updated_at desc limit 1;
  if pricing.id is null then raise exception 'Tabela comercial não cadastrada';end if;
  if not exists(select 1 from public.caravans where id=target_caravan and organization_id=pricing.organization_id and archived_at is null) then raise exception 'Caravana indisponível';end if;
  if target_lead is not null and auth.role()<>'service_role' and not public.can_access_lead(target_lead) then raise exception 'Lead não autorizado';end if;
  travelers=coalesce(nullif(simulation_payload->>'travelers_count','')::integer,1);if travelers<1 or travelers>200 then raise exception 'Quantidade de viajantes inválida';end if;
  accommodation_value=nullif(simulation_payload->>'accommodation','');
  gross=(case when pricing.promotional_price is not null and(coalesce(pricing.promotion_start,'-infinity')<=now())and(coalesce(pricing.promotion_end,'infinity')>=now())then pricing.promotional_price else pricing.base_price end)*travelers;
  if lower(coalesce(accommodation_value,'')) in('individual','single') then gross=gross+pricing.single_room_supplement*travelers;end if;
  requested_discount=coalesce(nullif(simulation_payload->>'discount_percent','')::numeric,0);allowed_discount=public.authorized_discount_limit(target_caravan,actor_type);
  if requested_discount<0 or requested_discount>100 then raise exception 'Desconto inválido';end if;
  if requested_discount>allowed_discount then
    if target_lead is null then return jsonb_build_object('status','requer_aprovacao','allowed_discount_percent',allowed_discount,'message','A condição solicitada precisa ser analisada pela nossa equipe.');end if;
    insert into public.discount_approvals(organization_id,lead_id,caravan_id,requested_discount,requested_discount_percent,allowed_discount,requested_by,requested_by_type,reason)
    values(pricing.organization_id,target_lead,target_caravan,round(gross*requested_discount/100,2),requested_discount,round(gross*allowed_discount/100,2),auth.uid(),case when actor_type='ia' then 'ia' else 'usuario' end,'Desconto solicitado acima do limite autorizado') returning id into approval_id;
    insert into public.tasks(organization_id,lead_id,title,description,due_at,priority,status) values(pricing.organization_id,target_lead,'Analisar solicitação de desconto','Solicitação '||approval_id::text||' aguarda decisão do gestor.',now()+interval '4 hours','alta','pendente');
    return jsonb_build_object('status','requer_aprovacao','approval_id',approval_id,'allowed_discount_percent',allowed_discount,'message','A condição solicitada precisa ser analisada pela nossa equipe.');
  end if;
  entry_value=coalesce(nullif(simulation_payload->>'entry_amount','')::numeric,pricing.minimum_entry);if entry_value<pricing.minimum_entry then raise exception 'Entrada inferior ao mínimo permitido';end if;
  installment_count=coalesce(nullif(simulation_payload->>'installments','')::integer,pricing.maximum_installments);if installment_count<1 or installment_count>pricing.maximum_installments then raise exception 'Quantidade de parcelas não permitida';end if;
  first_due=coalesce(nullif(simulation_payload->>'first_due_date','')::date,current_date+30);interest=coalesce(nullif(simulation_payload->>'monthly_interest_percent','')::numeric,0);fee=coalesce(nullif(simulation_payload->>'fee_amount','')::numeric,0);
  schedule=public.calculate_installment_schedule(gross,requested_discount,entry_value,installment_count,first_due,interest,fee);
  insert into public.commercial_simulations(organization_id,lead_id,caravan_id,pricing_id,actor_type,travelers_count,accommodation,departure_city,currency,gross_amount,discount_percent,discount_amount,fee_amount,entry_amount,financed_amount,installments,installment_schedule,inputs,expires_at,created_by)
  values(pricing.organization_id,target_lead,target_caravan,pricing.id,actor_type,travelers,accommodation_value,nullif(simulation_payload->>'departure_city',''),pricing.currency,(schedule->>'gross_amount')::numeric,(schedule->>'discount_percent')::numeric,(schedule->>'discount_amount')::numeric,(schedule->>'fee_amount')::numeric,(schedule->>'entry_amount')::numeric,(schedule->>'financed_amount')::numeric,installment_count,schedule->'schedule',simulation_payload,now()+(pricing.proposal_validity_days||' days')::interval,auth.uid()) returning id into simulation_id;
  if target_lead is not null then insert into public.lead_activities(lead_id,user_id,activity_type,title,metadata) values(target_lead,auth.uid(),'payment_simulated','Simulação comercial realizada',jsonb_build_object('simulation_id',simulation_id,'caravan_id',target_caravan,'actor_type',actor_type));end if;
  return jsonb_build_object('status','simulado','simulation_id',simulation_id,'allowed_discount_percent',allowed_discount,'currency',pricing.currency,'result',schedule,'expires_at',now()+(pricing.proposal_validity_days||' days')::interval);
end $$;
revoke all on function public.simulate_commercial_offer(jsonb) from public,anon;
grant execute on function public.simulate_commercial_offer(jsonb) to authenticated,service_role;

create or replace function public.create_proposal_from_simulation(target_simulation_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare simulation public.commercial_simulations%rowtype;caravan public.caravans%rowtype;proposal_id uuid;validity timestamptz;
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'Acesso não autorizado';end if;
  select * into simulation from public.commercial_simulations where id=target_simulation_id and organization_id=public.current_organization_id();
  if simulation.id is null or simulation.lead_id is null or not public.can_access_lead(simulation.lead_id) then raise exception 'Simulação não autorizada';end if;
  select * into caravan from public.caravans where id=simulation.caravan_id;validity=simulation.expires_at;
  insert into public.proposals(organization_id,lead_id,caravan_id,simulation_id,status,travelers_count,accommodation,departure_city,currency,gross_amount,discount_amount,final_amount,entry_amount,installments,installment_schedule,includes_snapshot,excludes_snapshot,itinerary_snapshot,valid_until,created_by,responsible_id)
  values(simulation.organization_id,simulation.lead_id,simulation.caravan_id,simulation.id,'rascunho',simulation.travelers_count,simulation.accommodation,simulation.departure_city,simulation.currency,simulation.gross_amount,simulation.discount_amount,simulation.gross_amount-simulation.discount_amount+simulation.fee_amount,simulation.entry_amount,simulation.installments,simulation.installment_schedule,caravan.included,caravan.not_included,coalesce((select jsonb_agg(to_jsonb(i) order by i.position,i.day_number) from public.caravan_itinerary_days i where i.caravan_id=caravan.id),'[]'::jsonb),validity,auth.uid(),auth.uid()) returning id into proposal_id;
  insert into public.proposal_versions(proposal_id,version,snapshot,reason,created_by) select proposal_id,1,to_jsonb(p),'Proposta criada a partir de simulação oficial',auth.uid() from public.proposals p where p.id=proposal_id;
  update public.leads set status='proposta_enviada',updated_at=now() where id=simulation.lead_id;
  insert into public.lead_activities(lead_id,user_id,activity_type,title,metadata) values(simulation.lead_id,auth.uid(),'proposal_created','Proposta comercial gerada',jsonb_build_object('proposal_id',proposal_id,'simulation_id',simulation.id));
  return proposal_id;
end $$;
revoke all on function public.create_proposal_from_simulation(uuid) from public,anon;
grant execute on function public.create_proposal_from_simulation(uuid) to authenticated;

create or replace function public.search_authorized_knowledge(search_text text,external_only boolean default true) returns table(id uuid,title text,category text,content text,source text,source_url text,version integer)
language sql stable security definer set search_path=public as $$
  select k.id,k.title,k.category,k.content,k.source,k.source_url,k.version from public.knowledge_base_articles k
  where k.organization_id=public.default_organization_id() and k.published=true and k.approved_at is not null and(coalesce(k.valid_from,'-infinity')<=now())and(coalesce(k.valid_until,'infinity')>=now())and(not external_only or k.audience in('externo','ambos'))and(nullif(trim(search_text),'') is null or k.title ilike '%'||trim(search_text)||'%' or k.content ilike '%'||trim(search_text)||'%')
  order by k.updated_at desc limit 20
$$;
revoke all on function public.search_authorized_knowledge(text,boolean) from public;
grant execute on function public.search_authorized_knowledge(text,boolean) to authenticated,service_role;
