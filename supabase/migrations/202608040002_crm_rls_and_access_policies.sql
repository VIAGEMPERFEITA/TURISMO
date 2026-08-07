-- Fase 1: segurança por organização, função e atribuição.

create or replace function public.current_organization_id() returns uuid
language sql stable security definer set search_path=public
as $$ select organization_id from public.profiles where id=auth.uid() and active=true $$;

create or replace function public.current_role() returns public.user_role
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active=true $$;

create or replace function public.has_role(variadic allowed_roles public.user_role[]) returns boolean
language sql stable security definer set search_path=public
as $$ select coalesce(public.current_role()=any(allowed_roles),false) $$;

create or replace function public.can_manage_all() returns boolean
language sql stable security definer set search_path=public
as $$ select public.has_role('administrador'::public.user_role,'gestor'::public.user_role) $$;

create or replace function public.can_access_lead(target_lead_id uuid) returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.leads l
    where l.id=target_lead_id
      and l.organization_id=public.current_organization_id()
      and l.deleted_at is null
      and (
        public.can_manage_all()
        or l.assigned_to=auth.uid()
        or exists(select 1 from public.lead_assignments a where a.lead_id=l.id and a.profile_id=auth.uid() and a.unassigned_at is null)
      )
  )
$$;

create or replace function public.can_access_customer(target_customer_id uuid) returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.customers c
    where c.id=target_customer_id
      and c.organization_id=public.current_organization_id()
      and (public.can_manage_all() or (c.lead_id is not null and public.can_access_lead(c.lead_id)))
  )
$$;

create or replace function public.can_access_reservation(target_reservation_id uuid) returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.reservations r
    where r.id=target_reservation_id
      and r.organization_id=public.current_organization_id()
      and (public.can_manage_all() or (r.lead_id is not null and public.can_access_lead(r.lead_id)))
  )
$$;

revoke all on function public.default_organization_id() from public,anon,authenticated;
revoke all on function public.current_organization_id() from public,anon;
revoke all on function public.current_role() from public,anon;
revoke all on function public.has_role(public.user_role[]) from public,anon;
revoke all on function public.can_manage_all() from public,anon;
revoke all on function public.can_access_lead(uuid) from public,anon;
revoke all on function public.can_access_customer(uuid) from public,anon;
revoke all on function public.can_access_reservation(uuid) from public,anon;
grant execute on function public.default_organization_id(),public.current_organization_id(),public.current_role(),public.has_role(public.user_role[]),public.can_manage_all(),public.can_access_lead(uuid),public.can_access_customer(uuid),public.can_access_reservation(uuid) to authenticated;

create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid()=old.id and public.current_role()<>'administrador'::public.user_role then
    if new.role is distinct from old.role or new.organization_id is distinct from old.organization_id or new.active is distinct from old.active then
      raise exception 'profile privilege fields require an administrator';
    end if;
  end if;
  new.updated_at=now();
  return new;
end $$;
drop trigger if exists guard_profile_privileges_trigger on public.profiles;
create trigger guard_profile_privileges_trigger before update on public.profiles for each row execute function public.guard_profile_privileges();

-- RLS em todas as tabelas operacionais, inclusive nas novas entidades.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organizations','profiles','teams','team_members','pipelines','pipeline_stages',
    'caravans','caravan_itinerary_days','leads','lead_interests','lead_notes',
    'lead_activities','lead_status_history','lead_assignments','tasks','customers',
    'contact_channels','conversations','messages','reservations','reservation_travelers',
    'reservation_status_history','payments','payment_transactions','documents',
    'document_requests','tags','lead_tags','system_settings','notifications','audit_logs',
    'email_notifications','webhook_events','destinations_content','experiences_content',
    'faqs_content','articles_content','media_content','testimonials_content',
    'leaders_content','partners_content'
  ] loop execute format('alter table public.%I enable row level security',table_name); end loop;
end $$;

-- Remove políticas anteriores para não manter permissões cumulativas ou amplas.
drop policy if exists profiles_self_read on public.profiles;
drop policy if exists managers_profiles_write on public.profiles;
drop policy if exists public_caravans_read on public.caravans;
drop policy if exists managers_caravans_write on public.caravans;
drop policy if exists staff_leads_read on public.leads;
drop policy if exists staff_leads_write on public.leads;
drop policy if exists related_interests on public.lead_interests;
drop policy if exists related_notes on public.lead_notes;
drop policy if exists related_activities on public.lead_activities;
drop policy if exists related_tasks on public.tasks;
drop policy if exists staff_customers on public.customers;
drop policy if exists staff_reservations on public.reservations;
drop policy if exists staff_travelers on public.reservation_travelers;
drop policy if exists staff_payments on public.payments;
drop policy if exists staff_documents on public.documents;
drop policy if exists staff_tags on public.tags;
drop policy if exists managers_tags_write on public.tags;
drop policy if exists staff_lead_tags on public.lead_tags;
drop policy if exists admins_settings on public.system_settings;
drop policy if exists notifications_own on public.notifications;
drop policy if exists notifications_update on public.notifications;
drop policy if exists managers_audit on public.audit_logs;
drop policy if exists managers_email_notifications_read on public.email_notifications;
drop policy if exists managers_email_notifications_retry on public.email_notifications;
drop policy if exists public_published_itinerary on public.caravan_itinerary_days;
drop policy if exists staff_manage_itinerary on public.caravan_itinerary_days;

create policy organizations_read_own on public.organizations for select to authenticated using(id=public.current_organization_id());
create policy organizations_admin_update on public.organizations for update to authenticated using(id=public.current_organization_id() and public.has_role('administrador')) with check(id=public.current_organization_id() and public.has_role('administrador'));

create policy profiles_read on public.profiles for select to authenticated using(organization_id=public.current_organization_id() and (id=auth.uid() or public.can_manage_all()));
create policy profiles_update on public.profiles for update to authenticated using(organization_id=public.current_organization_id() and (id=auth.uid() or public.has_role('administrador'))) with check(organization_id=public.current_organization_id() and (id=auth.uid() or public.has_role('administrador')));

create policy teams_read on public.teams for select to authenticated using(organization_id=public.current_organization_id());
create policy teams_manage on public.teams for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy team_members_read on public.team_members for select to authenticated using(exists(select 1 from public.teams t where t.id=team_id and t.organization_id=public.current_organization_id()));
create policy team_members_manage on public.team_members for all to authenticated using(exists(select 1 from public.teams t where t.id=team_id and t.organization_id=public.current_organization_id() and public.can_manage_all())) with check(exists(select 1 from public.teams t where t.id=team_id and t.organization_id=public.current_organization_id() and public.can_manage_all()));

create policy pipelines_read on public.pipelines for select to authenticated using(organization_id=public.current_organization_id());
create policy pipelines_manage on public.pipelines for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy pipeline_stages_read on public.pipeline_stages for select to authenticated using(exists(select 1 from public.pipelines p where p.id=pipeline_id and p.organization_id=public.current_organization_id()));
create policy pipeline_stages_manage on public.pipeline_stages for all to authenticated using(exists(select 1 from public.pipelines p where p.id=pipeline_id and p.organization_id=public.current_organization_id() and public.can_manage_all())) with check(exists(select 1 from public.pipelines p where p.id=pipeline_id and p.organization_id=public.current_organization_id() and public.can_manage_all()));

create policy caravans_public_read on public.caravans for select to anon using(published=true and archived_at is null);
create policy caravans_staff_read on public.caravans for select to authenticated using((published=true and archived_at is null) or organization_id=public.current_organization_id());
create policy caravans_manage on public.caravans for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy itinerary_public_read on public.caravan_itinerary_days for select to anon using(exists(select 1 from public.caravans c where c.id=caravan_id and c.published=true and c.archived_at is null));
create policy itinerary_staff_read on public.caravan_itinerary_days for select to authenticated using(exists(select 1 from public.caravans c where c.id=caravan_id and c.organization_id=public.current_organization_id()));
create policy itinerary_manage on public.caravan_itinerary_days for all to authenticated using(exists(select 1 from public.caravans c where c.id=caravan_id and c.organization_id=public.current_organization_id() and public.can_manage_all())) with check(exists(select 1 from public.caravans c where c.id=caravan_id and c.organization_id=public.current_organization_id() and public.can_manage_all()));

create policy leads_read on public.leads for select to authenticated using(public.can_access_lead(id));
create policy leads_insert on public.leads for insert to authenticated with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy leads_update on public.leads for update to authenticated using(public.can_access_lead(id) and public.has_role('administrador','gestor','consultor')) with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy leads_delete on public.leads for delete to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador'));

create policy lead_interests_read on public.lead_interests for select to authenticated using(public.can_access_lead(lead_id));
create policy lead_interests_insert on public.lead_interests for insert to authenticated with check(public.can_access_lead(lead_id));
create policy lead_interests_manage on public.lead_interests for update to authenticated using(public.can_access_lead(lead_id) and public.can_manage_all()) with check(public.can_access_lead(lead_id) and public.can_manage_all());
create policy lead_interests_delete on public.lead_interests for delete to authenticated using(public.can_access_lead(lead_id) and public.can_manage_all());
create policy lead_notes_read on public.lead_notes for select to authenticated using(public.can_access_lead(lead_id));
create policy lead_notes_insert on public.lead_notes for insert to authenticated with check(public.can_access_lead(lead_id) and (author_id=auth.uid() or public.can_manage_all()));
create policy lead_notes_update on public.lead_notes for update to authenticated using(public.can_access_lead(lead_id) and (author_id=auth.uid() or public.can_manage_all())) with check(public.can_access_lead(lead_id) and (author_id=auth.uid() or public.can_manage_all()));
create policy lead_notes_delete on public.lead_notes for delete to authenticated using(public.can_access_lead(lead_id) and (author_id=auth.uid() or public.can_manage_all()));
create policy lead_activities_read on public.lead_activities for select to authenticated using(public.can_access_lead(lead_id));
create policy lead_activities_insert on public.lead_activities for insert to authenticated with check(public.can_access_lead(lead_id) and (user_id is null or user_id=auth.uid() or public.can_manage_all()));
create policy lead_history_read on public.lead_status_history for select to authenticated using(public.can_access_lead(lead_id));
create policy assignments_read on public.lead_assignments for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or profile_id=auth.uid() or public.can_access_lead(lead_id)));
create policy assignments_manage on public.lead_assignments for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());

create policy tasks_read on public.tasks for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid() or created_by=auth.uid() or (lead_id is not null and public.can_access_lead(lead_id))));
create policy tasks_insert on public.tasks for insert to authenticated with check(organization_id=public.current_organization_id() and public.has_role('administrador','gestor','consultor'));
create policy tasks_update on public.tasks for update to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid() or created_by=auth.uid())) with check(organization_id=public.current_organization_id());
create policy tasks_delete on public.tasks for delete to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or created_by=auth.uid()));

create policy customers_read on public.customers for select to authenticated using(public.can_access_customer(id));
create policy customers_insert on public.customers for insert to authenticated with check(organization_id=public.current_organization_id() and (public.can_manage_all() or (lead_id is not null and public.can_access_lead(lead_id))));
create policy customers_update on public.customers for update to authenticated using(public.can_access_customer(id) and public.has_role('administrador','gestor','consultor')) with check(organization_id=public.current_organization_id());
create policy customers_delete on public.customers for delete to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador'));
create policy reservations_read on public.reservations for select to authenticated using(public.can_access_reservation(id));
create policy reservations_insert on public.reservations for insert to authenticated with check(organization_id=public.current_organization_id() and (public.can_manage_all() or (lead_id is not null and public.can_access_lead(lead_id))));
create policy reservations_update on public.reservations for update to authenticated using(public.can_access_reservation(id) and public.has_role('administrador','gestor','consultor')) with check(organization_id=public.current_organization_id());
create policy reservations_delete on public.reservations for delete to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador'));
create policy travelers_read on public.reservation_travelers for select to authenticated using(public.can_access_reservation(reservation_id));
create policy travelers_insert on public.reservation_travelers for insert to authenticated with check(public.can_access_reservation(reservation_id));
create policy travelers_update on public.reservation_travelers for update to authenticated using(public.can_access_reservation(reservation_id)) with check(public.can_access_reservation(reservation_id));
create policy travelers_delete on public.reservation_travelers for delete to authenticated using(public.can_access_reservation(reservation_id) and public.can_manage_all());
create policy reservation_history_access on public.reservation_status_history for select to authenticated using(public.can_access_reservation(reservation_id));
create policy payments_read on public.payments for select to authenticated using(public.can_access_reservation(reservation_id));
create policy payments_insert on public.payments for insert to authenticated with check(public.can_access_reservation(reservation_id) and public.can_manage_all());
create policy payments_update on public.payments for update to authenticated using(public.can_access_reservation(reservation_id) and public.can_manage_all()) with check(public.can_access_reservation(reservation_id) and public.can_manage_all());
create policy payments_delete on public.payments for delete to authenticated using(public.can_access_reservation(reservation_id) and public.has_role('administrador'));
create policy payment_transactions_access on public.payment_transactions for select to authenticated using(organization_id=public.current_organization_id() and exists(select 1 from public.payments p where p.id=payment_id and public.can_access_reservation(p.reservation_id)));
create policy payment_transactions_manage on public.payment_transactions for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy documents_read on public.documents for select to authenticated using(public.can_access_reservation(reservation_id));
create policy documents_insert on public.documents for insert to authenticated with check(public.can_access_reservation(reservation_id) and public.has_role('administrador','gestor','consultor'));
create policy documents_update on public.documents for update to authenticated using(public.can_access_reservation(reservation_id) and public.has_role('administrador','gestor','consultor')) with check(public.can_access_reservation(reservation_id));
create policy documents_delete on public.documents for delete to authenticated using(public.can_access_reservation(reservation_id) and public.can_manage_all());
create policy document_requests_read on public.document_requests for select to authenticated using(organization_id=public.current_organization_id() and public.can_access_reservation(reservation_id));
create policy document_requests_insert on public.document_requests for insert to authenticated with check(organization_id=public.current_organization_id() and public.can_access_reservation(reservation_id) and public.has_role('administrador','gestor','consultor'));
create policy document_requests_update on public.document_requests for update to authenticated using(organization_id=public.current_organization_id() and public.can_access_reservation(reservation_id) and public.has_role('administrador','gestor','consultor')) with check(organization_id=public.current_organization_id() and public.can_access_reservation(reservation_id));
create policy document_requests_delete on public.document_requests for delete to authenticated using(organization_id=public.current_organization_id() and public.can_access_reservation(reservation_id) and public.can_manage_all());

create policy contact_channels_read on public.contact_channels for select to authenticated using(organization_id=public.current_organization_id() and ((lead_id is not null and public.can_access_lead(lead_id)) or (customer_id is not null and public.can_access_customer(customer_id))));
create policy contact_channels_write on public.contact_channels for insert to authenticated with check(organization_id=public.current_organization_id() and ((lead_id is not null and public.can_access_lead(lead_id)) or (customer_id is not null and public.can_access_customer(customer_id))));
create policy contact_channels_update on public.contact_channels for update to authenticated using(organization_id=public.current_organization_id() and ((lead_id is not null and public.can_access_lead(lead_id)) or (customer_id is not null and public.can_access_customer(customer_id)))) with check(organization_id=public.current_organization_id());
create policy contact_channels_delete on public.contact_channels for delete to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy conversations_read on public.conversations for select to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid() or (lead_id is not null and public.can_access_lead(lead_id)) or (customer_id is not null and public.can_access_customer(customer_id))));
create policy conversations_insert on public.conversations for insert to authenticated with check(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid() or (lead_id is not null and public.can_access_lead(lead_id))));
create policy conversations_update on public.conversations for update to authenticated using(organization_id=public.current_organization_id() and (public.can_manage_all() or assigned_to=auth.uid() or (lead_id is not null and public.can_access_lead(lead_id)))) with check(organization_id=public.current_organization_id());
create policy conversations_delete on public.conversations for delete to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy messages_read on public.messages for select to authenticated using(exists(select 1 from public.conversations c where c.id=conversation_id and c.organization_id=public.current_organization_id() and (public.can_manage_all() or c.assigned_to=auth.uid() or (c.lead_id is not null and public.can_access_lead(c.lead_id)))));
create policy messages_insert on public.messages for insert to authenticated with check(exists(select 1 from public.conversations c where c.id=conversation_id and c.organization_id=public.current_organization_id() and (public.can_manage_all() or c.assigned_to=auth.uid() or (c.lead_id is not null and public.can_access_lead(c.lead_id)))));
create policy messages_update on public.messages for update to authenticated using(sender_profile_id=auth.uid() and direction in('saida','interno') and exists(select 1 from public.conversations c where c.id=conversation_id and c.organization_id=public.current_organization_id())) with check(sender_profile_id=auth.uid());

create policy tags_read on public.tags for select to authenticated using(organization_id=public.current_organization_id());
create policy tags_manage on public.tags for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
create policy lead_tags_access on public.lead_tags for all to authenticated using(public.can_access_lead(lead_id) and exists(select 1 from public.tags t where t.id=tag_id and t.organization_id=public.current_organization_id())) with check(public.can_access_lead(lead_id) and exists(select 1 from public.tags t where t.id=tag_id and t.organization_id=public.current_organization_id()));

create policy settings_read on public.system_settings for select to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy settings_manage on public.system_settings for all to authenticated using(organization_id=public.current_organization_id() and public.has_role('administrador')) with check(organization_id=public.current_organization_id() and public.has_role('administrador'));
create policy notifications_read_own on public.notifications for select to authenticated using(organization_id=public.current_organization_id() and user_id=auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using(organization_id=public.current_organization_id() and user_id=auth.uid()) with check(organization_id=public.current_organization_id() and user_id=auth.uid());
create policy audit_logs_read on public.audit_logs for select to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy email_notifications_read on public.email_notifications for select to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all());
create policy email_notifications_update on public.email_notifications for update to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all());
-- webhook_events não possui política de cliente: somente service_role processa integrações.

-- Conteúdo: leitura pública somente quando publicado; edição limitada a gestor/administrador da organização.
do $$
declare table_name text;
begin
  foreach table_name in array array['destinations_content','experiences_content','faqs_content','articles_content','media_content','testimonials_content','leaders_content','partners_content'] loop
    execute format('drop policy if exists %I on public.%I','read_'||table_name,table_name);
    execute format('drop policy if exists %I on public.%I','manage_'||table_name,table_name);
    execute format('create policy %I on public.%I for select to anon using(published=true and archived_at is null)','public_read_'||table_name,table_name);
    execute format('create policy %I on public.%I for select to authenticated using((published=true and archived_at is null) or organization_id=public.current_organization_id())','staff_read_'||table_name,table_name);
    execute format('create policy %I on public.%I for all to authenticated using(organization_id=public.current_organization_id() and public.can_manage_all()) with check(organization_id=public.current_organization_id() and public.can_manage_all())','staff_manage_'||table_name,table_name);
  end loop;
end $$;

drop policy if exists staff_private_documents_read on storage.objects;
drop policy if exists staff_private_documents_insert on storage.objects;
drop policy if exists managers_private_documents_delete on storage.objects;
create policy private_documents_read on storage.objects for select to authenticated using(bucket_id='private-documents' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_role('administrador','gestor','consultor'));
create policy private_documents_insert on storage.objects for insert to authenticated with check(bucket_id='private-documents' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_role('administrador','gestor','consultor'));
create policy private_documents_update on storage.objects for update to authenticated using(bucket_id='private-documents' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_role('administrador','gestor')) with check(bucket_id='private-documents' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_role('administrador','gestor'));
create policy private_documents_delete on storage.objects for delete to authenticated using(bucket_id='private-documents' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_role('administrador','gestor'));

drop policy if exists public_site_media_read on storage.objects;
drop policy if exists managers_site_media_write on storage.objects;
drop policy if exists managers_site_media_update on storage.objects;
drop policy if exists managers_site_media_delete on storage.objects;
create policy site_media_public_read on storage.objects for select using(bucket_id='site-media');
create policy site_media_insert on storage.objects for insert to authenticated with check(bucket_id='site-media' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.can_manage_all());
create policy site_media_update on storage.objects for update to authenticated using(bucket_id='site-media' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.can_manage_all()) with check(bucket_id='site-media' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.can_manage_all());
create policy site_media_delete on storage.objects for delete to authenticated using(bucket_id='site-media' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.can_manage_all());
