-- Remove a variável explícita que colidia com a variável criada pelo FOR.
create or replace function public.calculate_installment_schedule(
  total_amount numeric,
  discount_percent numeric,
  entry_amount numeric,
  installment_count integer,
  first_due_date date,
  monthly_interest numeric default 0,
  fee_amount numeric default 0
) returns jsonb language plpgsql stable set search_path=public as $$
declare discounted numeric(14,2); financed numeric(14,2); installment_total numeric(14,2); base_installment numeric(14,2); remainder numeric(14,2); schedule jsonb='[]'::jsonb; value numeric(14,2);
begin
  if total_amount<0 or discount_percent<0 or discount_percent>100 or entry_amount<0 or installment_count<1 or installment_count>60 or monthly_interest<0 or fee_amount<0 then raise exception 'Parâmetros inválidos para simulação';end if;
  discounted=round(total_amount*(1-discount_percent/100),2);
  if entry_amount>discounted+fee_amount then raise exception 'A entrada não pode superar o valor final';end if;
  financed=round(discounted+fee_amount-entry_amount,2);
  if monthly_interest>0 then installment_total=round(financed*power(1+monthly_interest/100,installment_count),2);else installment_total=financed;end if;
  base_installment=trunc((installment_total/installment_count)*100)/100;
  remainder=round(installment_total-base_installment*installment_count,2);
  for installment_index in 1..installment_count loop
    value=base_installment+case when installment_index=installment_count then remainder else 0 end;
    schedule=schedule||jsonb_build_array(jsonb_build_object('number',installment_index,'due_date',(first_due_date+(installment_index-1)*interval '1 month')::date,'amount',round(value,2)));
  end loop;
  return jsonb_build_object('gross_amount',round(total_amount,2),'discount_percent',round(discount_percent,2),'discount_amount',round(total_amount-discounted,2),'fee_amount',round(fee_amount,2),'entry_amount',round(entry_amount,2),'financed_amount',financed,'installments',installment_count,'installment_total',installment_total,'schedule',schedule);
end $$;

