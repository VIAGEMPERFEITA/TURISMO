create table if not exists public.secure_traveler_intakes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'pendente' check (status in ('pendente','preenchido','expirado','cancelado')),
  traveler_count integer not null default 1 check (traveler_count between 1 and 12),
  payload_ciphertext text,
  payload_iv text,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists secure_traveler_intakes_conversation_idx
  on public.secure_traveler_intakes(conversation_id, created_at desc);

alter table public.secure_traveler_intakes enable row level security;

revoke all on table public.secure_traveler_intakes from anon, authenticated;
grant select on table public.secure_traveler_intakes to authenticated;

create policy secure_traveler_intakes_staff_read
  on public.secure_traveler_intakes for select to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.has_role('administrador','gestor')
  );

comment on table public.secure_traveler_intakes is
  'Formulários individuais de reserva; dados pessoais permanecem cifrados e nunca trafegam pelo chat.';

alter table public.caravans add column if not exists leader_names text[] not null default '{}';
comment on column public.caravans.leader_names is
  'Pastores e líderes oficialmente vinculados à saída; vazio significa vínculo ainda não confirmado.';

