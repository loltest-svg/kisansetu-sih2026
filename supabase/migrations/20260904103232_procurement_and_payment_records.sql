-- Phase 3B — Migration 3: procurement_records + payment_records
--
-- ============================================================
-- Scope determination (docs/DATABASE.md §18) — stated before any SQL,
-- per instruction
-- ============================================================
-- After Migration 2 (rows 5, 7), two rows have every dependency
-- satisfied and are independent of each other:
--   - row 8  centre_live_state          | Depends on: 7
--   - row 9  procurement_records,
--            payment_records            | Depends on: 7
--
-- This migration implements ROW 9 ONLY. Row 8 (centre_live_state) is
-- explicitly deferred, not silently skipped — see "Row 8 deferred, not
-- skipped" below for the specific reasons.
--
-- Row 9 dependencies: bookings (Migration 2, row 7) — satisfied. Both new
-- tables are 1:1 with `bookings` via `booking_id`.
--
-- Deliberately NOT built here:
--   - centre_live_state (row 8) — see below
--   - audit_events (row 10, depends on row 9 among others — now unblocked
--     for a future migration, but not pulled forward here)
--   - views (row 11), RPC functions (row 12), realtime (row 13), the
--     expiry sweep (row 14), seed data (row 15)
--
-- ============================================================
-- Row 8 (centre_live_state) deferred, not skipped
-- ============================================================
-- centre_live_state's dependency (bookings, row 7) is satisfied — it is
-- not blocked by missing schema. It is deferred because docs/DATABASE.md
-- §12.1 specifies its *columns* and their one-line intent, but not the
-- exact SQL semantics several of them need, and those semantics are
-- product/architecture decisions this migration must not invent
-- (STOP condition: "an operation requires an architectural decision not
-- already approved"). Specifically, unresolved before that table can be
-- correctly trigger-maintained:
--
--   1. `served_count` — "bookings that have left the waiting set today."
--      Does NO_SHOW count (they may never have been CHECKED_IN at all,
--      so may never have entered the waiting set), or only COMPLETED?
--   2. `now_serving_token` — a single token, but docs/DATABASE.md §7.8
--      locks that a centre may have SEVERAL bookings IN_PROGRESS at once
--      (several operators, each with their own farmer). "The same
--      information a physical token display shows" doesn't say which
--      token wins when more than one is concurrently being served —
--      most-recently-called, or something else.
--   3. `farmers_remaining` / `quantity_remaining_quintal` — whether a
--      NO_SHOW booking still counts against the day's committed capacity
--      (the slot was reserved and unused) or frees it back up (the
--      farmer isn't coming, same as CANCELLED/EXPIRED). §4.3's
--      `quantity_committed_quintal = sum(...) over active bookings`
--      reuses the word "active", but §7.6 already gives "active" a
--      precise, different meaning (the farmer-invariant status set,
--      which excludes COMPLETED) — applying that definition here would
--      make a centre's capacity un-consumed by farmers it already
--      finished processing, which contradicts §4.3's own description of
--      `daily_farmer_capacity` as "how many farmer appointments/
--      processing events the centre can handle that day." The two uses
--      of "active" are not the same set, and the document does not say
--      so explicitly.
--   4. Fan-out scope when `centre_status` changes: `centre_status` is not
--      date-scoped (one row per centre), but `centre_live_state` is
--      per `(centre_id, service_date)`. Recomputing "today only", "every
--      date with an existing live_state row", or something else is not
--      specified.
--
-- Getting any of these wrong ships incorrect farmer/operator-facing
-- numbers silently — a different kind of risk than the conservative,
-- either-way-safe judgment calls made in Migrations 1-2 (e.g. self-update
-- scope, the RLS-2 write-policy resolution), which were narrow and safe
-- regardless of which reading was intended. These are not. Recorded here
-- for explicit confirmation before Migration 4 (or a revised Migration 3)
-- builds centre_live_state.
--
-- ============================================================
-- RPC-only write surface (continuing the Migration 2 pattern)
-- ============================================================
-- docs/SECURITY.md §RLS-2 explicitly names both "quality/weighment/
-- procurement recording" and "payment status change" in its "never
-- direct client table writes, regardless of policy" list. No ambiguity
-- to resolve here (unlike centre_status/bookings in Migration 2) — every
-- role's matrix cell for both tables already omits a "(via RPC)" tag
-- consistently, and RLS-2 settles it explicitly. Both tables therefore
-- ship with SELECT-only policies, matching the per-table matrix read
-- scope, and zero INSERT/UPDATE/DELETE policies for any role — inert
-- until rpc_record_quality / rpc_record_weighment /
-- rpc_complete_procurement / a payment-status RPC exist (§18 row 12).

-- ============================================================
-- 1. Enums
-- ============================================================

create type public.quality_result as enum (
  'ACCEPTED',
  'ACCEPTED_WITH_DEDUCTION',
  'REJECTED'
);

create type public.payment_status as enum (
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED'
);

-- ============================================================
-- 2. procurement_records (docs/DATABASE.md §8.1)
-- ============================================================

create table public.procurement_records (
  booking_id uuid primary key references public.bookings (id),
  quality_result public.quality_result,
  quality_note text,
  quality_checked_at timestamptz,
  quality_checked_by uuid references public.profiles (id),
  gross_weight_quintal numeric,
  accepted_quantity_quintal numeric,
  weighed_at timestamptz,
  weighed_by uuid references public.profiles (id),
  procured_at timestamptz,
  procured_by uuid references public.profiles (id),
  check (
    accepted_quantity_quintal is null
    or gross_weight_quintal is null
    or accepted_quantity_quintal <= gross_weight_quintal
  )
);

alter table public.procurement_records enable row level security;

-- Farmer: R own, via own booking. Operator/Centre Admin: R own centre,
-- via own booking's centre. Master Admin: R all. No write policy — RPC
-- only (see above).
create policy procurement_records_select on public.procurement_records
for select to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.id = procurement_records.booking_id
      and b.farmer_id = auth.uid()
  )
  or exists (
    select 1 from public.bookings b
    where b.id = procurement_records.booking_id
      and auth_role() in ('OPERATOR', 'CENTRE_ADMIN')
      and b.centre_id = any (auth_centre_ids())
  )
  or auth_is_master_admin()
);

-- ============================================================
-- 3. payment_records (docs/DATABASE.md §10.1)
-- ============================================================

create table public.payment_records (
  booking_id uuid primary key references public.bookings (id),
  status public.payment_status not null default 'PENDING',
  status_updated_at timestamptz not null default now(),
  status_updated_by uuid references public.profiles (id),
  failure_note text
);

-- Transition guard (docs/DATABASE.md §10.1, docs/SECURITY.md C-6): PAID
-- is terminal except a MASTER_ADMIN correction to FAILED; regressions
-- such as PAID -> PENDING are rejected outright. Inert until a write path
-- exists (no INSERT/UPDATE policy below), shipped now so the rule exists
-- the moment one does.
create function public.enforce_payment_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'PAID' and new.status is distinct from 'PAID' then
    if new.status = 'FAILED' and public.auth_is_master_admin() then
      return new;
    end if;
    raise exception 'payment status PAID is terminal except a MASTER_ADMIN correction to FAILED';
  end if;
  return new;
end;
$$;

create trigger payment_records_enforce_transition
  before update on public.payment_records
  for each row execute function public.enforce_payment_status_transition();

alter table public.payment_records enable row level security;

-- Farmer: R own, via own booking. Operator/Centre Admin: R own centre.
-- Master Admin: R all. No write policy — RPC only (see above; also
-- OQ-3's standing assumption that a human, not this migration, decides
-- who sets payment status once that RPC is designed).
create policy payment_records_select on public.payment_records
for select to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.id = payment_records.booking_id
      and b.farmer_id = auth.uid()
  )
  or exists (
    select 1 from public.bookings b
    where b.id = payment_records.booking_id
      and auth_role() in ('OPERATOR', 'CENTRE_ADMIN')
      and b.centre_id = any (auth_centre_ids())
  )
  or auth_is_master_admin()
);
