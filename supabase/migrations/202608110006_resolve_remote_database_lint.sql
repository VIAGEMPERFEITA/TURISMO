-- Resolve os alertas encontrados pelo `supabase db lint --linked` sem alterar
-- contratos públicos ou o comportamento comercial das funções existentes.

alter function public.calculate_installment_schedule(
  numeric,numeric,numeric,integer,date,numeric,numeric
) stable;

create or replace function public.authorized_discount_limit(target_caravan_id uuid,actor_type text) returns numeric
language plpgsql stable security definer set search_path=public as $$
declare pricing public.caravan_pricing%rowtype; config_limit numeric:=3; effective_actor text; role_limit numeric:=0;
begin
  select * into pricing from public.caravan_pricing where caravan_id=target_caravan_id and active=true order by updated_at desc limit 1;
  if pricing.id is null then raise exception 'Tabela comercial não cadastrada';end if;
  if auth.role()='service_role' then
    effective_actor=case when actor_type='ia' then actor_type else 'ia' end;
  else
    effective_actor=coalesce(public.current_role()::text,'cliente');
  end if;
  select coalesce(ai_discount_max,3) into config_limit from public.ai_configurations where organization_id=pricing.organization_id;
  role_limit=case effective_actor when 'ia' then least(pricing.ai_discount_max,config_limit) when 'consultor' then pricing.consultant_discount_max when 'gestor' then pricing.manager_discount_max when 'administrador' then 100 else 0 end;
  return greatest(0,least(role_limit,100));
end $$;

create or replace function public.build_reservation_payment_schedule(
  target_reservation_id uuid,target_option_code text,first_due_date date,target_due_day integer default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare reservation_row public.reservations%rowtype; option_row public.caravan_payment_options%rowtype; terms_row public.caravan_commercial_terms%rowtype; deadline date; item_date date; created_count integer:=0;
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'acesso nao autorizado'; end if;
  select * into reservation_row from public.reservations where id=target_reservation_id and organization_id=public.current_organization_id();
  if reservation_row.id is null then raise exception 'reserva nao encontrada'; end if;
  select * into option_row from public.caravan_payment_options where organization_id=reservation_row.organization_id and caravan_id=reservation_row.caravan_id and code=target_option_code and status='aprovado' and ai_usable=true;
  if option_row.id is null then raise exception 'opcao de pagamento nao aprovada'; end if;
  select * into terms_row from public.caravan_commercial_terms where id=option_row.commercial_terms_id and status='aprovado';
  deadline:=coalesce(
    (select departure_date-terms_row.settlement_days_before_departure from public.caravans where id=reservation_row.caravan_id),
    (first_due_date+interval '11 months')::date
  );
  if first_due_date>deadline then raise exception 'primeiro vencimento ultrapassa o prazo de quitacao'; end if;
  delete from public.payments where reservation_id=reservation_row.id and status='pendente' and external_reference like 'schedule:%';
  insert into public.payments(reservation_id,description,amount,due_date,status,payment_method,installment_number,external_reference,notes)
  values(reservation_row.id,'Entrada da reserva',option_row.entry_amount,current_date,'pendente','pix',0,'schedule:entry','Cronograma interno; aguarda confirmacao de pagamento.');
  created_count:=1;
  for installment_index in 1..option_row.boleto_installments loop
    item_date:=first_due_date+(installment_index-1)*interval '1 month';
    if target_due_day between 1 and 28 then item_date:=make_date(extract(year from item_date)::int,extract(month from item_date)::int,target_due_day); end if;
    if item_date>deadline then raise exception 'parcelamento ultrapassa a quitacao obrigatoria'; end if;
    insert into public.payments(reservation_id,description,amount,due_date,status,payment_method,installment_number,external_reference,notes)
    values(reservation_row.id,'Parcela em boleto '||installment_index,option_row.boleto_installment_amount,item_date,'pendente','boleto',installment_index,'schedule:boleto:'||installment_index,'Cronograma interno; boleto externo ainda nao emitido.');
    created_count:=created_count+1;
  end loop;
  if option_row.card_installments>0 then
    insert into public.payments(reservation_id,description,amount,due_date,status,payment_method,installment_number,external_reference,notes)
    values(reservation_row.id,'Saldo para cartao ('||option_row.card_installments||'x antes das taxas)',option_row.card_installments*option_row.card_installment_amount,deadline,'pendente','cartao',null,'schedule:card','Taxas da operadora devem ser informadas antes da transacao.');
    created_count:=created_count+1;
  end if;
  update public.reservations set total_value=option_row.expected_total,final_value=option_row.expected_total,currency='BRL',updated_at=now() where id=reservation_row.id;
  return jsonb_build_object('created',created_count,'deadline',deadline,'external_charge_created',false);
end $$;

create or replace function public.request_reservation_contract(target_reservation_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.reservations%rowtype; c public.customers%rowtype; caravan public.caravans%rowtype; template public.contract_templates%rowtype; request_id uuid; reasons text[]:='{}'::text[];
begin
  if not public.has_role('administrador','gestor','consultor') then raise exception 'acesso nao autorizado'; end if;
  select * into r from public.reservations where id=target_reservation_id and organization_id=public.current_organization_id();
  select * into c from public.customers where id=r.customer_id and organization_id=r.organization_id;
  select * into caravan from public.caravans where id=r.caravan_id and organization_id=r.organization_id;
  select * into template from public.contract_templates where organization_id=r.organization_id and code='caravana-internacional' order by version desc limit 1;
  if c.id is null or nullif(c.name,'') is null then reasons:=array_append(reasons,'nome_do_cliente_ausente'); end if;
  if nullif(c.email,'') is null then reasons:=array_append(reasons,'email_do_cliente_ausente'); end if;
  if nullif(c.phone,'') is null then reasons:=array_append(reasons,'telefone_do_cliente_ausente'); end if;
  if caravan.id is null then reasons:=array_append(reasons,'caravana_ausente'); end if;
  if template.id is null then raise exception 'modelo contratual nao cadastrado'; end if;
  if template.status<>'aprovado' or template.legal_review_required then reasons:=array_append(reasons,'revisao_juridica_pendente'); end if;
  insert into public.contract_generation_requests(organization_id,reservation_id,caravan_id,template_id,requested_by,variables,status,blocking_reasons)
  values(r.organization_id,r.id,caravan.id,template.id,auth.uid(),jsonb_build_object('cliente',jsonb_build_object('nome',c.name,'email',c.email,'telefone',c.phone,'cidade',c.city,'estado',c.state),'caravana',jsonb_build_object('nome',caravan.name,'destino',caravan.destination,'saida',caravan.departure_date,'retorno',caravan.return_date),'reserva',jsonb_build_object('codigo',r.reservation_code,'viajantes',r.travelers_count,'acomodacao',r.accommodation,'embarque',r.departure_city)),case when cardinality(reasons)>0 then 'bloqueado' else 'pendente' end,reasons)
  returning id into request_id;
  return jsonb_build_object('request_id',request_id,'status',case when cardinality(reasons)>0 then 'bloqueado' else 'pendente' end,'blocking_reasons',reasons,'auto_sent',false);
end $$;

create or replace function public.recalculate_lead_acquisition_score(target_lead_id uuid) returns public.lead_scores language plpgsql security definer set search_path=public as $$
declare l public.leads%rowtype; i public.lead_interests%rowtype; org uuid; fit int:=0; intent int:=0; engagement int:=0; total int; grade text; reasons jsonb:='[]'::jsonb; result public.lead_scores%rowtype;
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

