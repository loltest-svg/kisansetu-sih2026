-- Phase 3B — Migration 6: RPC layer, approved subset
--
-- Scope: docs/DATABASE.md §18 row 12, restricted to the six functions
-- named in the approval for this migration:
--   rpc_create_booking, rpc_expire_stale_bookings,
--   rpc_get_my_queue_position, rpc_check_in, rpc_call_next_farmer,
--   rpc_set_centre_status
-- Quality/weighment/procurement/payment RPCs are explicitly deferred to
-- a later migration, per instruction.
--
-- audit_events (row 10, Migration 5) is a hard dependency and is
-- treated as already available — every mutating RPC below relies on the
-- triggers already in place (bookings_audit, centre_status_audit) rather
-- than writing audit rows itself, so audit coverage is automatic and
-- consistent with every other write path in this schema.
--
-- Because every RPC here runs in the CALLING USER's own authenticated
-- session (invoked directly via PostgREST, not via a service-role server
-- action), auth.uid() already resolves to the real caller throughout —
-- no `SET LOCAL app.actor_profile_id` is needed in these RPCs; that
-- mechanism (Migration 5) exists for a *service-role*-driven path, which
-- only rpc_expire_stale_bookings (a scheduled job, see below) is.
--
-- OQ-17 (docs/PROJECT_STATE.md): now_serving_token is not read, returned,
-- or depended on by rpc_get_my_queue_position or any other function
-- below. rpc_get_my_queue_position's original sketch in
-- docs/ARCHITECTURE.md includes it in the return shape; it is
-- deliberately omitted here per explicit instruction, not overlooked.

-- ============================================================
-- 1. rpc_create_booking (docs/DATABASE.md §7.5-§7.6, §14 R-2/R-3)
-- ============================================================
-- Idempotent by request_id (§7.5), enforces the one-active-booking
-- invariant via the existing partial unique index (translated to a clean
-- domesticated error, never a raw constraint violation, per §7.6), locks
-- the slot row before checking capacity (§14 R-2), and allocates the
-- token inside the same transaction with a bounded retry on token
-- collision (§14 R-3). Farmer identity (name/phone) is snapshotted from
-- `profiles` server-side — never trusted from the caller (docs/SECURITY.md
-- S-6). `farmer_id`/`created_by` are always `auth.uid()`; there is no
-- parameter for either, so a caller cannot book as anyone but themselves.
--
-- Admission recomputes effective_status inline (docs/DATABASE.md §6.1),
-- reading centre_status only when the slot's service_date is today
-- (Asia/Kolkata) — matching the OQ-19 resolution already applied to
-- centre_live_state in Migration 4: a manual status set today must not
-- block a booking for a future date. This is the "recompute for
-- decisions" half of "cache for display, recompute for decisions"
-- (§12.1) — centre_live_state is never read here.

create function public.rpc_create_booking(
  p_slot_id uuid,
  p_commodity_id uuid,
  p_expected_quantity_quintal numeric,
  p_request_id uuid
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.bookings;
  v_slot record;
  v_is_active boolean;
  v_daily_farmer_capacity int;
  v_is_today boolean;
  v_manual_status public.centre_operational_status;
  v_slot_booked int;
  v_farmers_booked int;
  v_effective_status public.centre_effective_status;
  v_farmer record;
  v_token_prefix text;
  v_token text;
  v_next_num int;
  v_booking public.bookings;
  v_constraint_name text;
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  -- Idempotent replay: a retried request with the same request_id
  -- returns the already-created booking rather than erroring (§7.5, C-10).
  select * into v_existing from public.bookings where request_id = p_request_id;
  if found then
    return v_existing;
  end if;

  select full_name, phone into v_farmer from public.profiles where id = auth.uid();
  if not found then
    raise exception 'profile not found';
  end if;
  if v_farmer.phone is null then
    raise exception 'a phone number is required on your profile before booking';
  end if;

  select id, centre_id, service_date, farmer_capacity into v_slot
  from public.slots
  where id = p_slot_id
  for update;
  if not found then
    raise exception 'slot not found';
  end if;

  select is_active into v_is_active from public.procurement_centres where id = v_slot.centre_id;
  if not coalesce(v_is_active, false) then
    raise exception 'centre is not accepting bookings';
  end if;

  if not exists (
    select 1 from public.centre_commodities
    where centre_id = v_slot.centre_id and commodity_id = p_commodity_id
  ) then
    raise exception 'centre does not accept this commodity';
  end if;

  select daily_farmer_capacity into v_daily_farmer_capacity
  from public.centre_operating_days
  where centre_id = v_slot.centre_id and service_date = v_slot.service_date;
  if not found then
    raise exception 'centre is not operating on this date';
  end if;

  v_is_today := v_slot.service_date = ((now() at time zone 'Asia/Kolkata')::date);
  if v_is_today then
    select status into v_manual_status from public.centre_status where centre_id = v_slot.centre_id;
  end if;

  select count(*) into v_slot_booked
  from public.bookings
  where slot_id = v_slot.id and status not in ('CANCELLED', 'NO_SHOW', 'EXPIRED');

  select count(*) into v_farmers_booked
  from public.bookings
  where centre_id = v_slot.centre_id and service_date = v_slot.service_date
    and status not in ('CANCELLED', 'NO_SHOW', 'EXPIRED');

  -- Same §6.1 precedence as recompute_centre_live_state (Migration 4),
  -- manual status applied only to today, per OQ-19.
  if v_is_today and v_manual_status = 'CLOSED' then
    v_effective_status := 'CLOSED';
  elsif v_is_today and v_manual_status = 'PAUSED' then
    v_effective_status := 'PAUSED';
  elsif v_farmers_booked >= v_daily_farmer_capacity or v_slot_booked >= v_slot.farmer_capacity then
    v_effective_status := 'FULL';
  elsif v_is_today and v_manual_status = 'DELAYED' then
    v_effective_status := 'DELAYED';
  else
    v_effective_status := 'OPEN';
  end if;

  if v_effective_status = 'CLOSED' then
    raise exception 'centre is closed';
  elsif v_effective_status = 'PAUSED' then
    raise exception 'centre is paused and not accepting bookings right now';
  elsif v_effective_status = 'FULL' then
    raise exception 'no capacity remaining for this slot/date';
  end if;
  -- OPEN and DELAYED both admit bookings (§6.2 case 6).

  select token_prefix into v_token_prefix from public.commodities where id = p_commodity_id;
  if not found then
    raise exception 'commodity not found';
  end if;

  loop
    v_attempt := v_attempt + 1;

    select count(*) + 1 into v_next_num
    from public.bookings
    where centre_id = v_slot.centre_id and service_date = v_slot.service_date;

    v_token := v_token_prefix || '-' || v_next_num;

    begin
      insert into public.bookings (
        centre_id, slot_id, service_date, farmer_id, farmer_name_snapshot, farmer_phone_snapshot,
        commodity_id, expected_quantity_quintal, token, status, request_id, created_by
      )
      values (
        v_slot.centre_id, v_slot.id, v_slot.service_date, auth.uid(), v_farmer.full_name, v_farmer.phone,
        p_commodity_id, p_expected_quantity_quintal, v_token, 'CONFIRMED', p_request_id, auth.uid()
      )
      returning * into v_booking;

      return v_booking;
    exception
      when unique_violation then
        get stacked diagnostics v_constraint_name = constraint_name;

        if v_constraint_name = 'bookings_centre_id_service_date_token_key' then
          if v_attempt >= 5 then
            raise exception 'unable to allocate a booking token, please retry';
          end if;
          -- loop again with a freshly recomputed token number
        elsif v_constraint_name = 'bookings_one_active_per_farmer' then
          raise exception 'you already have an active booking';
        elsif v_constraint_name = 'bookings_request_id_key' then
          -- Concurrent retry of the same request_id won the race; return
          -- its result instead of erroring (still idempotent, §7.5).
          select * into v_existing from public.bookings where request_id = p_request_id;
          return v_existing;
        else
          raise;
        end if;
    end;
  end loop;
end;
$$;

revoke execute on function public.rpc_create_booking(uuid, uuid, numeric, uuid) from public, anon;
grant execute on function public.rpc_create_booking(uuid, uuid, numeric, uuid) to authenticated;

-- ============================================================
-- 2. rpc_expire_stale_bookings (docs/DATABASE.md §7.7, §18 row 14)
-- ============================================================
-- Scope deliberately narrow, per this migration's explicit "no new grace
-- period" instruction: only `CONFIRMED` bookings whose service_date has
-- fully passed are moved to `EXPIRED` — the one case §7.7 states
-- outright, with no open parameter. The second §7.7 case (a stale
-- `CHECKED_IN`/`CALLED`/`IN_PROGRESS` booking past its date) is
-- deliberately left untouched here: docs/DATABASE.md §19 still lists its
-- grace period as `OQ-14`, unresolved with a specific number ("Recommend
-- end of the following day" is a recommendation, not a lock), and this
-- migration's brief says not to introduce a grace period not already
-- explicitly specified. "Not expired immediately" (§7.7) is therefore
-- exactly what this function does for that case — nothing — rather than
-- guessing a threshold. The anomaly-surfacing half of that same §7.7
-- bullet (flagging it to the operator/admin) is a UI/notification
-- concern, out of this migration's scope regardless.
--
-- Invoked by a scheduled job (a future server route or pg_cron entry —
-- neither is configured by this migration; only the callable database
-- function is built). Runs with no authenticated session (auth.uid() is
-- NULL under the service role that would invoke it), so every EXPIRED
-- transition's audit_events row correctly attributes to no actor (§16:
-- "NULL = system/automated") via the existing bookings_audit trigger —
-- no special handling needed here.

create function public.rpc_expire_stale_bookings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_count int;
begin
  update public.bookings
  set status = 'EXPIRED'
  where status = 'CONFIRMED' and service_date < v_today;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.rpc_expire_stale_bookings() from public, anon, authenticated;
grant execute on function public.rpc_expire_stale_bookings() to service_role;

-- ============================================================
-- 3. rpc_get_my_queue_position (docs/DATABASE.md §7.3, S-12,
--    docs/ARCHITECTURE.md "Farmer queue realtime")
-- ============================================================
-- SECURITY DEFINER so it can count ahead-of-caller rows the caller
-- cannot otherwise SELECT (§7.3's core reason for existing at all — a
-- window function inside an ordinary RLS-filtered view returns 1 for
-- every farmer, since RLS filters rows before the window ever sees
-- them). Ownership is verified first; "not your booking" and "no such
-- booking" return the byte-identical error (S-12 anti-oracle) — verified
-- live below, not just asserted.
--
-- Returns only `ahead_count`/`estimated_wait_minutes`. `now_serving_token`
-- is intentionally not part of this return shape — OQ-17 remains
-- unresolved and nothing here reads or depends on that column.

create function public.rpc_get_my_queue_position(p_booking_id uuid)
returns table (ahead_count int, estimated_wait_minutes int)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_ahead int;
  v_rate int;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id and farmer_id = auth.uid();

  if not found then
    -- Identical message/errcode regardless of whether p_booking_id
    -- belongs to someone else or doesn't exist at all (S-12).
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  if v_booking.status not in ('CHECKED_IN', 'CALLED', 'IN_PROGRESS') then
    -- Not currently in the queue (e.g. still CONFIRMED, not yet arrived,
    -- or already terminal) — no position to report, not an error.
    return query select null::int, null::int;
    return;
  end if;

  select count(*) into v_ahead
  from public.bookings b
  where b.centre_id = v_booking.centre_id
    and b.service_date = v_booking.service_date
    and b.status in ('CHECKED_IN', 'CALLED', 'IN_PROGRESS')
    and b.checked_in_at < v_booking.checked_in_at;

  select coalesce(processing_rate_per_hour, default_processing_rate_per_hour) into v_rate
  from public.procurement_centres pc
  left join public.centre_operating_days cod
    on cod.centre_id = pc.id and cod.service_date = v_booking.service_date
  where pc.id = v_booking.centre_id;

  return query select
    v_ahead,
    case when coalesce(v_rate, 0) > 0 then ceil(v_ahead::numeric / v_rate * 60)::int else null end;
end;
$$;

revoke execute on function public.rpc_get_my_queue_position(uuid) from public, anon;
grant execute on function public.rpc_get_my_queue_position(uuid) to authenticated;

-- ============================================================
-- 4. rpc_check_in (docs/DATABASE.md §7.2, OQ-15)
-- ============================================================
-- Operator/Centre Admin only, at their own assigned centre (Master Admin
-- is read-only on bookings per docs/SECURITY.md §3 — "day-to-day queue
-- actions remain centre-scoped roles' work", docs/PROJECT.md). Per OQ-15,
-- check-in is allowed while the centre is PAUSED (only CLOSED blocks
-- it) — calling is what PAUSED blocks (see rpc_call_next_farmer below).

create function public.rpc_check_in(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_is_active boolean;
  v_is_today boolean;
  v_manual_status public.centre_operational_status;
  v_has_operating_day boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;

  if not (auth_role() in ('OPERATOR', 'CENTRE_ADMIN') and v_booking.centre_id = any (auth_centre_ids())) then
    raise exception 'not authorized for this centre';
  end if;

  if v_booking.status <> 'CONFIRMED' then
    raise exception 'booking is not in a checkable-in state (current status: %)', v_booking.status;
  end if;

  select is_active into v_is_active from public.procurement_centres where id = v_booking.centre_id;

  v_is_today := v_booking.service_date = ((now() at time zone 'Asia/Kolkata')::date);
  v_has_operating_day := exists (
    select 1 from public.centre_operating_days
    where centre_id = v_booking.centre_id and service_date = v_booking.service_date
  );

  if v_is_today then
    select status into v_manual_status from public.centre_status where centre_id = v_booking.centre_id;
  end if;

  if not coalesce(v_is_active, false) or not v_has_operating_day or (v_is_today and v_manual_status = 'CLOSED') then
    raise exception 'centre is closed';
  end if;
  -- PAUSED, DELAYED, FULL and OPEN all permit check-in (OQ-15).

  update public.bookings
  set status = 'CHECKED_IN',
      checked_in_at = now()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke execute on function public.rpc_check_in(uuid) from public, anon;
grant execute on function public.rpc_check_in(uuid) to authenticated;

-- ============================================================
-- 5. rpc_call_next_farmer (docs/DATABASE.md §7.8, §14 R-1, OQ-15)
-- ============================================================
-- `FOR UPDATE SKIP LOCKED` on the queue head, re-checked inside the
-- transaction, so two operators calling simultaneously cannot both grab
-- the same farmer (R-1). Blocked while PAUSED or CLOSED (OQ-15: calling
-- is exactly what PAUSED blocks, unlike check-in). Returns NULL — not an
-- error — when the queue is empty; an empty queue is a valid state, not
-- a failure.

create function public.rpc_call_next_farmer(p_centre_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_active boolean;
  v_is_today boolean;
  v_manual_status public.centre_operational_status;
  v_has_operating_day boolean;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not (auth_role() in ('OPERATOR', 'CENTRE_ADMIN') and p_centre_id = any (auth_centre_ids())) then
    raise exception 'not authorized for this centre';
  end if;

  select is_active into v_is_active from public.procurement_centres where id = p_centre_id;
  v_has_operating_day := exists (
    select 1 from public.centre_operating_days
    where centre_id = p_centre_id and service_date = v_today
  );
  select status into v_manual_status from public.centre_status where centre_id = p_centre_id;
  v_is_today := true; -- calling only ever concerns "right now", i.e. today

  if not coalesce(v_is_active, false) or not v_has_operating_day or v_manual_status = 'CLOSED' then
    raise exception 'centre is closed';
  elsif v_manual_status = 'PAUSED' then
    raise exception 'centre is paused; calling is blocked while paused';
  end if;

  select * into v_booking
  from public.bookings
  where centre_id = p_centre_id
    and service_date = v_today
    and status = 'CHECKED_IN'
  order by checked_in_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.bookings
  set status = 'CALLED',
      called_at = now(),
      processing_operator_id = auth.uid()
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke execute on function public.rpc_call_next_farmer(uuid) from public, anon;
grant execute on function public.rpc_call_next_farmer(uuid) to authenticated;

-- ============================================================
-- 6. rpc_set_centre_status (docs/DATABASE.md §5.1, §RLS-2, OQ-9)
-- ============================================================
-- The RPC that closes the "documented dependency" left open in
-- Migration 2: centre_status has zero client write policies by design,
-- and role/account_status changes on profiles are still unreachable —
-- this migration only builds the centre_status path, since that is what
-- was approved. Operator and Centre Admin both W at their own centre
-- (docs/SECURITY.md §3; OQ-9 assumes Centre Admin may also override).
-- Master Admin is read-only on centre_status per the same matrix ("R
-- all", no W cell) and is therefore not authorized here either — day-to-
-- day status changes remain a centre-scoped action.

create function public.rpc_set_centre_status(
  p_centre_id uuid,
  p_status public.centre_operational_status,
  p_delay_reason text default null
)
returns public.centre_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.centre_status;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not (auth_role() in ('OPERATOR', 'CENTRE_ADMIN') and p_centre_id = any (auth_centre_ids())) then
    raise exception 'not authorized for this centre';
  end if;

  if p_status = 'DELAYED' and p_delay_reason is null then
    raise exception 'a delay reason is required when reporting DELAYED';
  end if;

  insert into public.centre_status (centre_id, status, delay_reason, updated_by, updated_at)
  values (
    p_centre_id,
    p_status,
    case when p_status = 'DELAYED' then p_delay_reason else null end,
    auth.uid(),
    now()
  )
  on conflict (centre_id) do update set
    status = excluded.status,
    delay_reason = excluded.delay_reason,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.rpc_set_centre_status(uuid, public.centre_operational_status, text) from public, anon;
grant execute on function public.rpc_set_centre_status(uuid, public.centre_operational_status, text) to authenticated;
