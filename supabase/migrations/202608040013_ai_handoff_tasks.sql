begin;

alter table public.tasks add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
create index if not exists tasks_conversation_idx on public.tasks(organization_id,conversation_id,status,created_at desc) where conversation_id is not null;

comment on column public.tasks.conversation_id is 'Permite acompanhar handoffs anônimos da IA antes da identificação do lead.';

commit;
