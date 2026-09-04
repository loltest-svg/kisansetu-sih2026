-- Phase 3B — Migration 9 follow-up 2: fix a real arithmetic defect found
-- during Migration 9's own required row-testing step.
--
-- v_centre_availability.estimated_delay_minutes used
-- `ceil(farmers_waiting::numeric / processing_rate_per_hour * 60)`.
-- PostgreSQL's `numeric` division does not carry infinite precision — it
-- truncates to a fixed internal scale — so an evenly-divisible case like
-- 1 farmer waiting / 6 per hour * 60 minutes (exactly 10) can compute as
-- `10.00000000000000000020`, and `ceil()` on that tiny positive
-- remainder rounds up to 11. Verified live before this fix (a real
-- fixture produced 11 where 10 was the correct answer) and confirmed the
-- exact mechanism with a standalone `select ceil(1::numeric/6*60)` probe.
--
-- Fixed by rounding to 4 decimal places before ceiling, which absorbs
-- the precision noise on exact-division cases while leaving genuinely
-- fractional cases (e.g. 1/7*60 = 8.571... -> 9) unchanged — verified
-- live for both before writing this migration.
--
-- CREATE OR REPLACE VIEW is used because the column name, position and
-- type are unchanged (int) — only the expression producing it — which
-- PostgreSQL permits without dropping the view (grants and dependents
-- untouched). No other column, join, or filter changed from Migration 9.

create or replace view public.v_centre_availability as
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

  cod.daily_quantity_capacity_quintal,
  coalesce(bc.quantity_committed_quintal, 0) as quantity_committed_quintal,
  coalesce(pc_r.quantity_procured_quintal, 0) as quantity_procured_quintal,
  cod.daily_quantity_capacity_quintal - coalesce(bc.quantity_committed_quintal, 0) as quantity_remaining_quintal,
  case
    when cod.daily_quantity_capacity_quintal > 0
      then round(coalesce(bc.quantity_committed_quintal, 0) / cod.daily_quantity_capacity_quintal * 100, 1)
    else 0
  end as quantity_utilisation_pct,

  cod.processing_rate_per_hour,
  case
    when cod.processing_rate_per_hour > 0
      then ceil(round(coalesce(bc.farmers_waiting, 0)::numeric / cod.processing_rate_per_hour * 60, 4))::int
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
