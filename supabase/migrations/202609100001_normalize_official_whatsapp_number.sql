-- A Cloud API pode retornar números móveis brasileiros no formato legado, sem
-- o nono dígito. Mantemos no CRM o E.164 confirmado pelo administrador e
-- preservamos o registro técnico anterior como histórico desativado.
do $$
declare
  source_account public.whatsapp_accounts%rowtype;
  target_id uuid;
begin
  select * into source_account
  from public.whatsapp_accounts
  where phone_number_id = '940728502466959'
    and phone_e164 = '553195285665'
  limit 1;

  if not found then return; end if;

  select id into target_id
  from public.whatsapp_accounts
  where organization_id = source_account.organization_id
    and phone_e164 = '5531995285665'
  limit 1;

  if target_id is null then
    update public.whatsapp_accounts
    set phone_e164 = '5531995285665',
        display_phone = '+55 31 99528-5665',
        updated_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'meta_display_phone', display_phone,
          'phone_normalization', 'br_mobile_ninth_digit'
        )
    where id = source_account.id;
    return;
  end if;

  update public.whatsapp_accounts
  set phone_number_id = null,
      status = 'desativado',
      coexistence_enabled = false,
      updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'superseded_by', target_id,
        'superseded_at', now()
      )
  where id = source_account.id;

  update public.whatsapp_accounts
  set name = source_account.name,
      display_phone = '+55 31 99528-5665',
      waba_id = source_account.waba_id,
      phone_number_id = source_account.phone_number_id,
      meta_app_id = source_account.meta_app_id,
      api_version = source_account.api_version,
      status = source_account.status,
      coexistence_enabled = source_account.coexistence_enabled,
      verified_name = source_account.verified_name,
      quality_rating = source_account.quality_rating,
      token_secret_name = source_account.token_secret_name,
      updated_at = now(),
      metadata = coalesce(source_account.metadata, '{}'::jsonb) || jsonb_build_object(
        'meta_display_phone', source_account.display_phone,
        'phone_normalization', 'br_mobile_ninth_digit'
      )
  where id = target_id;
end $$;
