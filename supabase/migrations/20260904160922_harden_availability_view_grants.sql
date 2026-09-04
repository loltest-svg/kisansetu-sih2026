-- Phase 3B — Migration 9 follow-up: close a grant gap found during
-- Migration 9's own required grants-verification step.
--
-- v_centre_availability and v_centre_daily_summary were created in the
-- previous migration with `revoke all ... ; grant select ...` issued
-- immediately after each CREATE VIEW, in the same migration script. Live
-- verification found `authenticated` still held INSERT/UPDATE/DELETE/
-- TRUNCATE/REFERENCES/TRIGGER on both — the same root cause already
-- seen for function EXECUTE in Migrations 1/4/5: Supabase's schema-level
-- default-privilege mechanism grants broadly to `authenticated` on every
-- newly created relation, and it applies at a point this project's
-- migrations cannot preempt with an in-migration revoke — only a
-- follow-up revoke, issued after the object fully exists, reliably
-- sticks (confirmed by testing a manual post-hoc revoke, which did take
-- effect immediately).
--
-- Not exploitable: both views use CTEs/joins/aggregates, so PostgreSQL
-- treats them as non-simple and refuses INSERT/UPDATE/DELETE
-- structurally regardless of grants ("Views containing WITH are not
-- automatically updatable" — verified live by attempting all three
-- against v_centre_availability, each rejected by Postgres itself before
-- any grant or RLS check). Closed anyway, for the same "minimal surface"
-- reason the earlier EXECUTE gaps were closed, and because grants that
-- are merely inert today would become a real path the moment anyone
-- adds an INSTEAD OF trigger later.

revoke all on public.v_centre_availability from authenticated, anon, public;
grant select on public.v_centre_availability to authenticated;

revoke all on public.v_centre_daily_summary from authenticated, anon, public;
grant select on public.v_centre_daily_summary to authenticated;
