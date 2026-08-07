begin;

update public.organizations
set phone='5531995285665',updated_at=now()
where slug='viagem-perfeita' and phone is distinct from '5531995285665';

commit;
