-- Phase 3B — Migration 11: scheduled expiry sweep (§18 row 14)
--
-- Approved scope, exact wording: "Migration 11 will use pg_cron,
-- scheduled hourly (0 * * * *), running
-- select public.rpc_expire_stale_bookings();"
--
-- This is the invocation mechanism only. rpc_expire_stale_bookings()
-- itself (Migration 6) is not modified — its behavior already matches
-- the intended C-9/§7.7 semantics exactly (only CONFIRMED bookings past
-- their service_date move to EXPIRED; the CHECKED_IN/CALLED/IN_PROGRESS
-- grace-period case, OQ-14, remains deliberately untouched, no threshold
-- introduced here or anywhere else). Its grants are not touched either —
-- EXECUTE stays service_role-only; this job runs as the privileged role
-- that schedules it (the same role every other migration in this
-- project has run as), which already bypasses that grant the same way
-- it bypasses RLS, so no additional grant is needed.
--
-- pg_cron installed into the `extensions` schema, matching this
-- project's existing convention (pg_stat_statements, pgcrypto,
-- uuid-ossp are all already there — verified live before writing this
-- migration). pg_cron's own catalog/functions (cron.job,
-- cron.schedule(), cron.job_run_details) always live in the `cron`
-- schema regardless of the extension's own WITH SCHEMA target — that is
-- fixed by the extension itself, not a choice made here.
--
-- Idempotent by design, not by a defensive existence check:
-- cron.schedule(job_name, schedule, command) upserts by job_name (pg_cron
-- 1.4+; this project's available version is 1.6.4) — calling it again
-- with the same name replaces the existing job's definition rather than
-- creating a duplicate, so a re-apply of this migration cannot produce
-- two jobs.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'expire-stale-bookings',
  '0 * * * *',
  $$select public.rpc_expire_stale_bookings();$$
);
