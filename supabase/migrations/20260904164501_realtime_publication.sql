-- Phase 3B — Migration 10: Realtime publication membership
--
-- Scope: docs/DATABASE.md §18 row 13 only. Publishes exactly the two
-- tables locked by the Phase 3A.1 amendment (docs/SECURITY.md §7:
-- "Amended in 3A.1: two tables, not four — centre_live_state and
-- bookings"), confirmed independently by docs/PROJECT_STATE.md's Phase
-- 3A.1 completed-work log. No RLS change, no grant change, no
-- REPLICA IDENTITY change (both tables already default/primary key,
-- verified live before writing this migration) — publication membership
-- is the entire change.
--
-- centre_status and procurement_records are deliberately NOT published
-- (dropped in the 3A.1 amendment: their changes already reach
-- subscribers through the centre_live_state aggregate or a refetch).
-- payment_records, profiles, audit_events, and the two views
-- (v_centre_availability, v_centre_daily_summary) were never candidates
-- for realtime and are not touched here.

alter publication supabase_realtime add table public.centre_live_state;
alter publication supabase_realtime add table public.bookings;
