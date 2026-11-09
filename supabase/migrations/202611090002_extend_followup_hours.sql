-- Amplia a janela das retomadas automáticas da Viagem Perfeita.
-- O atendimento receptivo continua respondendo quando o cliente inicia o contato;
-- esta janela controla somente retomadas proativas e mantém consentimento obrigatório.
begin;

update public.sales_followup_policies p
set business_hour_start=8,
    business_hour_end=22,
    timezone='America/Sao_Paulo',
    updated_at=now()
from public.organizations o
where o.id=p.organization_id
  and o.slug='viagem-perfeita';

commit;
