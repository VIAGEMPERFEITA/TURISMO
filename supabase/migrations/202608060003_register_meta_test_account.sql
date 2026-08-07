-- Conta de teste criada pela Meta para homologação da Cloud API.
begin;

insert into public.whatsapp_accounts(
  organization_id,
  name,
  phone_e164,
  display_phone,
  waba_id,
  phone_number_id,
  api_version,
  status,
  verified_name,
  metadata
)
select
  id,
  'WhatsApp Meta — homologação',
  '15556752315',
  '+1 555 675 2315',
  '1077957561405552',
  '1203237242880072',
  'v25.0',
  'teste',
  'Número de teste Meta',
  jsonb_build_object('environment','test','created_by','meta_cloud_api')
from public.organizations
where slug='viagem-perfeita'
on conflict(organization_id,phone_e164) do update set
  waba_id=excluded.waba_id,
  phone_number_id=excluded.phone_number_id,
  api_version=excluded.api_version,
  status='teste',
  updated_at=now();

commit;
