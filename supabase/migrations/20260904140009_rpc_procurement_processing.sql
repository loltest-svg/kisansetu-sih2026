-- Phase 3B — Migration 7: procurement processing RPC trio
--
-- Scope: docs/DATABASE.md §18 row 12, restricted to exactly
-- rpc_record_quality, rpc_record_weighment, rpc_complete_procurement,
-- per the approved Migration 7 plan. rpc_set_payment_status is
-- explicitly deferred to Migration 8 and payment_records is not touched
-- anywhere in this file.
--
-- Locked decisions applied exactly as approved:
--   1. REJECTED quality is valid; completion is still allowed. Enforced:
--      accepted_quantity_quintal must be 0 when quality_result='REJECTED'
--      (checked at weighment time, since that is when
--      accepted_quantity_quintal is actually set).
--   2. Enforced workflow order: IN_PROGRESS -> quality -> weighment ->
--      completion -> COMPLETED. rpc_record_weighment requires
--      quality_checked_at already set; rpc_complete_procurement requires
--      weighed_at already set.
--   3. rpc_complete_procurement atomically sets procured_at/procured_by
--      AND transitions bookings.status -> COMPLETED + completed_at, as
--      one function body with no exception-swallowing between the two
--      updates — a failure in either aborts the whole call, and nothing
--      commits until the single RPC invocation's transaction does.
--   4. payment_records: untouched, not read, not written, not created.
--   5. Authorization: Centre Admin at the booking's centre, OR Operator
--      who is that specific booking's processing_operator_id (and still
--      currently assigned to the centre — defense in depth against a
--      revoked assignment mid-processing). Master Admin, Farmer, and any
--      unassigned Operator at the same centre are all denied. Derived
--      entirely from auth.uid()/auth_role()/auth_centre_ids() and the
--      authoritative bookings row — no client-supplied actor/centre ID
--      is ever trusted.
--   6. Audit: the already-applied audit_procurement_records() trigger
--      (Migration 5) is extended via CREATE OR REPLACE — additive to its
--      already-shipped behavior, not a rewrite of Migration 5's file or
--      history — to also fire QUALITY_RECORDED and WEIGHMENT_RECORDED on
--      their respective "newly set" transitions, using the exact same
--      proven pattern already used for PROCUREMENT_COMPLETED (left
--      byte-for-byte unchanged below). Audit stays entirely
--      trigger-driven, matching §16 ("written by database triggers, not
--      application code") — none of the three RPCs calls
--      write_audit_event directly. bookings_audit (already applied,
--      unmodified) covers BOOKING_COMPLETED automatically when
--      rpc_complete_procurement updates bookings.status.
--
-- OQ-17 stays untouched: none of these RPCs reads, writes, or depends on
-- centre_live_state.now_serving_token, or on centre_live_state at all —
-- authorization and workflow decisions read only authoritative bookings/
-- procurement_records/centre_assignments rows.

-- ============================================================
-- 1. Shared authorization helper
-- ============================================================
-- Not granted to any client role — reachable only from the three
-- SECURITY DEFINER RPCs below, which call it in their own execution
-- context (a SECURITY DEFINER function's internal calls run as its
-- owner, so no separate grant is needed for this to work).

create function public.can_process_booking(p_booking public.bookings)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth_role() = 'CENTRE_ADMIN' and p_booking.centre_id = any (auth_centre_ids()))
    or (
      auth_role() = 'OPERATOR'
      and p_booking.processing_operator_id = auth.uid()
      and p_booking.centre_id = any (auth_centre_ids())
    );
$$;

revoke execute on function public.can_process_booking(public.bookings) from public, anon, authenticated;

-- ============================================================
-- 2. rpc_record_quality
-- ============================================================

create function public.rpc_record_quality(
  p_booking_id uuid,
  p_quality_result public.quality_result,
  p_quality_note text default null
)
returns public.procurement_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_record public.procurement_records;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;

  if not public.can_process_booking(v_booking) then
    raise exception 'not authorized to process this booking';
  end if;

  if v_booking.status <> 'IN_PROGRESS' then
    raise exception 'booking must be IN_PROGRESS to record quality (current status: %)', v_booking.status;
  end if;

  insert into public.procurement_records (booking_id, quality_result, quality_note, quality_checked_at, quality_checked_by)
  values (p_booking_id, p_quality_result, p_quality_note, now(), auth.uid())
  on conflict (booking_id) do update set
    quality_result = excluded.quality_result,
    quality_note = excluded.quality_note,
    quality_checked_at = excluded.quality_checked_at,
    quality_checked_by = excluded.quality_checked_by
  returning * into v_record;

  return v_record;
end;
$$;

revoke execute on function public.rpc_record_quality(uuid, public.quality_result, text) from public, anon;
grant execute on function public.rpc_record_quality(uuid, public.quality_result, text) to authenticated;

-- ============================================================
-- 3. rpc_record_weighment
-- ============================================================

create function public.rpc_record_weighment(
  p_booking_id uuid,
  p_gross_weight_quintal numeric,
  p_accepted_quantity_quintal numeric
)
returns public.procurement_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_existing public.procurement_records;
  v_record public.procurement_records;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;

  if not public.can_process_booking(v_booking) then
    raise exception 'not authorized to process this booking';
  end if;

  if v_booking.status <> 'IN_PROGRESS' then
    raise exception 'booking must be IN_PROGRESS to record weighment (current status: %)', v_booking.status;
  end if;

  select * into v_existing from public.procurement_records where booking_id = p_booking_id;
  if not found or v_existing.quality_checked_at is null then
    raise exception 'quality must be recorded before weighment';
  end if;

  if v_existing.quality_result = 'REJECTED' and p_accepted_quantity_quintal <> 0 then
    raise exception 'accepted quantity must be 0 when quality result is REJECTED';
  end if;

  begin
    update public.procurement_records
    set gross_weight_quintal = p_gross_weight_quintal,
        accepted_quantity_quintal = p_accepted_quantity_quintal,
        weighed_at = now(),
        weighed_by = auth.uid()
    where booking_id = p_booking_id
    returning * into v_record;
  exception
    when check_violation then
      raise exception 'accepted quantity cannot exceed gross weight';
  end;

  return v_record;
end;
$$;

revoke execute on function public.rpc_record_weighment(uuid, numeric, numeric) from public, anon;
grant execute on function public.rpc_record_weighment(uuid, numeric, numeric) to authenticated;

-- ============================================================
-- 4. rpc_complete_procurement
-- ============================================================
-- Sequential, unguarded (no exception-swallowing) updates: either both
-- commit or neither does, as one PL/pgSQL function body inside the one
-- transaction the calling statement opened.

create function public.rpc_complete_procurement(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_record public.procurement_records;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;

  if not public.can_process_booking(v_booking) then
    raise exception 'not authorized to process this booking';
  end if;

  if v_booking.status <> 'IN_PROGRESS' then
    raise exception 'booking must be IN_PROGRESS to complete procurement (current status: %)', v_booking.status;
  end if;

  select * into v_record from public.procurement_records where booking_id = p_booking_id;
  if not found or v_record.weighed_at is null then
    raise exception 'weighment must be recorded before completing procurement';
  end if;

  update public.procurement_records
  set procured_at = now(),
      procured_by = auth.uid()
  where booking_id = p_booking_id;

  update public.bookings
  set status = 'COMPLETED',
      completed_at = now()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke execute on function public.rpc_complete_procurement(uuid) from public, anon;
grant execute on function public.rpc_complete_procurement(uuid) to authenticated;

-- ============================================================
-- 5. Extend the audit trigger (Migration 5, additive CREATE OR REPLACE)
-- ============================================================
-- The PROCUREMENT_COMPLETED branch below is copied verbatim from the
-- live definition confirmed before writing this migration — unchanged.
-- Two new branches added, following the identical proven pattern.

create or replace function public.audit_procurement_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.quality_checked_at is not null and (TG_OP = 'INSERT' or old.quality_checked_at is null) then
    perform public.write_audit_event(
      'procurement_record',
      new.booking_id,
      (select b.centre_id from public.bookings b where b.id = new.booking_id),
      'QUALITY_RECORDED',
      format('Quality result %s recorded for booking %s', new.quality_result, new.booking_id),
      jsonb_build_object('quality_result', new.quality_result)
    );
  end if;

  if new.weighed_at is not null and (TG_OP = 'INSERT' or old.weighed_at is null) then
    perform public.write_audit_event(
      'procurement_record',
      new.booking_id,
      (select b.centre_id from public.bookings b where b.id = new.booking_id),
      'WEIGHMENT_RECORDED',
      format('Weighment recorded for booking %s', new.booking_id),
      jsonb_build_object(
        'gross_weight_quintal', new.gross_weight_quintal,
        'accepted_quantity_quintal', new.accepted_quantity_quintal
      )
    );
  end if;

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

-- The trigger itself (Migration 5) already fires AFTER INSERT OR UPDATE
-- on procurement_records and needs no change; CREATE OR REPLACE above
-- takes effect for it automatically.
