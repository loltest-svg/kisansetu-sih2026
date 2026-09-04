-- Phase 3B — Migration 8: rpc_set_payment_status
--
-- Scope: docs/DATABASE.md §18 row 12, the one remaining RPC —
-- rpc_set_payment_status. No new tables/enums/RLS policies. Nothing else
-- touched except the one pre-existing gap found during the required
-- pre-implementation inspection (see below), which is necessary for this
-- RPC to be correctly auditable, not an unrelated change.
--
-- Authorization, derived from docs/SECURITY.md §3's matrix
-- ("payment_records | R own | R own centre | R/W own centre | R/W all")
-- and OQ-3's standing assumption ("Centre Admin/Master Admin sets it
-- manually in MVP") — deliberately NOT the Migration 6/7 Operator-
-- inclusive pattern, per explicit instruction: Operator has no W cell at
-- all for payment_records. Authorized: Centre Admin at the booking's own
-- centre, or Master Admin (any centre). Farmer and Operator denied.
--
-- Transition guard: unchanged and reused as-is, not duplicated —
-- enforce_payment_status_transition() (Migration 3) already blocks
-- PAID -> anything but FAILED-by-master-admin, and rejects the raw error
-- text is already clean ("payment status PAID is terminal except a
-- MASTER_ADMIN correction to FAILED"), so this RPC lets it propagate
-- rather than re-implementing or re-wrapping it.
--
-- No new column/behavior invented: failure_note is optional, matching
-- §10.1's "only meaningful with FAILED" (not "required with FAILED", so
-- not enforced as required here); it is cleared to NULL whenever the
-- target status is not FAILED, the same "no stale reason" rule already
-- used for centre_status.delay_reason (Migration 2/6).
--
-- ============================================================
-- Gap found during pre-implementation inspection, fixed here
-- ============================================================
-- payment_records_audit (Migration 5) is registered `AFTER UPDATE` only.
-- Because no RPC or trigger anywhere in this schema auto-creates a
-- payment_records row (Migration 7 explicitly declined to, deferring to
-- this migration), the very first call to rpc_set_payment_status for a
-- given booking is an INSERT — which the existing trigger registration
-- would silently never audit. Extended via `CREATE OR REPLACE TRIGGER`
-- (supported since PostgreSQL 14; this project runs 17) to also fire on
-- INSERT, and the function body updated to recognize that case — the
-- existing UPDATE-driven PAYMENT_STATUS_CHANGED behavior for every
-- later transition is unchanged. This is required for this RPC's own
-- audit coverage to be complete, not a scope expansion.

create or replace function public.audit_payment_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' or new.status is distinct from old.status then
    perform public.write_audit_event(
      'payment_record',
      new.booking_id,
      (select b.centre_id from public.bookings b where b.id = new.booking_id),
      'PAYMENT_STATUS_CHANGED',
      format(
        'Payment status %s -> %s for booking %s',
        case when TG_OP = 'INSERT' then '(none)' else old.status::text end,
        new.status,
        new.booking_id
      ),
      jsonb_build_object(
        'from_status', case when TG_OP = 'INSERT' then null else old.status end,
        'to_status', new.status
      )
    );
  end if;
  return new;
end;
$$;

create or replace trigger payment_records_audit
  after insert or update on public.payment_records
  for each row execute function public.audit_payment_records();

-- ============================================================
-- rpc_set_payment_status
-- ============================================================

create function public.rpc_set_payment_status(
  p_booking_id uuid,
  p_status public.payment_status,
  p_failure_note text default null
)
returns public.payment_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_record public.payment_records;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found';
  end if;

  if not (
    auth_is_master_admin()
    or (auth_role() = 'CENTRE_ADMIN' and v_booking.centre_id = any (auth_centre_ids()))
  ) then
    raise exception 'not authorized to set payment status for this booking';
  end if;

  insert into public.payment_records (booking_id, status, status_updated_at, status_updated_by, failure_note)
  values (
    p_booking_id,
    p_status,
    now(),
    auth.uid(),
    case when p_status = 'FAILED' then p_failure_note else null end
  )
  on conflict (booking_id) do update set
    status = excluded.status,
    status_updated_at = excluded.status_updated_at,
    status_updated_by = excluded.status_updated_by,
    failure_note = excluded.failure_note
  returning * into v_record;

  return v_record;
end;
$$;

revoke execute on function public.rpc_set_payment_status(uuid, public.payment_status, text) from public, anon;
grant execute on function public.rpc_set_payment_status(uuid, public.payment_status, text) to authenticated;
