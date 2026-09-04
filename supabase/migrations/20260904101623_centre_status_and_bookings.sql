-- Phase 3B — Migration 2: centre operations foundation + transaction spine
--
-- Scope (per docs/DATABASE.md §18): row 5 (centre_status +
-- centre_status_events + trigger) and row 7 (bookings + constraints +
-- indexes) only. Both have every dependency already satisfied by
-- Migration 1 (rows 1-4, 6) and are independent of each other (row 7
-- depends on "4-6", not on row 5).
--
-- Deliberately NOT built here, because it belongs to a later migration
-- and this migration must not pull it forward:
--   - centre_live_state (row 8, depends on row 7 existing first)
--   - procurement_records / payment_records (row 9)
--   - audit_events (row 10)
--   - views (row 11)
--   - RPC functions (row 12) — this is the load-bearing exclusion, see
--     "RPC-only write surface" below
--   - realtime publication membership (row 13) — neither centre_status
--     nor bookings is added to any publication in this migration
--   - the expiry sweep (row 14) — its own "Depends on" column in §18
--     lists row 12 (RPC functions), so it cannot exist before the RPC
--     layer does; see the note on the active-booking invariant below
--   - seed data (row 15)
--
-- ============================================================
-- Documented contradiction found and resolved conservatively
-- ============================================================
-- docs/SECURITY.md §3's per-table matrix shows, for `centre_status`:
--   "Operator | R own centre, W via RPC"
--   "Centre Admin | R/W own centre"                 <- no "(via RPC)" tag
-- and for `bookings`:
--   "Operator | R/W own centre (via RPC)"
--   "Centre Admin | R/W own centre"                 <- no "(via RPC)" tag
-- Read in isolation, the missing "(via RPC)" qualifier on the Centre
-- Admin cells could be taken to mean Centre Admin gets a direct client
-- write path that Operator does not. But docs/SECURITY.md §RLS-2 states,
-- with no role carve-out: "the following are never direct client table
-- writes, regardless of policy: booking creation, check-in, call-next,
-- quality/weighment/procurement recording, centre status change, payment
-- status change." That is unambiguous and more specific, and matches
-- this migration's own instruction to "avoid direct client writes where
-- the design requires RPC-only mutation." Resolution: neither table gets
-- ANY insert/update/delete policy for ANY role in this migration — reads
-- only, for everyone, until the corresponding RPCs
-- (rpc_set_centre_status, rpc_create_booking, rpc_check_in,
-- rpc_call_next_farmer, ...) ship in a later migration. This is strictly
-- the safer reading regardless of which interpretation of the matrix
-- cell was intended, and it is the same "documented dependency, not a
-- workaround" pattern already used for profiles.role/account_status in
-- Migration 1.
--
-- ============================================================
-- Active-booking invariant vs. the expiry sweep — not a conflict
-- ============================================================
-- Phase 3A.1 locks "the one-active-booking index and the EXPIRED sweep
-- ship together" (docs/PROJECT_STATE.md, C-9). §18 places the sweep
-- (row 14) after the RPC layer (row 12), which is after this migration.
-- This migration ships the invariant as a bare schema object (the
-- partial unique index below) with zero client write access to
-- `bookings` at all (see above) — so nobody, via any path this migration
-- opens, can create a booking yet, and therefore nobody can be locked out
-- by it either. The coupling this migration must honour is narrower than
-- "the table and the sweep ship together": it is "the RPC that lets
-- someone actually become active (`rpc_create_booking`) and the RPC that
-- gets them out again (`rpc_expire_stale_bookings`) ship in the same
-- migration" — both are row-12/14 objects, neither built here. Building
-- the index now (idempotency column included) is what "from the
-- beginning" in the Migration 2 brief calls for; it is inert, not
-- premature, until the RPC layer exists.
--
-- ============================================================
-- Anon-execute hardening finding from the Migration 1 reconciliation
-- ============================================================
-- Carried forward and remediated here (see docs/PROJECT_STATE.md Known
-- Issues): Migration 1 did not fully close `anon`'s EXECUTE on the three
-- SECURITY DEFINER scope helpers, because Supabase's schema-level default
-- privileges grant `anon` EXECUTE at CREATE FUNCTION time, before
-- Migration 1's own revoke/grant statements ran. This migration adds the
-- missing `revoke ... from anon` as a new, additive statement — it does
-- not edit, rerun, or alter Migration 1's file or history, and does not
-- change behaviour (already verified live that `anon` calling these
-- functions returns null/false/empty, since auth.uid() is null for an
-- unauthenticated caller). Closing the grant anyway matches the
-- documented "minimal surface" principle.

revoke execute on function public.auth_role() from anon;
revoke execute on function public.auth_is_master_admin() from anon;
revoke execute on function public.auth_centre_ids() from anon;

-- ============================================================
-- 1. Enums
-- ============================================================

create type public.centre_operational_status as enum (
  'OPEN',
  'DELAYED',
  'PAUSED',
  'CLOSED'
);

create type public.booking_status as enum (
  'CONFIRMED',
  'CHECKED_IN',
  'CALLED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED'
);

-- ============================================================
-- 2. centre_status, centre_status_events (docs/DATABASE.md §5)
-- ============================================================

create table public.centre_status (
  centre_id uuid primary key references public.procurement_centres (id),
  status public.centre_operational_status not null,
  delay_reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles (id),
  check (status <> 'DELAYED' or delay_reason is not null)
);

create table public.centre_status_events (
  id bigint generated always as identity primary key,
  centre_id uuid not null references public.procurement_centres (id),
  from_status public.centre_operational_status,
  to_status public.centre_operational_status not null,
  reason text,
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now()
);

create index centre_status_events_centre_changed_idx
  on public.centre_status_events (centre_id, changed_at desc);

-- Append-only history, written by trigger only (docs/DATABASE.md §5.2:
-- "Written by trigger on centre_status"). SECURITY DEFINER + pinned
-- search_path so the insert succeeds regardless of the firing role's own
-- grants on centre_status_events (which has no client write policy —
-- see §3 below), matching the handle_new_user pattern from Migration 1.
create function public.record_centre_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.centre_status_events
    (centre_id, from_status, to_status, reason, changed_by)
  values (
    new.centre_id,
    case when TG_OP = 'UPDATE' then old.status else null end,
    new.status,
    new.delay_reason,
    new.updated_by
  );
  return new;
end;
$$;

create trigger centre_status_record_event
  after insert or update on public.centre_status
  for each row execute function public.record_centre_status_event();

-- ---------- RLS: centre_status ----------
-- docs/SECURITY.md §3: Farmer R, Operator R own centre, Centre Admin R
-- own centre, Master Admin R all. No column/table restriction is
-- documented for Farmer read here (unlike procurement_centres' "active
-- only"), so it is not invented. No write policy for any role — see the
-- contradiction note above; centre status change is RPC-only.

alter table public.centre_status enable row level security;

-- Farmer's unrestricted "R" is the widest cell in the matrix for this
-- table, so it subsumes Operator/Centre Admin/Master Admin's narrower
-- cells; written as a plain `true` rather than as dead-code branches.
create policy centre_status_select on public.centre_status
for select to authenticated
using (true);

-- ---------- RLS: centre_status_events ----------
-- docs/SECURITY.md §3: Farmer —, Operator R own centre, Centre Admin R
-- own centre, Master Admin R all. No write policy — system/trigger-only.

alter table public.centre_status_events enable row level security;

create policy centre_status_events_select on public.centre_status_events
for select to authenticated
using (
  (auth_role() in ('OPERATOR', 'CENTRE_ADMIN') and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

-- ============================================================
-- 3. bookings (docs/DATABASE.md §7.2) — the transaction spine
-- ============================================================
-- INSERT/UPDATE/DELETE are intentionally not granted to any role by any
-- policy in this migration (see the contradiction note above): booking
-- creation, check-in, call-next and every other status transition are
-- RPC-only per docs/SECURITY.md §RLS-2, and no RPC exists yet. Read
-- access follows docs/SECURITY.md §3's matrix exactly.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.procurement_centres (id),
  slot_id uuid not null references public.slots (id),
  service_date date not null,
  farmer_id uuid not null references public.profiles (id),
  farmer_name_snapshot text not null,
  farmer_phone_snapshot text not null,
  commodity_id uuid not null references public.commodities (id),
  expected_quantity_quintal numeric not null check (expected_quantity_quintal > 0),
  token text not null,
  status public.booking_status not null,
  queue_sequence int,
  request_id uuid not null unique,
  processing_operator_id uuid references public.profiles (id),
  checked_in_at timestamptz,
  called_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  recommendation_reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (centre_id, service_date, token)
);

-- One active booking per farmer, globally (docs/DATABASE.md §7.6,
-- docs/BUSINESS_LOGIC.md "One active booking per farmer" — locked,
-- Phase 3A.1). Present from this migration onward, per instruction, even
-- though nothing can insert a booking yet (no write policy exists) —
-- inert until the RPC layer ships, not premature.
create unique index bookings_one_active_per_farmer
  on public.bookings (farmer_id)
  where status in ('CONFIRMED', 'CHECKED_IN', 'CALLED', 'IN_PROGRESS');

-- Several operators may each have one farmer IN_PROGRESS at once per
-- centre; no operator may have two (docs/DATABASE.md §7.8).
create unique index bookings_one_in_progress_per_operator
  on public.bookings (centre_id, service_date, processing_operator_id)
  where status = 'IN_PROGRESS';

create index bookings_centre_date_status_idx
  on public.bookings (centre_id, service_date, status);

create index bookings_centre_date_status_checkedin_idx
  on public.bookings (centre_id, service_date, status, checked_in_at);

create index bookings_farmer_created_idx
  on public.bookings (farmer_id, created_at desc);

create index bookings_slot_idx
  on public.bookings (slot_id);

-- service_date is denormalised from the slot; trigger-enforced to match
-- (docs/DATABASE.md §7.2). SECURITY DEFINER so the check runs
-- consistently regardless of the firing role's own read access to slots.
create function public.enforce_booking_service_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_date date;
begin
  select service_date into v_service_date
  from public.slots
  where id = new.slot_id;

  if v_service_date is null then
    raise exception 'slot % does not exist', new.slot_id;
  end if;

  if new.service_date is distinct from v_service_date then
    raise exception 'bookings.service_date must match the slot''s service_date';
  end if;

  return new;
end;
$$;

create trigger bookings_enforce_service_date
  before insert or update of slot_id, service_date on public.bookings
  for each row execute function public.enforce_booking_service_date();

-- Status/timestamp coherence (docs/DATABASE.md §7.2: "Status/timestamp
-- coherence enforced by trigger (e.g. CHECKED_IN requires checked_in_at;
-- COMPLETED requires completed_at)").
create function public.enforce_booking_status_coherence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'CHECKED_IN' and new.checked_in_at is null then
    raise exception 'status CHECKED_IN requires checked_in_at to be set';
  end if;
  if new.status = 'CALLED' and new.called_at is null then
    raise exception 'status CALLED requires called_at to be set';
  end if;
  if new.status = 'IN_PROGRESS' and new.processing_started_at is null then
    raise exception 'status IN_PROGRESS requires processing_started_at to be set';
  end if;
  if new.status = 'COMPLETED' and new.completed_at is null then
    raise exception 'status COMPLETED requires completed_at to be set';
  end if;
  if new.status = 'CANCELLED' and new.cancelled_at is null then
    raise exception 'status CANCELLED requires cancelled_at to be set';
  end if;
  return new;
end;
$$;

create trigger bookings_enforce_status_coherence
  before insert or update on public.bookings
  for each row execute function public.enforce_booking_status_coherence();

-- ---------- RLS: bookings ----------
-- Farmer: R own. Operator/Centre Admin: R own centre. Master Admin: R
-- all. No write policy for anyone — see the contradiction note above.

alter table public.bookings enable row level security;

create policy bookings_select on public.bookings
for select to authenticated
using (
  farmer_id = auth.uid()
  or (auth_role() in ('OPERATOR', 'CENTRE_ADMIN') and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);
