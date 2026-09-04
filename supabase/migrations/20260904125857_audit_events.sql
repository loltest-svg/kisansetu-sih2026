-- Phase 3B — Migration 5: audit_events
--
-- Scope: docs/DATABASE.md §18 row 10 only — audit_events, and the
-- database triggers on the tables it names (centre_status, bookings,
-- procurement_records, payment_records, centre_assignments, profiles
-- role/account_status). Depends on rows 1,3,4,5,7,9, all already applied.
--
-- Chosen deliberately before Migration 6 (the RPC layer, §18 row 12):
-- row 12 formally depends on row 10, and docs/DATABASE.md §16 states
-- audit logging via trigger is "a Phase 3B implementation requirement,
-- not an optional nicety." Building RPCs before this would ship every
-- booking/check-in/call-next/status-change with zero accountability
-- trail — exactly the S-11 gap the design calls out.
--
-- These triggers are correctly inert for client traffic today: none of
-- the six source tables has any client write policy yet (RPC-only,
-- no RPC exists until Migration 6+), so nothing currently writes to
-- them except direct/service-role SQL. They exist now so that the moment
-- Migration 6 lands a working rpc_create_booking, the audit trail is
-- already there — not retrofitted after the fact onto a live table.
--
-- Not built here: views (row 11), the RPC layer (row 12), realtime
-- (row 13), the expiry sweep (row 14), seed data (row 15).

-- ============================================================
-- 1. audit_events (docs/DATABASE.md §16)
-- ============================================================

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles (id),
  actor_role_snapshot public.user_role,
  actor_name_snapshot text,
  centre_id uuid references public.procurement_centres (id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  metadata jsonb
);

create index audit_events_occurred_at_idx
  on public.audit_events (occurred_at desc);

create index audit_events_centre_occurred_idx
  on public.audit_events (centre_id, occurred_at desc);

create index audit_events_entity_idx
  on public.audit_events (entity_type, entity_id);

alter table public.audit_events enable row level security;

-- docs/SECURITY.md §3: Farmer —, Operator —, Centre Admin R own centre,
-- Master Admin R all.
create policy audit_events_select on public.audit_events
for select to authenticated
using (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

-- "No UPDATE/DELETE grants to any client role for any reason" (§16) —
-- explicit grant-level revocation, matching RLS-1's column-grant layer
-- pattern from Migration 1: the absence of a write policy already
-- default-denies this, but the design asks for the stronger, explicit
-- statement at the grant layer too. INSERT is exclusively via the
-- SECURITY DEFINER write_audit_event() helper below, called only from
-- triggers — never granted to a client role.
revoke insert, update, delete, truncate on public.audit_events from anon, authenticated;

-- ============================================================
-- 2. Actor attribution (docs/DATABASE.md §16 "Actor attribution under
--    the service role" — explicitly flagged as a Phase 3B requirement)
-- ============================================================
-- Inside a trigger, auth.uid() is NULL when the firing statement ran
-- under the service role. A future privileged server path (an RPC
-- invoked by a server action, not yet built) sets
-- `SET LOCAL app.actor_profile_id` for the duration of its transaction;
-- this helper prefers that over auth.uid() so service-role-driven writes
-- are still attributed to a real actor rather than logged as anonymous.

create function public.current_actor_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('app.actor_profile_id', true), '')::uuid,
    auth.uid()
  );
$$;

-- ============================================================
-- 3. Shared audit-write helper
-- ============================================================
-- The single place every trigger below funnels through, so the
-- actor-snapshot lookup (role/name at the time, §16 "snapshots, not
-- joins") is written once. SECURITY DEFINER so it can insert into
-- audit_events despite that table's client-write revocation above; never
-- granted to any client role (see the revokes at the end of this file) —
-- it is reachable only from the trigger functions in this migration,
-- which call it in their own firing context, not via a direct grant.
-- Callers must never pass a phone number or credential into `metadata`
-- (docs/SECURITY.md S-10) — enforced by each trigger's own field
-- allow-list below, not by this helper (which has no way to know which
-- fields are PII for an arbitrary caller).

create function public.write_audit_event(
  p_entity_type text,
  p_entity_id uuid,
  p_centre_id uuid,
  p_action text,
  p_summary text,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_role public.user_role;
  v_actor_name text;
begin
  v_actor_id := public.current_actor_profile_id();

  if v_actor_id is not null then
    select role, full_name into v_actor_role, v_actor_name
    from public.profiles
    where id = v_actor_id;
  end if;

  insert into public.audit_events (
    actor_profile_id, actor_role_snapshot, actor_name_snapshot, centre_id,
    entity_type, entity_id, action, summary, metadata
  )
  values (
    v_actor_id, v_actor_role, v_actor_name, p_centre_id,
    p_entity_type, p_entity_id, p_action, p_summary, p_metadata
  );
end;
$$;

-- ============================================================
-- 4. Per-table audit triggers
-- ============================================================

-- --- centre_status ---
-- Action names taken from §16's given vocabulary (CENTRE_STATUS_CHANGED,
-- DELAY_REPORTED, CENTRE_PAUSED, CENTRE_RESUMED), mapped onto the
-- specific transition each name most literally describes; `action` is
-- typed `text`, not an enum, so this mapping is a direct, non-inventive
-- completion of the documented list, not a new vocabulary.
create function public.audit_centre_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  v_action := case
    when new.status = 'PAUSED' then 'CENTRE_PAUSED'
    when new.status = 'DELAYED' then 'DELAY_REPORTED'
    when new.status = 'OPEN' and TG_OP = 'UPDATE' and old.status in ('PAUSED', 'DELAYED') then 'CENTRE_RESUMED'
    else 'CENTRE_STATUS_CHANGED'
  end;

  perform public.write_audit_event(
    'centre_status',
    new.centre_id,
    new.centre_id,
    v_action,
    format(
      'Centre status changed from %s to %s',
      case when TG_OP = 'UPDATE' then old.status::text else '(none)' end,
      new.status
    ),
    jsonb_build_object(
      'from_status', case when TG_OP = 'UPDATE' then old.status else null end,
      'to_status', new.status,
      'delay_reason', new.delay_reason
    )
  );
  return new;
end;
$$;

create trigger centre_status_audit
  after insert or update on public.centre_status
  for each row execute function public.audit_centre_status();

-- --- bookings ---
-- BOOKING_CHECKED_IN and QUEUE_CALLED_NEXT are §16's exact names for
-- those two transitions. The remaining transitions have no name given in
-- §16's illustrative list; named here following the same
-- `BOOKING_<PAST_TENSE_EVENT>` convention rather than left unaudited —
-- `action` being `text`, not an enum, this is additive, not a
-- redefinition. No PII (farmer_name_snapshot/farmer_phone_snapshot) is
-- ever placed in metadata (docs/SECURITY.md S-10) — only status/token.
create function public.audit_bookings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if TG_OP = 'INSERT' then
    v_action := 'BOOKING_CREATED';
  elsif new.status is distinct from old.status then
    v_action := case new.status
      when 'CHECKED_IN' then 'BOOKING_CHECKED_IN'
      when 'CALLED' then 'QUEUE_CALLED_NEXT'
      when 'IN_PROGRESS' then 'BOOKING_PROCESSING_STARTED'
      when 'COMPLETED' then 'BOOKING_COMPLETED'
      when 'CANCELLED' then 'BOOKING_CANCELLED'
      when 'NO_SHOW' then 'BOOKING_NO_SHOW'
      when 'EXPIRED' then 'BOOKING_EXPIRED'
      else 'BOOKING_STATUS_CHANGED'
    end;
  else
    return new;
  end if;

  perform public.write_audit_event(
    'booking',
    new.id,
    new.centre_id,
    v_action,
    format(
      'Booking %s status %s -> %s',
      new.token,
      case when TG_OP = 'UPDATE' then old.status::text else '(none)' end,
      new.status
    ),
    jsonb_build_object(
      'from_status', case when TG_OP = 'UPDATE' then old.status else null end,
      'to_status', new.status,
      'token', new.token
    )
  );
  return new;
end;
$$;

create trigger bookings_audit
  after insert or update on public.bookings
  for each row execute function public.audit_bookings();

-- --- procurement_records ---
-- §16 names only PROCUREMENT_COMPLETED for this table; audited only when
-- procured_at newly becomes non-null, matching that single documented
-- action rather than inventing separate quality/weighment events.
create function public.audit_procurement_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.procured_at is not null and (TG_OP = 'INSERT' or old.procured_at is null) then
    perform public.write_audit_event(
      'procurement_record',
      new.booking_id,
      (select b.centre_id from public.bookings b where b.id = new.booking_id),
      'PROCUREMENT_COMPLETED',
      format('Procurement completed for booking %s', new.booking_id),
      jsonb_build_object(
        'quality_result', new.quality_result,
        'accepted_quantity_quintal', new.accepted_quantity_quintal
      )
    );
  end if;
  return new;
end;
$$;

create trigger procurement_records_audit
  after insert or update on public.procurement_records
  for each row execute function public.audit_procurement_records();

-- --- payment_records ---
create function public.audit_payment_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    perform public.write_audit_event(
      'payment_record',
      new.booking_id,
      (select b.centre_id from public.bookings b where b.id = new.booking_id),
      'PAYMENT_STATUS_CHANGED',
      format('Payment status %s -> %s for booking %s', old.status, new.status, new.booking_id),
      jsonb_build_object('from_status', old.status, 'to_status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger payment_records_audit
  after update on public.payment_records
  for each row execute function public.audit_payment_records();

-- --- centre_assignments ---
create function public.audit_centre_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role public.user_role;
begin
  if TG_OP = 'INSERT' then
    select role into v_target_role from public.profiles where id = new.profile_id;

    perform public.write_audit_event(
      'centre_assignment',
      new.id,
      new.centre_id,
      case when v_target_role = 'CENTRE_ADMIN' then 'CENTRE_ADMIN_ASSIGNED' else 'OPERATOR_ASSIGNED' end,
      format('Profile %s assigned to centre %s', new.profile_id, new.centre_id),
      jsonb_build_object('profile_id', new.profile_id, 'centre_id', new.centre_id)
    );
    return new;
  end if;

  if new.revoked_at is not null and old.revoked_at is null then
    perform public.write_audit_event(
      'centre_assignment',
      new.id,
      new.centre_id,
      'ASSIGNMENT_REVOKED',
      format('Assignment of profile %s at centre %s revoked', new.profile_id, new.centre_id),
      jsonb_build_object('profile_id', new.profile_id, 'centre_id', new.centre_id)
    );
  end if;
  return new;
end;
$$;

create trigger centre_assignments_audit
  after insert or update on public.centre_assignments
  for each row execute function public.audit_centre_assignments();

-- --- profiles (role / account_status only) ---
-- Fires after prevent_privileged_self_update (Migration 1's backstop);
-- ordering between two BEFORE/AFTER triggers on the same table does not
-- affect correctness here — if the guard trigger rejects the change, the
-- whole statement (and any audit insert already attempted) rolls back
-- together, so no rejected attempt is ever logged as if it succeeded.
create function public.audit_profiles_role_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_summary text;
begin
  if new.role is distinct from old.role then
    v_action := 'ACCOUNT_ROLE_CHANGED';
    v_summary := format('Role changed from %s to %s', old.role, new.role);
  elsif new.account_status is distinct from old.account_status then
    v_action := case when new.account_status = 'SUSPENDED' then 'ACCOUNT_SUSPENDED' else 'ACCOUNT_STATUS_CHANGED' end;
    v_summary := format('Account status changed from %s to %s', old.account_status, new.account_status);
  else
    return new;
  end if;

  perform public.write_audit_event(
    'profile',
    new.id,
    null,
    v_action,
    v_summary,
    jsonb_build_object(
      'from_role', old.role, 'to_role', new.role,
      'from_status', old.account_status, 'to_status', new.account_status
    )
  );
  return new;
end;
$$;

create trigger profiles_audit_role_status
  after update on public.profiles
  for each row execute function public.audit_profiles_role_status();

-- ============================================================
-- 5. Grant hardening — applied proactively this time, per the Migration
--    4 lesson (Supabase's schema-level default privileges grant EXECUTE
--    to `authenticated` on every new function at CREATE FUNCTION time,
--    regardless of statement order). write_audit_event and
--    current_actor_profile_id are NOT trigger-typed — unlike the six
--    trigger functions above (structurally uncallable outside trigger
--    context, verified live below), these are plain functions a client
--    could call directly if left grantable: write_audit_event in
--    particular would let any authenticated user insert a forged
--    audit_events row with an arbitrary action/summary/metadata. Verified
--    live after applying (see the final report) rather than assumed.
-- ============================================================

revoke execute on function public.write_audit_event(text, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.current_actor_profile_id() from public, anon, authenticated;
revoke execute on function public.audit_centre_status() from public, anon, authenticated;
revoke execute on function public.audit_bookings() from public, anon, authenticated;
revoke execute on function public.audit_procurement_records() from public, anon, authenticated;
revoke execute on function public.audit_payment_records() from public, anon, authenticated;
revoke execute on function public.audit_centre_assignments() from public, anon, authenticated;
revoke execute on function public.audit_profiles_role_status() from public, anon, authenticated;
