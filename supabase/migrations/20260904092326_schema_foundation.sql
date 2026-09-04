-- Phase 3B — Migration 1: schema foundation
--
-- Scope (per docs/DATABASE.md §18 steps 1, 3, 4, 6 — identity, reference
-- data, centre assignments, capacity model). Deliberately excludes
-- centre_status/centre_status_events (§5, migration step 5), bookings,
-- centre_live_state, procurement/payment records, audit_events, views,
-- RPCs and realtime publication — all later migrations.
--
-- RLS ships with every table in this same migration (docs/DATABASE.md §18
-- deviation note): no table exists unprotected for a later migration to
-- find.
--
-- Grounded in docs/DATABASE.md §§2-4, 18 and docs/SECURITY.md §§1-3, 6.
--
-- Ordering note: tables are created before the SECURITY DEFINER scope
-- helpers (§3 below) because those helpers' LANGUAGE SQL bodies are
-- validated against real objects at CREATE FUNCTION time — they must
-- reference tables (profiles, centre_assignments) that already exist. RLS
-- is enabled and policies attached only after the helpers exist, so no
-- policy ever references an undefined function; every table is still
-- protected before this migration commits.

-- ============================================================
-- 1. Enums
-- ============================================================
-- Only the two enums needed by tables created in this migration.
-- booking_status / centre_operational_status / payment_status /
-- quality_result / notification_* belong to later migrations, with the
-- tables that use them.

create type public.user_role as enum (
  'MASTER_ADMIN',
  'CENTRE_ADMIN',
  'OPERATOR',
  'FARMER'
);

create type public.account_status as enum (
  'ACTIVE',
  'SUSPENDED'
);

-- ============================================================
-- Shared trigger: maintain updated_at
-- ============================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 2. profiles (docs/DATABASE.md §3.1) — table only, RLS below in §4
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'FARMER',
  full_name text not null,
  phone text,
  village_text text,
  account_status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_phone_idx on public.profiles (phone);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auth.users -> profiles provisioning trigger (docs/DATABASE.md §3.1:
-- "Created by trigger on auth.users insert"). `role` is never taken from
-- client-supplied signup metadata — it always starts at the column
-- default (FARMER). Taking it from raw_user_meta_data would let any
-- signup request self-promote before a single RLS policy even runs.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. commodities, procurement_centres, centre_commodities
--    (docs/DATABASE.md §4.1-4.2) — tables only, RLS below in §4
-- ============================================================

create table public.commodities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  token_prefix text not null,
  is_active boolean not null default true
);

create table public.procurement_centres (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  district text not null,
  state text not null,
  address_text text,
  is_active boolean not null default true,
  default_processing_rate_per_hour int not null,
  opens_at time not null,
  closes_at time not null,
  guidance_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger procurement_centres_set_updated_at
  before update on public.procurement_centres
  for each row execute function public.set_updated_at();

create table public.centre_commodities (
  centre_id uuid not null references public.procurement_centres (id),
  commodity_id uuid not null references public.commodities (id),
  primary key (centre_id, commodity_id)
);

-- ============================================================
-- centre_assignments (docs/DATABASE.md §3.2) — table only, RLS in §4
-- ============================================================

create table public.centre_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  centre_id uuid not null references public.procurement_centres (id),
  assigned_by uuid references public.profiles (id),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id)
);

create unique index centre_assignments_active_unique
  on public.centre_assignments (profile_id, centre_id)
  where revoked_at is null;

create index centre_assignments_profile_active_idx
  on public.centre_assignments (profile_id)
  where revoked_at is null;

create index centre_assignments_centre_active_idx
  on public.centre_assignments (centre_id)
  where revoked_at is null;

-- ============================================================
-- 4. Scope helpers (docs/SECURITY.md §2.1)
-- ============================================================
-- SECURITY DEFINER + STABLE, owned by the migration role (table owner),
-- so they read profiles/centre_assignments without re-triggering those
-- tables' own RLS — the only sanctioned way a policy learns who the
-- caller is. search_path pinned against search-path hijacking.

create function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.auth_is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'MASTER_ADMIN' from public.profiles where id = auth.uid()),
    false
  );
$$;

create function public.auth_centre_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(centre_id), '{}'::uuid[])
  from public.centre_assignments
  where profile_id = auth.uid() and revoked_at is null;
$$;

revoke execute on function public.auth_role() from public;
revoke execute on function public.auth_is_master_admin() from public;
revoke execute on function public.auth_centre_ids() from public;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.auth_is_master_admin() to authenticated;
grant execute on function public.auth_centre_ids() to authenticated;

-- ============================================================
-- 5. RLS — profiles (docs/SECURITY.md §3, RLS-1)
-- ============================================================

alter table public.profiles enable row level security;

-- RLS-1 (docs/SECURITY.md §3): role/account_status cannot be protected by
-- row-level policy alone, because a USING(id = auth.uid()) policy would
-- otherwise let a user overwrite every column of their own row, including
-- role. Three layers, all required:
--
--   Layer 1 — column-level grants: only full_name/phone/village_text are
--   grantable to `authenticated` at all. This currently blocks EVERY
--   client-side UPDATE of role/account_status, including one attempted by
--   a Master Admin — Postgres column grants are per database role
--   (`authenticated`), not per application role, so they cannot
--   distinguish Master Admin from Farmer. Per docs/SECURITY.md §5,
--   account/role administration is a Master-Admin-only *RPC* surface, not
--   a direct table write; that RPC is out of this migration's scope
--   (RPCs are migration-order step 12, docs/DATABASE.md §18). Documented
--   dependency, not a workaround: until that RPC ships, role/account_status
--   is changeable by nobody through the client — the safe state, not an
--   insecure stopgap.
--
--   Layer 2 — WITH CHECK pins row ownership (id) so an UPDATE cannot be
--   used to reassign a row to another user. PostgreSQL RLS does not expose
--   a clean OLD-row reference inside a CHECK clause for a self-referencing
--   table update, so column-value pinning (role/account_status unchanged)
--   is not expressed here — that is Layer 3's job, which has real OLD/NEW
--   access.
--
--   Layer 3 — backstop trigger: rejects any change to role or
--   account_status unless the caller is a Master Admin. Belt-and-braces:
--   even if Layer 1's grant were ever loosened by a future migration, this
--   still blocks the escalation.

revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, village_text) on public.profiles to authenticated;

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or auth_is_master_admin()
  or (
    auth_role() = 'CENTRE_ADMIN'
    and exists (
      select 1
      from public.centre_assignments ca
      where ca.profile_id = profiles.id
        and ca.revoked_at is null
        and ca.centre_id = any (auth_centre_ids())
    )
  )
);

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid() or auth_is_master_admin())
with check (id = auth.uid() or auth_is_master_admin());

-- No INSERT/DELETE policy: rows are created only by the auth.users
-- trigger (runs as its owner, not subject to client RLS) and are never
-- deleted (docs/SECURITY.md §6: suspension over deletion). Default-deny
-- leaves both closed to every client role.

create function public.prevent_privileged_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.account_status is distinct from old.account_status)
     and not public.auth_is_master_admin() then
    raise exception 'role and account_status may only be changed by a MASTER_ADMIN';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_status
  before update on public.profiles
  for each row execute function public.prevent_privileged_self_update();

-- ============================================================
-- 6. RLS — commodities, procurement_centres, centre_commodities
-- ============================================================

alter table public.commodities enable row level security;

create policy commodities_select on public.commodities
for select to authenticated
using (true);

create policy commodities_insert on public.commodities
for insert to authenticated
with check (auth_is_master_admin());

create policy commodities_update on public.commodities
for update to authenticated
using (auth_is_master_admin())
with check (auth_is_master_admin());

create policy commodities_delete on public.commodities
for delete to authenticated
using (auth_is_master_admin());

alter table public.procurement_centres enable row level security;

-- Farmer: R active only. Operator/Centre Admin: R own centre (even if
-- deactivated — they still need to see/manage it). Master Admin: R all.
create policy procurement_centres_select on public.procurement_centres
for select to authenticated
using (
  is_active = true
  or id = any (auth_centre_ids())
  or auth_is_master_admin()
);

create policy procurement_centres_insert on public.procurement_centres
for insert to authenticated
with check (auth_is_master_admin());

create policy procurement_centres_update on public.procurement_centres
for update to authenticated
using (auth_is_master_admin())
with check (auth_is_master_admin());

create policy procurement_centres_delete on public.procurement_centres
for delete to authenticated
using (auth_is_master_admin());

alter table public.centre_commodities enable row level security;

create policy centre_commodities_select on public.centre_commodities
for select to authenticated
using (true);

create policy centre_commodities_insert on public.centre_commodities
for insert to authenticated
with check (auth_is_master_admin());

create policy centre_commodities_update on public.centre_commodities
for update to authenticated
using (auth_is_master_admin())
with check (auth_is_master_admin());

create policy centre_commodities_delete on public.centre_commodities
for delete to authenticated
using (auth_is_master_admin());

-- ============================================================
-- 7. RLS — centre_assignments
-- ============================================================

alter table public.centre_assignments enable row level security;

-- Operator: R own rows only. Centre Admin: R all rows at their own
-- centre(s). Master Admin: R all.
create policy centre_assignments_select on public.centre_assignments
for select to authenticated
using (
  profile_id = auth.uid()
  or (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

-- Write: Master Admin only (docs/SECURITY.md §3 matrix — Operator and
-- Centre Admin have no W here).
create policy centre_assignments_insert on public.centre_assignments
for insert to authenticated
with check (auth_is_master_admin());

create policy centre_assignments_update on public.centre_assignments
for update to authenticated
using (auth_is_master_admin())
with check (auth_is_master_admin());

create policy centre_assignments_delete on public.centre_assignments
for delete to authenticated
using (auth_is_master_admin());

-- ============================================================
-- 8. centre_operating_days, slots (docs/DATABASE.md §4.3-4.4)
-- ============================================================

create table public.centre_operating_days (
  centre_id uuid not null references public.procurement_centres (id),
  service_date date not null,
  daily_farmer_capacity int not null check (daily_farmer_capacity >= 0),
  daily_quantity_capacity_quintal numeric not null
    check (daily_quantity_capacity_quintal >= 0),
  processing_rate_per_hour int not null check (processing_rate_per_hour >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (centre_id, service_date)
);

create trigger centre_operating_days_set_updated_at
  before update on public.centre_operating_days
  for each row execute function public.set_updated_at();

alter table public.centre_operating_days enable row level security;

create policy centre_operating_days_select on public.centre_operating_days
for select to authenticated
using (
  exists (
    select 1 from public.procurement_centres pc
    where pc.id = centre_operating_days.centre_id and pc.is_active
  )
  or centre_id = any (auth_centre_ids())
  or auth_is_master_admin()
);

-- Write: Centre Admin at their own centre, or Master Admin. Operator is
-- read-only here per docs/SECURITY.md §3.
create policy centre_operating_days_insert on public.centre_operating_days
for insert to authenticated
with check (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

create policy centre_operating_days_update on public.centre_operating_days
for update to authenticated
using (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
)
with check (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

create policy centre_operating_days_delete on public.centre_operating_days
for delete to authenticated
using (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.procurement_centres (id),
  service_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  farmer_capacity int not null check (farmer_capacity >= 0),
  unique (centre_id, service_date, start_time)
);

alter table public.slots enable row level security;

create policy slots_select on public.slots
for select to authenticated
using (
  exists (
    select 1 from public.procurement_centres pc
    where pc.id = slots.centre_id and pc.is_active
  )
  or centre_id = any (auth_centre_ids())
  or auth_is_master_admin()
);

create policy slots_insert on public.slots
for insert to authenticated
with check (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

create policy slots_update on public.slots
for update to authenticated
using (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
)
with check (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);

create policy slots_delete on public.slots
for delete to authenticated
using (
  (auth_role() = 'CENTRE_ADMIN' and centre_id = any (auth_centre_ids()))
  or auth_is_master_admin()
);
