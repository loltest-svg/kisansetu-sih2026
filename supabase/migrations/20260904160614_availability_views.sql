-- Phase 3B — Migration 9: v_centre_availability, v_centre_daily_summary
--
-- Scope: docs/DATABASE.md §18 row 11 only. No RPC, no table, no policy,
-- no trigger, no function, no realtime, no seed data, no application
-- code. Read-only views over already-existing, already-verified tables.
--
-- Locked per this turn's explicit decision: v_centre_daily_summary ships
-- with avg_wait and peak_concurrent_waiting only. `uptime` has no
-- documented formula anywhere (§5.2 only says "needs
-- centre_status_events", not what counts as downtime or what the
-- baseline window is) and §5.2 itself recommends deferring this view
-- until the Daily Summary feature is actually wired up — omitted here
-- rather than guessed, to be added in a later migration once defined.
--
-- ============================================================
-- Critical design point: these views deliberately run with the OWNING
-- role's privileges, not the querying role's (i.e. security_invoker is
-- NOT set — PostgreSQL 15+ defaults every view to security_invoker =
-- false unless a session-level GUC overrides it, which nothing in this
-- project does, so this is the ordinary default, not an opt-in
-- weakening).
--
-- This is required, not incidental. Both views must aggregate across
-- ALL bookings/procurement_records at a centre — a farmer comparing
-- centres, or an admin viewing system-wide capacity, needs the true
-- centre-wide count. If these views ran with the querying user's own
-- RLS applied (security_invoker = true), a farmer's own `bookings` RLS
-- policy (own rows only) would filter every other farmer's row out
-- *before* the aggregate functions ever saw them, silently returning a
-- wrong, under-counted answer for farmers_booked/quantity_committed/etc
-- — the exact "RLS filters rows before the aggregate sees them" trap
-- docs/DATABASE.md §7.3 already documents for window functions, applying
-- identically to COUNT/SUM here. This is the same reasoning that already
-- justifies `recompute_centre_live_state` and the scope helpers being
-- SECURITY DEFINER, applied to a view instead of a function since a view
-- has no SECURITY DEFINER concept of its own.
--
-- This is safe, not a weakening, because both views' entire column list
-- is centre+date-level aggregates only — capacities, counts,
-- percentages, a derived status, a delay reason — with **no** booking
-- id, no farmer id, no name, no phone, no per-farmer breakdown anywhere.
-- This is the identical "no personal data, safe for any authenticated
-- user" analysis already applied and verified for `centre_live_state`
-- (docs/SECURITY.md §7, S-13). Access is still restricted to
-- `authenticated` only (not `anon`) via an explicit GRANT below —
-- verified live, since PostgREST/Supabase's default schema privileges
-- would otherwise expose new relations more broadly than intended
-- (the same lesson learned the hard way for functions in Migrations
-- 1/4/5, applied here proactively for views instead).
--
-- Neither view has an INSTEAD OF trigger, and both use joins/aggregates/
-- window functions that make them structurally non-simple, so Postgres
-- does not treat either as automatically updatable — there is no
-- INSERT/UPDATE/DELETE path through either view, verified live below.

-- ============================================================
-- v_centre_availability (docs/DATABASE.md §13, §4.3, §6.1)
-- ============================================================
-- Driven from centre_operating_days: a (centre, date) pair with no
-- operating-day row simply has no row here (nothing to aggregate against
-- — the same "no operating day -> treated as CLOSED" fact is what every
-- RPC/trigger already encodes inline; a view cannot materialise every
-- possible future date, so it reports on the dates a centre has actually
-- been configured for, exactly as every other object in this schema
-- does).

create view public.v_centre_availability as
with today as (
  select ((now() at time zone 'Asia/Kolkata')::date) as d
),
booking_counts as (
  select
    centre_id,
    service_date,
    count(*) filter (where status not in ('CANCELLED', 'NO_SHOW', 'EXPIRED')) as farmers_booked,
    count(*) filter (where status = 'COMPLETED') as farmers_processed,
    count(*) filter (where status = 'CHECKED_IN') as farmers_waiting,
    sum(expected_quantity_quintal) filter (where status not in ('CANCELLED', 'NO_SHOW', 'EXPIRED')) as quantity_committed_quintal
  from public.bookings
  group by centre_id, service_date
),
procured as (
  select bk.centre_id, bk.service_date, sum(pr.accepted_quantity_quintal) as quantity_procured_quintal
  from public.procurement_records pr
  join public.bookings bk on bk.id = pr.booking_id
  group by bk.centre_id, bk.service_date
)
select
  cod.centre_id,
  cod.service_date,

  -- farmer dimension (docs/DATABASE.md §4.3)
  cod.daily_farmer_capacity,
  coalesce(bc.farmers_booked, 0) as farmers_booked,
  coalesce(bc.farmers_processed, 0) as farmers_processed,
  coalesce(bc.farmers_waiting, 0) as farmers_waiting,
  cod.daily_farmer_capacity - coalesce(bc.farmers_booked, 0) as farmers_remaining,
  case
    when cod.daily_farmer_capacity > 0
      then round(coalesce(bc.farmers_booked, 0)::numeric / cod.daily_farmer_capacity * 100, 1)
    else 0
  end as farmer_utilisation_pct,

  -- quantity dimension (docs/DATABASE.md §4.3)
  cod.daily_quantity_capacity_quintal,
  coalesce(bc.quantity_committed_quintal, 0) as quantity_committed_quintal,
  coalesce(pc_r.quantity_procured_quintal, 0) as quantity_procured_quintal,
  cod.daily_quantity_capacity_quintal - coalesce(bc.quantity_committed_quintal, 0) as quantity_remaining_quintal,
  case
    when cod.daily_quantity_capacity_quintal > 0
      then round(coalesce(bc.quantity_committed_quintal, 0) / cod.daily_quantity_capacity_quintal * 100, 1)
    else 0
  end as quantity_utilisation_pct,

  -- shared
  cod.processing_rate_per_hour,
  case
    when cod.processing_rate_per_hour > 0
      then ceil(coalesce(bc.farmers_waiting, 0)::numeric / cod.processing_rate_per_hour * 60)::int
    else null
  end as estimated_delay_minutes,
  (case
    when not pc.is_active then 'CLOSED'
    when cod.service_date = today.d and cs.status = 'CLOSED' then 'CLOSED'
    when cod.service_date = today.d and cs.status = 'PAUSED' then 'PAUSED'
    when (cod.daily_farmer_capacity - coalesce(bc.farmers_booked, 0)) <= 0 then 'FULL'
    when cod.service_date = today.d and cs.status = 'DELAYED' then 'DELAYED'
    else 'OPEN'
  end)::public.centre_effective_status as effective_status,
  case when cod.service_date = today.d then cs.delay_reason else null end as delay_reason

from public.centre_operating_days cod
cross join today
join public.procurement_centres pc on pc.id = cod.centre_id
left join public.centre_status cs on cs.centre_id = cod.centre_id
left join booking_counts bc on bc.centre_id = cod.centre_id and bc.service_date = cod.service_date
left join procured pc_r on pc_r.centre_id = cod.centre_id and pc_r.service_date = cod.service_date;

revoke all on public.v_centre_availability from public, anon;
grant select on public.v_centre_availability to authenticated;

-- ============================================================
-- v_centre_daily_summary (docs/DATABASE.md §5.2, §13) — partial,
-- per the locked decision above: avg_wait and peak_concurrent_waiting
-- only, uptime deferred.
-- ============================================================
-- peak_concurrent_waiting: reconstructs a timeline from each booking's
-- checked_in_at (+1) to called_at (-1) — the same CHECKED_IN "waiting"
-- window already established for centre_live_state.waiting_count
-- (Migration 4) and v_centre_availability.farmers_waiting above — and
-- takes the maximum concurrently-open count. Not an explicit §13
-- formula (only avg_wait has one verbatim); this is the most direct,
-- internally-consistent reading of "peak concurrent waiting" available,
-- flagged as an interpretation in the final report.

create view public.v_centre_daily_summary as
with wait_events as (
  select centre_id, service_date, checked_in_at as t, 1 as delta
  from public.bookings
  where checked_in_at is not null
  union all
  select centre_id, service_date, called_at as t, -1 as delta
  from public.bookings
  where called_at is not null
),
running as (
  select
    centre_id,
    service_date,
    sum(delta) over (partition by centre_id, service_date order by t, delta desc) as concurrent_count
  from wait_events
),
peaks as (
  select centre_id, service_date, max(concurrent_count) as peak_concurrent_waiting
  from running
  group by centre_id, service_date
),
waits as (
  select centre_id, service_date, avg(called_at - checked_in_at) as avg_wait
  from public.bookings
  where called_at is not null and checked_in_at is not null
  group by centre_id, service_date
)
select
  coalesce(w.centre_id, p.centre_id) as centre_id,
  coalesce(w.service_date, p.service_date) as service_date,
  w.avg_wait,
  p.peak_concurrent_waiting
from waits w
full join peaks p on p.centre_id = w.centre_id and p.service_date = w.service_date;

revoke all on public.v_centre_daily_summary from public, anon;
grant select on public.v_centre_daily_summary to authenticated;
