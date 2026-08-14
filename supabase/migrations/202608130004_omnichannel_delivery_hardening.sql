-- Operational hardening for the public site and Meta channels.
alter table public.omnichannel_handoffs
  add column if not exists source_event_id uuid references public.social_events(id) on delete set null,
  add column if not exists consent_confirmed_at timestamptz;

create unique index if not exists omnichannel_handoffs_source_event_uidx
  on public.omnichannel_handoffs (organization_id, source_channel, source_event_id)
  where source_event_id is not null;

create unique index if not exists omnichannel_handoffs_source_message_uidx
  on public.omnichannel_handoffs (organization_id, source_channel, source_message_id)
  where source_message_id is not null;

create unique index if not exists conversations_site_thread_uidx
  on public.conversations (organization_id, channel_account_id, external_thread_id)
  where channel = 'site' and external_thread_id is not null;

update public.channel_accounts
set status = 'connected', updated_at = now()
where channel = 'site_chat' and status = 'sandbox';
