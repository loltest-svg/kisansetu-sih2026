-- Phase 3B — Migration 4: centre_live_state
--
-- Scope: docs/DATABASE.md §18 row 8 only — centre_live_state, its
-- maintenance triggers on bookings/centre_status/centre_operating_days,
-- RLS. No RPC layer, no realtime publication (that is §18 row 13,
-- explicitly a later, separate migration — "publish only after policies
-- are proven"), no application changes.
--
-- ============================================================
-- Locked decisions applied (per the Migration 4 brief)
-- ============================================================
-- OQ-16 served_count = count(status = 'COMPLETED') only. CONFIRMED,
--   CHECKED_IN, CALLED, IN_PROGRESS, CANCELLED, NO_SHOW, EXPIRED do not
--   contribute.
-- OQ-18 NO_SHOW does not consume farmer or quantity capacity. Capacity
--   consumption = every booking NOT IN ('CANCELLED','NO_SHOW','EXPIRED')
--   — i.e. CONFIRMED/CHECKED_IN/CALLED/IN_PROGRESS/COMPLETED all still
--   consume the day's capacity (a COMPLETED farmer used their slot; only
--   CANCELLED/NO_SHOW/EXPIRED release it). This is deliberately NOT the
--   same status set as the one-active-booking invariant's "active" set
--   (docs/DATABASE.md §7.6, which excludes COMPLETED) — that set answers
--   "can this farmer book elsewhere", a different question from "has this
--   centre's daily throughput been consumed."
-- OQ-19 centre_status applies to today only. Resolved concretely: the
--   manual status/delay_reason from `centre_status` (CLOSED/PAUSED/
--   DELAYED) is applied only to the centre_live_state row for today
--   (Asia/Kolkata `CURRENT_DATE`, per the already-locked `OQ-10`). Every
--   other service_date's row is computed purely from
--   `procurement_centres.is_active`, the existence of a
--   `centre_operating_days` row for that date, and that date's own
--   capacity/booking facts — never from `centre_status`. This requires no
--   change to the already-applied `centre_status` table (still one row
--   per centre; nothing here alters Migration 2): the date-scoping is
--   entirely a property of how this migration's recompute function reads
--   it, matching the brief's own worked example (today PAUSED, tomorrow
--   OPEN) without needing `centre_status` to become date-scoped itself.
--   This also directly answers the "fan-out scope" question raised as
--   part of the original OQ-19 in Migration 3's report: a `centre_status`
--   change recomputes only today's row; other dates' rows are
--   untouched by it.
-- OQ-14 / EXPIRED: no automatic time-based transition is implemented
--   anywhere in this migration. Nothing here reads wall-clock time
--   against a booking's slot time to change status; the only wall-clock
--   read is "what is today's date" (Asia/Kolkata), used solely to decide
--   which centre_live_state row `centre_status` currently applies to.
--   `served_count`/`farmers_remaining`/etc. are pure aggregates over
--   `bookings.status` as it stands — no inferred lateness, no threshold.
--
-- OQ-17 (now_serving_token) is NOT resolved by the brief or by the
-- design docs — the brief explicitly says to STOP and report rather than
-- invent an ordering when "several bookings IN_PROGRESS at once" makes
-- "the" current token ambiguous (docs/DATABASE.md §7.8 locks that several
-- operators may each have one farmer IN_PROGRESS simultaneously; no text
-- anywhere specifies which one's token "now_serving_token" should carry).
-- Resolution taken here: the column exists (nullable text, matching
-- §12.1's own type), and is always written as NULL by this migration's
-- maintenance logic — never guessed at. This is a schema-complete,
-- semantics-incomplete implementation, not a stand-in value; see the
-- final report's "Unresolved OQ" for the explicit flag. No other column
-- is affected by this — waiting_count, in_progress_count, served_count,
-- farmers_remaining, quantity_remaining_quintal, effective_status,
-- delay_reason, processing_rate_per_hour, version and updated_at are all
-- fully specified and implemented below.
--
-- ============================================================
-- A second contradiction found and resolved: docs/SECURITY.md §3 vs §7
-- ============================================================
-- §3's per-table matrix lists, for `centre_live_state`: Farmer "R (all —
-- aggregate, no PII)", but Operator and Centre Admin "R own centre" —
-- narrower than Farmer's row for the exact same table. §7 states plainly,
-- with the reasoning: "`centre_live_state` is readable by all
-- authenticated users because it contains no personal data... That is
-- what makes this row safe to use as the farmer's live-queue signal" —
-- no role restriction at all. The two disagree within the same document.
-- §7's statement is taken as authoritative: it is more specific to this
-- exact table, states the reasoning (no PII, safe for anyone), and
-- matches how the schema already treats the other broadly-safe reference
-- tables (`commodities`, `procurement_centres` — Migration 1). It is also
-- required by an already-approved farmer flow: `/farmer/bookings/new`
-- and the allocation-input view (§17) need a farmer to compare
-- `effective_status`/remaining capacity ACROSS MULTIPLE centres before
-- picking one — farmers have no "own centre" in this system at all, so a
-- centre-scoped read would silently break that comparison. Implemented:
-- `centre_live_state` is readable by every authenticated user, matching
-- §7 exactly.

-- ============================================================
-- 1. Enum
-- ============================================================

create type public.centre_effective_status as enum (
  'OPEN',
  'DELAYED',
  'PAUSED',
  'CLOSED',
  'FULL'
);

-- ============================================================
-- 2. centre_live_state (docs/DATABASE.md §12.1)
-- ============================================================

create table public.centre_live_state (
  centre_id uuid not null references public.procurement_centres (id),
  service_date date not null,
  waiting_count int not null default 0,
  in_progress_count int not null default 0,
  now_serving_token text,
  served_count int not null default 0,
  farmers_remaining int not null default 0,
  quantity_remaining_quintal numeric not null default 0,
  effective_status public.centre_effective_status not null,
  delay_reason text,
  processing_rate_per_hour int not null default 0,
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (centre_id, service_date)
);

-- Serves "all centres for a given date" reads (/admin, /admin/capacity,
-- §15) which the (centre_id, service_date) PK order does not favour.
create index centre_live_state_service_date_idx
  on public.centre_live_state (service_date);

-- ============================================================
-- 3. Maintenance function — the single place §6.1's precedence and the
--    locked capacity/served-count rules are implemented, per "Cache for
--    display, recompute for decisions" (docs/DATABASE.md §12.1): this
--    function only ever writes the cache. It never gates or authorizes a
--    booking, check-in, or any other write — bookings remains the sole
--    authoritative source for processing state and operator ownership
--    (OQ-17's standing requirement).
-- ============================================================

create function public.recompute_centre_live_state(
  p_centre_id uuid,
  p_service_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_active boolean;
  v_has_operating_day boolean := false;
  v_daily_farmer_capacity int;
  v_daily_quantity_capacity_quintal numeric;
  v_processing_rate_per_hour int;
  v_is_today boolean;
  v_manual_status public.centre_operational_status;
  v_delay_reason text;
  v_waiting_count int;
  v_in_progress_count int;
  v_served_count int;
  v_farmers_booked int;
  v_quantity_committed numeric;
  v_farmers_remaining int;
  v_quantity_remaining numeric;
  v_effective_status public.centre_effective_status;
begin
  select coalesce(is_active, false) into v_is_active
  from public.procurement_centres
  where id = p_centre_id;

  select true, daily_farmer_capacity, daily_quantity_capacity_quintal, processing_rate_per_hour
  into v_has_operating_day, v_daily_farmer_capacity, v_daily_quantity_capacity_quintal, v_processing_rate_per_hour
  from public.centre_operating_days
  where centre_id = p_centre_id and service_date = p_service_date;

  v_has_operating_day := coalesce(v_has_operating_day, false);

  -- OQ-19: centre_status is not date-scoped and applies only to today
  -- (Asia/Kolkata) — see the header note. Never read for any other date.
  v_is_today := p_service_date = ((now() at time zone 'Asia/Kolkata')::date);

  if v_is_today then
    select status, delay_reason into v_manual_status, v_delay_reason
    from public.centre_status
    where centre_id = p_centre_id;
  end if;

  -- OQ-16 served_count: COMPLETED only.
  -- OQ-18 capacity consumption: everything except CANCELLED/NO_SHOW/
  -- EXPIRED (a COMPLETED booking still consumed a slot; those three did
  -- not, or no longer do).
  select
    count(*) filter (where status = 'CHECKED_IN'),
    count(*) filter (where status in ('CALLED', 'IN_PROGRESS')),
    count(*) filter (where status = 'COMPLETED'),
    count(*) filter (where status not in ('CANCELLED', 'NO_SHOW', 'EXPIRED')),
    coalesce(
      sum(expected_quantity_quintal) filter (where status not in ('CANCELLED', 'NO_SHOW', 'EXPIRED')),
      0
    )
  into v_waiting_count, v_in_progress_count, v_served_count, v_farmers_booked, v_quantity_committed
  from public.bookings
  where centre_id = p_centre_id and service_date = p_service_date;

  if v_is_active and v_has_operating_day then
    v_farmers_remaining := v_daily_farmer_capacity - v_farmers_booked;
    v_quantity_remaining := v_daily_quantity_capacity_quintal - v_quantity_committed;
  else
    v_farmers_remaining := 0;
    v_quantity_remaining := 0;
    v_processing_rate_per_hour := 0;
  end if;

  -- docs/DATABASE.md §6.1 precedence: CLOSED > PAUSED > FULL > DELAYED >
  -- OPEN. PAUSED/DELAYED/manual-CLOSED apply only when v_is_today (OQ-19).
  if not v_is_active or not v_has_operating_day or (v_is_today and v_manual_status = 'CLOSED') then
    v_effective_status := 'CLOSED';
  elsif v_is_today and v_manual_status = 'PAUSED' then
    v_effective_status := 'PAUSED';
  elsif v_farmers_remaining <= 0 then
    v_effective_status := 'FULL';
  elsif v_is_today and v_manual_status = 'DELAYED' then
    v_effective_status := 'DELAYED';
  else
    v_effective_status := 'OPEN';
  end if;

  insert into public.centre_live_state (
    centre_id, service_date, waiting_count, in_progress_count, now_serving_token,
    served_count, farmers_remaining, quantity_remaining_quintal, effective_status,
    delay_reason, processing_rate_per_hour, version, updated_at
  )
  values (
    p_centre_id, p_service_date, v_waiting_count, v_in_progress_count, null,
    v_served_count, v_farmers_remaining, v_quantity_remaining, v_effective_status,
    case when v_is_today then v_delay_reason else null end,
    coalesce(v_processing_rate_per_hour, 0), 1, now()
  )
  on conflict (centre_id, service_date) do update set
    waiting_count = excluded.waiting_count,
    in_progress_count = excluded.in_progress_count,
    served_count = excluded.served_count,
    farmers_remaining = excluded.farmers_remaining,
    quantity_remaining_quintal = excluded.quantity_remaining_quintal,
    effective_status = excluded.effective_status,
    delay_reason = excluded.delay_reason,
    processing_rate_per_hour = excluded.processing_rate_per_hour,
    version = public.centre_live_state.version + 1,
    updated_at = now();
end;
$$;

revoke execute on function public.recompute_centre_live_state(uuid, date) from public;
revoke execute on function public.recompute_centre_live_state(uuid, date) from anon;
-- Not granted to `authenticated` either: this function is invoked only by
-- the maintenance triggers below (which run in the firing statement's own
-- context, not requiring a direct grant) — it is not part of the client
-- write surface, and giving `authenticated` direct EXECUTE would let any
-- client recompute another centre's cache row on demand for free, and
-- more importantly would defeat "trigger-maintained": the client would be
-- calling a mutation with no RLS gate of its own.

-- ============================================================
-- 4. Maintenance triggers
-- ============================================================

create function public.bookings_recompute_live_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recompute_centre_live_state(old.centre_id, old.service_date);
    return old;
  end if;

  perform public.recompute_centre_live_state(new.centre_id, new.service_date);

  if TG_OP = 'UPDATE'
     and (old.centre_id, old.service_date) is distinct from (new.centre_id, new.service_date) then
    perform public.recompute_centre_live_state(old.centre_id, old.service_date);
  end if;

  return new;
end;
$$;

create trigger bookings_after_change_recompute_live_state
  after insert or update or delete on public.bookings
  for each row execute function public.bookings_recompute_live_state();

create function public.centre_operating_days_recompute_live_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_centre_live_state(new.centre_id, new.service_date);
  return new;
end;
$$;

create trigger centre_operating_days_after_change_recompute_live_state
  after insert or update on public.centre_operating_days
  for each row execute function public.centre_operating_days_recompute_live_state();

-- centre_status changes recompute only today's row (OQ-19) — never any
-- other date's, per the header note.
create function public.centre_status_recompute_live_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_centre_live_state(
    new.centre_id,
    (now() at time zone 'Asia/Kolkata')::date
  );
  return new;
end;
$$;

create trigger centre_status_after_change_recompute_live_state
  after insert or update on public.centre_status
  for each row execute function public.centre_status_recompute_live_state();

-- ============================================================
-- 5. RLS
-- ============================================================
-- Readable by every authenticated user (§7's resolution of the §3/§7
-- contradiction above); no write policy for any role — this table is
-- maintained exclusively by the SECURITY DEFINER triggers above, which
-- run with the defining role's privileges and so are unaffected by the
-- absence of a client write policy, exactly as `handle_new_user()`
-- populates `profiles` in Migration 1 despite `profiles` having no client
-- INSERT policy.

alter table public.centre_live_state enable row level security;

create policy centre_live_state_select on public.centre_live_state
for select to authenticated
using (true);
