-- Quarentena segura para contatos incompletos ou com telefone inválido.
begin;
create table if not exists public.contact_import_issues(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 batch_id text not null,card_index integer not null,name text not null,raw_phone text,issue_type text not null check(issue_type in('sem_telefone','telefone_invalido')),
 status text not null default 'pendente' check(status in('pendente','corrigido','ignorado')),resolution_note text,resolved_lead_id uuid references public.leads(id) on delete set null,
 resolved_by uuid references public.profiles(id) on delete set null,resolved_at timestamptz,created_at timestamptz not null default now(),
 unique(organization_id,batch_id,card_index,issue_type)
);
create index if not exists contact_import_issues_review_idx on public.contact_import_issues(organization_id,status,issue_type,created_at desc);
alter table public.contact_import_issues enable row level security;
create policy contact_import_issues_read on public.contact_import_issues for select to authenticated using(organization_id=public.current_organization_id());
create policy contact_import_issues_manage on public.contact_import_issues for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador','gestor')) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor'));
revoke all on public.contact_import_issues from anon;
grant select on public.contact_import_issues to authenticated;
grant insert,update on public.contact_import_issues to authenticated;
commit;
