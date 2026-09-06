begin;

-- Reconcilia no CRM o modelo que já consta como ativo no WhatsApp Manager.
-- O envio real permanece bloqueado até a conta oficial possuir phone_number_id,
-- coexistência ativa e credencial persistente válida.
insert into public.message_templates (
  organization_id,
  whatsapp_account_id,
  name,
  category,
  language_code,
  content,
  variables,
  status,
  meta_template_id,
  last_synced_at
)
select
  o.id,
  wa.id,
  'informacoes_caravana',
  'MARKETING',
  'pt_BR',
  'Olá, {{1}}! Você solicitou informações sobre a caravana {{2}}. Podemos enviar os detalhes atualizados de roteiro, datas e condições?',
  array['nome', 'caravana'],
  'aprovado',
  '2303477083749423',
  now()
from public.organizations o
left join public.whatsapp_accounts wa
  on wa.organization_id = o.id
 and wa.phone_e164 = '5531995285665'
where o.slug = 'viagem-perfeita'
on conflict (organization_id, name, language_code, version) do update
set whatsapp_account_id = excluded.whatsapp_account_id,
    category = excluded.category,
    content = excluded.content,
    variables = excluded.variables,
    status = excluded.status,
    meta_template_id = excluded.meta_template_id,
    last_synced_at = excluded.last_synced_at,
    updated_at = now();

commit;
