-- Phase 3B — Migration 12: seed/demo data (§18 row 15)
--
-- Scope, per your explicit decisions on the three questions raised
-- before writing this file (none of docs/DATABASE.md, SECURITY.md,
-- ARCHITECTURE.md, BUSINESS_LOGIC.md, or PROJECT_STATE.md specify
-- concrete seed values — only §18 row 15's category list: "centres,
-- commodities, slots, demo accounts"):
--
--   1. Commodities: Wheat (the one commodity actually named as an
--      example in docs/DATABASE.md §4.2 — "code (WHT), name (Wheat)")
--      plus Mustard/Gram/Barley, exactly as already named in
--      lib/demo/farmerDashboard.ts's `demoCropOptions` (excluding
--      "Other", which is a UI catch-all, not a crop). Codes/token
--      prefixes for the three not given anywhere are mechanically
--      derived from each name's first three letters, the same
--      convention Wheat/WHT already establishes.
--   2. Centres: the exact 6 centres already named in
--      lib/demo/adminDashboard.ts's `demoCentres` (name, district/state
--      from its `location` field, assigned Centre Admin name). Codes
--      follow docs/DATABASE.md §4.1's own illustrated format ("e.g.
--      JPR-01") applied to each centre's own initials (already XYZ/ABC/
--      etc.) — not a new identity, a direct application of a documented
--      format to an already-existing name. `opens_at`/`closes_at`
--      (09:00-17:00) and slot/capacity numbers are not sourced from any
--      document (none exist) — chosen as simple, uniform, clearly-seed
--      defaults, not fictional narrative content. The old UI mock's
--      `status: "FULL"` for DEF Procurement Centre is not reproduced
--      literally — FULL is a derived value in this schema (§6), never a
--      storable `centre_status.status`; DEF is seeded `OPEN` like the
--      others, and `FULL` would only ever be correct here once real
--      bookings exhaust its capacity, which is not this migration's job
--      (seed data, not transactional data).
--   3. Demo accounts: one Master Admin, one Centre Admin per seeded
--      centre (using the exact already-named individuals above), one
--      Operator per centre, and three Farmers — all created with
--      `.test`-TLD emails (RFC 2606, guaranteed never to resolve to a
--      real domain) and sequential, obviously-non-real phone numbers.
--      No password/login capability is set up here — Supabase Auth
--      sign-in wiring is explicitly out of scope for this migration
--      ("do not begin UI/application integration"); these are `profiles`
--      identities ready for that later, explicitly separate phase, not
--      yet capable of a real login.
--
-- Does not touch schema, RLS, RPCs, triggers, views, realtime
-- publication, or pg_cron — every object created below is a data row in
-- an already-existing table. OQ-17 untouched.

-- ============================================================
-- 1. Commodities
-- ============================================================

insert into public.commodities (id, code, name, token_prefix, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'WHT', 'Wheat',   'WHT', true),
  ('10000000-0000-0000-0000-000000000002', 'MUS', 'Mustard', 'MUS', true),
  ('10000000-0000-0000-0000-000000000003', 'GRM', 'Gram',    'GRM', true),
  ('10000000-0000-0000-0000-000000000004', 'BAR', 'Barley',  'BAR', true);

-- ============================================================
-- 2. Procurement centres (lib/demo/adminDashboard.ts's demoCentres)
-- ============================================================

insert into public.procurement_centres
  (id, code, name, district, state, is_active, default_processing_rate_per_hour, opens_at, closes_at)
values
  ('20000000-0000-0000-0000-000000000001', 'XYZ-01', 'XYZ Procurement Centre', 'Jaipur',   'Rajasthan', true, 8, '09:00', '17:00'),
  ('20000000-0000-0000-0000-000000000002', 'ABC-01', 'ABC Procurement Centre', 'Kota',     'Rajasthan', true, 6, '09:00', '17:00'),
  ('20000000-0000-0000-0000-000000000003', 'PQR-01', 'PQR Procurement Centre', 'Ajmer',    'Rajasthan', true, 4, '09:00', '17:00'),
  ('20000000-0000-0000-0000-000000000004', 'LMN-01', 'LMN Procurement Centre', 'Udaipur',  'Rajasthan', true, 5, '09:00', '17:00'),
  ('20000000-0000-0000-0000-000000000005', 'DEF-01', 'DEF Procurement Centre', 'Bikaner',  'Rajasthan', true, 5, '09:00', '17:00'),
  ('20000000-0000-0000-0000-000000000006', 'GHI-01', 'GHI Procurement Centre', 'Jodhpur',  'Rajasthan', true, 5, '09:00', '17:00');

-- Every seeded centre accepts every seeded commodity — the simplest,
-- non-exclusionary default; no document specifies a per-centre subset.
insert into public.centre_commodities (centre_id, commodity_id)
select pc.id, c.id
from public.procurement_centres pc
cross join public.commodities c;

-- ============================================================
-- 3. Demo accounts
-- ============================================================
-- Created via auth.users; the existing handle_new_user() trigger
-- (Migration 1) populates each matching `profiles` row automatically
-- from raw_user_meta_data, starting every account at the FARMER default
-- — exactly as designed, never trusting signup metadata for role.

insert into auth.users (id, email, raw_user_meta_data) values
  ('30000000-0000-0000-0000-000000000001', 'demo.master.admin@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Master Admin', 'phone', '9000000001')),

  ('31000000-0000-0000-0000-000000000001', 'demo.centre.admin.xyz@kisansetu.test',
    jsonb_build_object('full_name', 'Priya Sharma (Demo Centre Admin)', 'phone', '9000000011')),
  ('31000000-0000-0000-0000-000000000002', 'demo.centre.admin.abc@kisansetu.test',
    jsonb_build_object('full_name', 'Anil Verma (Demo Centre Admin)', 'phone', '9000000012')),
  ('31000000-0000-0000-0000-000000000003', 'demo.centre.admin.pqr@kisansetu.test',
    jsonb_build_object('full_name', 'Sunita Rathore (Demo Centre Admin)', 'phone', '9000000013')),
  ('31000000-0000-0000-0000-000000000004', 'demo.centre.admin.lmn@kisansetu.test',
    jsonb_build_object('full_name', 'Devendra Singh (Demo Centre Admin)', 'phone', '9000000014')),
  ('31000000-0000-0000-0000-000000000005', 'demo.centre.admin.def@kisansetu.test',
    jsonb_build_object('full_name', 'Manisha Joshi (Demo Centre Admin)', 'phone', '9000000015')),
  ('31000000-0000-0000-0000-000000000006', 'demo.centre.admin.ghi@kisansetu.test',
    jsonb_build_object('full_name', 'Ramesh Choudhary (Demo Centre Admin)', 'phone', '9000000016')),

  ('32000000-0000-0000-0000-000000000001', 'demo.operator.xyz@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Operator (XYZ Procurement Centre)', 'phone', '9000000021')),
  ('32000000-0000-0000-0000-000000000002', 'demo.operator.abc@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Operator (ABC Procurement Centre)', 'phone', '9000000022')),
  ('32000000-0000-0000-0000-000000000003', 'demo.operator.pqr@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Operator (PQR Procurement Centre)', 'phone', '9000000023')),
  ('32000000-0000-0000-0000-000000000004', 'demo.operator.lmn@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Operator (LMN Procurement Centre)', 'phone', '9000000024')),
  ('32000000-0000-0000-0000-000000000005', 'demo.operator.def@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Operator (DEF Procurement Centre)', 'phone', '9000000025')),
  ('32000000-0000-0000-0000-000000000006', 'demo.operator.ghi@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Operator (GHI Procurement Centre)', 'phone', '9000000026')),

  ('33000000-0000-0000-0000-000000000001', 'demo.farmer.one@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Farmer One', 'phone', '9000000031')),
  ('33000000-0000-0000-0000-000000000002', 'demo.farmer.two@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Farmer Two', 'phone', '9000000032')),
  ('33000000-0000-0000-0000-000000000003', 'demo.farmer.three@kisansetu.test',
    jsonb_build_object('full_name', 'Demo Farmer Three', 'phone', '9000000033'));

-- Promote the 13 staff accounts beyond the FARMER default. The
-- self-promotion guard trigger (Migration 1) only permits this when
-- auth_is_master_admin() is true for the caller, which no session has
-- here (raw seeding, no JWT) — temporarily disabled for exactly this
-- statement, the same pattern already used for every role-simulation
-- test fixture throughout Phase 3B, immediately re-enabled after.
alter table public.profiles disable trigger profiles_guard_role_status;

update public.profiles set role = 'MASTER_ADMIN'
where id = '30000000-0000-0000-0000-000000000001';

update public.profiles set role = 'CENTRE_ADMIN'
where id in (
  '31000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000004',
  '31000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000006'
);

update public.profiles set role = 'OPERATOR'
where id in (
  '32000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002',
  '32000000-0000-0000-0000-000000000003', '32000000-0000-0000-0000-000000000004',
  '32000000-0000-0000-0000-000000000005', '32000000-0000-0000-0000-000000000006'
);

alter table public.profiles enable trigger profiles_guard_role_status;

-- ============================================================
-- 4. Centre assignments — each Centre Admin/Operator to their own centre
-- ============================================================

insert into public.centre_assignments (profile_id, centre_id, assigned_by) values
  ('31000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001');

-- ============================================================
-- 5. Centre status — one row per centre, today's operational state
-- ============================================================
-- PQR is seeded DELAYED with a reason (matching the already-existing
-- demoActivity entry in lib/demo/adminDashboard.ts); LMN is seeded
-- PAUSED; every other centre OPEN, including DEF (the old UI mock's
-- "FULL" is not reproduced — FULL is derived, never stored, §6).

insert into public.centre_status (centre_id, status, delay_reason, updated_by) values
  ('20000000-0000-0000-0000-000000000001', 'OPEN', null, '30000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'OPEN', null, '30000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'DELAYED', 'Weighing machine under maintenance', '30000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', 'PAUSED', null, '30000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', 'OPEN', null, '30000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000006', 'CLOSED', null, '30000000-0000-0000-0000-000000000001');

-- ============================================================
-- 6. Centre operating days — today + the next 2 days, every centre
-- ============================================================
-- daily_farmer_capacity is set to exactly today's total slot capacity
-- (8 hourly slots x 5 farmers/slot = 40) for internal consistency —
-- a centre's day capacity should not silently under- or over-state what
-- its own slots can actually hold. daily_quantity_capacity_quintal has
-- no documented source anywhere; 200 is a simple, uniform, clearly-seed
-- default, not sourced from any narrative content.

insert into public.centre_operating_days
  (centre_id, service_date, daily_farmer_capacity, daily_quantity_capacity_quintal, processing_rate_per_hour)
select
  pc.id,
  d::date,
  40,
  200,
  pc.default_processing_rate_per_hour
from public.procurement_centres pc
cross join generate_series(
  (now() at time zone 'Asia/Kolkata')::date,
  (now() at time zone 'Asia/Kolkata')::date + interval '2 days',
  interval '1 day'
) as d;

-- ============================================================
-- 7. Slots — hourly, spanning each centre's own opens_at-closes_at
-- ============================================================

insert into public.slots (centre_id, service_date, start_time, end_time, farmer_capacity)
select
  cod.centre_id,
  cod.service_date,
  t::time as start_time,
  (t + interval '1 hour')::time as end_time,
  5
from public.centre_operating_days cod
join public.procurement_centres pc on pc.id = cod.centre_id
cross join lateral generate_series(
  cod.service_date + pc.opens_at,
  cod.service_date + pc.closes_at - interval '1 hour',
  interval '1 hour'
) as t;
