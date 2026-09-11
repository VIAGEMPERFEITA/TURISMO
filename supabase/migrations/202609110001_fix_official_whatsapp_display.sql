update public.whatsapp_accounts
set display_phone = '+55 31 99528-5665', updated_at = now()
where phone_number_id = '940728502466959'
  and phone_e164 = '5531995285665';
