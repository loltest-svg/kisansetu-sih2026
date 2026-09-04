# Project State

## CURRENT PHASE

Phase 3B — Migration 9 complete: `v_centre_availability` and
`v_centre_daily_summary` (§18 row 11). `v_centre_daily_summary` ships
with `avg_wait`/`peak_concurrent_waiting` only — `uptime` was flagged as
genuinely undefined in the docs (no formula, no agreed baseline window)
and, per explicit decision, deferred to a later migration rather than
guessed. Two real defects were found during this migration's own
required verification steps and fixed with additive follow-up migrations
before this phase could be called complete (see below) — neither
required editing an already-applied migration file. `OQ-17` untouched.
Stopped after Migration 9 per instruction; row 13 (realtime), row 14
(the expiry sweep's actual schedule), and row 15 (seed data) all remain
unbuilt, awaiting explicit approval and, for row 14, a mechanism decision
(`pg_cron` vs. an application-level cron route) not yet made.

## COMPLETED

- **Phase 3B — Migration 9 (`v_centre_availability`, `v_centre_daily_summary`):**
  - `supabase/migrations/20260904160614_availability_views.sql`, plus
    two same-session follow-ups:
    `20260904160922_harden_availability_view_grants.sql` and
    `20260904161128_fix_view_delay_estimate_rounding.sql`. No new table,
    RPC, trigger, or policy — pure read-only views over already-verified
    tables. Verified live: function count unchanged (35), policy count
    unchanged (33), no realtime publication entries, no `pg_cron`
    extension — confirming rows 13/14/15 were not pulled in.
  - **Ambiguity flagged and resolved by explicit decision before writing
    SQL**: `v_centre_daily_summary`'s `uptime` column has no formula
    anywhere in the docs, and a real product question (does `PAUSED`
    count as downtime the same as `CLOSED`? what's the baseline window?)
    — omitted from this migration per your explicit choice, to be added
    once defined. `avg_wait` uses §13's exact given formula
    (`avg(called_at − checked_in_at)`) verbatim; `peak_concurrent_waiting`
    has no formula either but was implemented anyway (not held back the
    same way `uptime` was) because it has a direct, internally-consistent
    reading available — a timeline reconstruction using the exact same
    `CHECKED_IN` "waiting" window already locked for
    `centre_live_state.waiting_count` (Migration 4) — flagged here as an
    interpretation, not a documented fact.
  - **Deliberate design point, documented and verified live, not just
    asserted**: both views run with the *owning* role's privileges, not
    the querying user's (PostgreSQL's `security_invoker` view option was
    deliberately left unset — its default is `false`). This is required,
    not a weakening: both views aggregate across *all* bookings at a
    centre, and a farmer's own `bookings` RLS policy (own rows only)
    would otherwise filter every other farmer's row out **before** the
    aggregate functions ever saw them, silently returning wrong,
    under-counted numbers — the identical trap §7.3 already documents
    for window functions, applying equally to `COUNT`/`SUM`. Verified
    live as the primary test: querying `v_centre_availability` as a
    Farmer who owns only 1 of 2 bookings at a centre, an Operator, a
    Centre Admin at that centre, a Centre Admin at a *different* centre,
    and Master Admin all returned the **identical, true** centre-wide
    numbers (`farmers_booked=2`, `farmers_processed=1`, etc.) — not five
    different RLS-filtered answers. Safe because both views' entire
    column list is centre+date-level aggregates only (capacities,
    counts, percentages, a derived status) — no booking id, no farmer
    id, no name, no phone anywhere — the same "no personal data, safe
    for any authenticated user" analysis already applied to
    `centre_live_state` (§7, S-13).
  - **Grant gap found during this migration's own required
    grants-verification step, fixed via an additive follow-up
    migration**: despite an in-migration `REVOKE ALL; GRANT SELECT`
    issued immediately after each `CREATE VIEW`, live verification found
    `authenticated` still held `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/
    `REFERENCES`/`TRIGGER` on both views — the same root cause already
    seen for function `EXECUTE` in Migrations 1/4/5: Supabase's
    schema-level default-privilege mechanism grants broadly to
    `authenticated` on every new relation at a point no in-migration
    revoke can preempt; only a follow-up revoke, issued after the object
    fully exists, reliably sticks (confirmed by testing a manual
    post-hoc revoke, which took effect immediately). **Confirmed not
    exploitable regardless**: both views use CTEs/joins/aggregates, so
    PostgreSQL refuses `INSERT`/`UPDATE`/`DELETE` against them
    structurally ("Views containing WITH are not automatically
    updatable") — verified live by attempting all three — independent of
    any grant. Closed anyway, for the same minimal-surface reason the
    earlier `EXECUTE` gaps were closed, and because grants that are
    merely inert today would become a real path the moment anyone adds
    an `INSTEAD OF` trigger later.
  - **Real arithmetic defect found during row-level testing, fixed via a
    second additive follow-up**: `estimated_delay_minutes` used
    `ceil(farmers_waiting / rate * 60)`. PostgreSQL's `numeric` division
    truncates to a fixed internal scale rather than computing exactly, so
    an evenly-divisible case (1 farmer waiting / 6 per hour × 60 minutes,
    exactly 10) computed as `10.00000000000000000020`, and `ceil()` on
    that tiny positive remainder rounded up to 11 — caught by comparing
    the view's live output against a hand-computed expected value, not
    assumed correct. Fixed by rounding to 4 decimal places before
    ceiling (absorbs the precision noise on exact cases; genuinely
    fractional cases like 1/7×60 = 8.571… → 9 are unaffected) via
    `CREATE OR REPLACE VIEW` (permitted since the column's name/position/
    type were unchanged) — verified live: the same fixture now correctly
    returns 10, and grants were confirmed unchanged by the replace.
  - **Row-level correctness independently verified against hand-computed
    expected values**, not just "the query ran": a fixture with one
    `CHECKED_IN` booking, one `COMPLETED` booking (with a
    `procurement_records` row), and known capacity numbers produced
    `farmers_booked=2`, `farmers_processed=1`, `farmers_waiting=1`,
    `farmers_remaining=3`, `farmer_utilisation_pct=40.0`,
    `quantity_committed_quintal=18`, `quantity_procured_quintal=7.5`,
    `quantity_remaining_quintal=82`, `quantity_utilisation_pct=18.0`,
    `estimated_delay_minutes=10`, `effective_status=OPEN` — every one
    matching the hand-computed expectation exactly.
    `peak_concurrent_waiting` verified at both `1` and, after adding an
    overlapping check-in window, `2`.
  - **`anon` denied on both views** (`permission denied for view`,
    confirmed live for each); a centre with no `centre_operating_days`
    row produces zero view rows for it (no fabricated data for
    unconfigured dates).
  - **Regression-tested all 8 prior-migration invariants**: cross-farmer
    booking read denial, `profiles.role` self-promotion, `rpc_set_payment_status`
    authorization unchanged (operator correctly still denied),
    `rpc_create_booking`'s active-booking invariant re-verified (correctly
    blocked a second booking for an already-active farmer), `anon`
    denied `EXECUTE` on the helper/RPC surface. All intact.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 8 (`rpc_set_payment_status`):**
  - `supabase/migrations/20260904141540_rpc_set_payment_status.sql`. One
    RPC, exactly as approved. No new tables/enums/RLS policies —
    verified live: `payment_records` still exactly 1 policy, unchanged.
  - **Authorization deliberately narrower than the Migration 6/7
    pattern, per explicit instruction and `docs/SECURITY.md` §3's
    matrix**: Centre Admin at the booking's own centre, or Master Admin
    (any centre) — **Operator has no write cell at all** for
    `payment_records`, matching `OQ-3`'s standing assumption. Verified
    live: Farmer denied, Operator denied, cross-centre Centre Admin
    denied, same-centre Centre Admin authorized, Master Admin authorized
    system-wide.
  - **Existing transition guard reused, not duplicated**: the RPC lets
    Migration 3's `enforce_payment_status_transition()` trigger's own
    clean error propagate unchanged. Verified live: a Centre Admin's
    `PAID → PENDING` attempt and `PAID → FAILED` attempt both rejected
    with the trigger's exact original message; Master Admin's
    `PAID → FAILED` correction (with a `failure_note`) succeeded.
  - **Gap found during the required pre-implementation inspection, fixed
    as part of this migration, not carried forward**: `payment_records_audit`
    (Migration 5) was registered `AFTER UPDATE` only. Since no RPC or
    trigger anywhere auto-creates a `payment_records` row (Migration 7
    deliberately left that to this migration), the *first* call to
    `rpc_set_payment_status` for any booking is an `INSERT` — which the
    existing registration would have silently never audited. Extended
    via `CREATE OR REPLACE TRIGGER` (PG14+, this project runs 17) to also
    fire on `INSERT`, function body updated to handle the no-`OLD`-row
    case (`from_status: null`). Verified live: a fresh booking's first
    `rpc_set_payment_status` call produced a `PAYMENT_STATUS_CHANGED` row
    with `from_status: null`; every later transition still produces
    exactly one row each, correctly attributed to the real calling actor
    (Centre Admin then Master Admin, confirmed via `actor_role_snapshot`).
  - **No client-supplied actor/centre identity possible even in
    principle**: the RPC's signature is `(booking_id, status,
    failure_note)` — there is no actor-id or centre-id parameter to
    forge; authorization is derived entirely from `auth.uid()`/
    `auth_role()`/`auth_centre_ids()` and the authoritative `bookings`
    row's own `centre_id`. Verified by signature inspection, not just a
    runtime probe, since the attack surface a forged-ID test would probe
    structurally does not exist.
  - **Direct table mutation confirmed still impossible**: a direct client
    `UPDATE` on `payment_records` is a true no-op for every role
    including Master Admin (0 rows, `RETURNING` empty); a direct `INSERT`
    is an outright RLS violation. `EXECUTE` on `rpc_set_payment_status`
    confirmed denied to `anon`, granted to `authenticated` (internal role
    check does the real gating, same pattern as every RPC since
    Migration 6).
  - **Regression-tested all 7 prior-migration invariants**: `procurement_records`'
    policy/trigger set unchanged; cross-farmer booking read denial;
    `profiles.role` self-promotion still blocked; `rpc_record_quality`'s
    unassigned-operator denial unchanged; `rpc_create_booking` idempotency
    + the active-booking invariant re-verified through a fresh booking;
    `anon` denied `EXECUTE` on every helper/RPC checked, including all
    Migration 8 functions. All intact.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 7 (procurement processing RPC trio):**
  - `supabase/migrations/20260904140009_rpc_procurement_processing.sql`.
    Three RPCs plus one internal shared authorization helper
    (`can_process_booking`, granted to no one — reachable only from
    within the other `SECURITY DEFINER` functions) plus one additive
    `CREATE OR REPLACE` on the already-applied `audit_procurement_records()`
    trigger (Migration 5) to add two new audit branches. No new tables,
    enums, or RLS policies — verified live: policy count per table
    (`bookings`, `procurement_records`, `payment_records`, `centre_status`
    all still exactly 1, unchanged).
  - **Tightened authorization, verified live as the primary adversarial
    test**: Centre Admin at the booking's centre, **or** the specific
    Operator who is that booking's `processing_operator_id` (plus a
    defense-in-depth re-check that they're still assigned to the centre,
    in case their assignment was revoked mid-processing) — an
    *unassigned* Operator at the same centre is denied, confirmed live
    across all three RPCs. Master Admin and Farmer also confirmed denied
    on all three.
  - **Enforced workflow order verified live**: weighment before quality
    rejected (`quality must be recorded before weighment`); completion
    before weighment rejected (`weighment must be recorded before
    completing procurement`).
  - **REJECTED-quality handling verified live exactly as locked**:
    `REJECTED` quality recorded successfully; a weighment attempt with
    non-zero `accepted_quantity_quintal` on a `REJECTED` lot rejected
    with a clean error; the same call with `0` succeeded; completion of
    a `REJECTED` lot **succeeded** (booking reached `COMPLETED`),
    confirming rejection does not block the appointment from finishing.
  - **Atomic completion**: `rpc_complete_procurement` updates
    `procurement_records.procured_at`/`procured_by` and
    `bookings.status`/`completed_at` as plain sequential statements with
    no exception-swallowing between them — a failure anywhere aborts the
    whole call. The happy-path completion (quality → weighment →
    completion) succeeded cleanly end to end; the already-tested
    "completion before weighment" rejection is itself the strongest
    available live evidence of no-partial-write, since neither table
    shows any trace of a partial attempt afterward.
  - **`payment_records` confirmed completely untouched**: live count 0
    throughout, exactly 1 RLS policy (unchanged), both of its Migration 3
    triggers present and unmodified. No RPC in this migration reads,
    writes, or references it.
  - **Audit extended, not duplicated — verified live**: the existing
    `PROCUREMENT_COMPLETED` branch copied verbatim from the live
    definition before editing (confirmed byte-for-byte via
    `pg_get_functiondef` before writing the migration); two new branches
    (`QUALITY_RECORDED`, `WEIGHMENT_RECORDED`) added using the identical
    proven "newly set" pattern. A full quality→weighment→completion
    sequence for two bookings produced **exactly one** row per transition
    per booking (`QUALITY_RECORDED` ×1, `WEIGHMENT_RECORDED` ×1,
    `PROCUREMENT_COMPLETED` ×1, `BOOKING_COMPLETED` ×1 — no duplicates),
    each correctly attributed to the real calling operator via
    `auth.uid()`. Audit stays entirely trigger-driven — none of the three
    RPCs calls `write_audit_event` directly, matching §16.
  - **`centre_live_state` cascade confirmed correct**: after two
    bookings reached `COMPLETED`, `served_count = 2` (`OQ-16`) and
    `farmers_remaining` unchanged from their `IN_PROGRESS` values
    (`COMPLETED` still consumes capacity, `OQ-18`) — no RPC in this
    migration reads `centre_live_state` for any decision; it is only
    ever a downstream effect via the existing Migration 4 trigger.
  - **Regression-tested all 6 prior-migration invariants**: cross-farmer
    booking read denial, `profiles.role` self-promotion, cross-centre
    `audit_events` isolation, `rpc_create_booking` idempotency + the
    active-booking invariant (both re-verified through a fresh booking),
    `rpc_expire_stale_bookings` still denied to `authenticated`, `anon`
    denied `EXECUTE` on every helper/RPC checked including all 4 new
    Migration 7 functions. All intact.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 6 (RPC layer, approved subset):**
  - `supabase/migrations/20260904131335_rpc_booking_queue_status.sql`.
    Six functions only, exactly as approved:
    `rpc_create_booking`, `rpc_expire_stale_bookings`,
    `rpc_get_my_queue_position`, `rpc_check_in`, `rpc_call_next_farmer`,
    `rpc_set_centre_status`. All `SECURITY DEFINER`, `search_path=public`
    pinned, verified live.
  - **`rpc_create_booking`** (§7.5-§7.6, §14 R-2/R-3): idempotent by
    `request_id` — a retried identical request returns the same booking,
    verified live (same `id` on replay). Locks the `slots` row before
    checking capacity (§14 R-2); admission recomputes `effective_status`
    inline using the same §6.1 precedence as `recompute_centre_live_state`
    (Migration 4), reading `centre_status` only when the slot's date is
    today (OQ-19's resolution, applied consistently here too) — verified
    live: a centre `PAUSED` today did not block a booking for tomorrow,
    but did block one for today. Farmer identity is snapshotted from
    `profiles` server-side, never trusted from the caller; a missing
    phone number is rejected with a clean error before the `NOT NULL`
    constraint would otherwise raise a raw one. Token allocation retries
    on collision (up to 5 attempts, §14 R-3), and separately distinguishes
    a token collision from the active-booking-invariant violation and the
    idempotency-race case, translating each into its own clean domain
    error (or, for the idempotency race, returning the winning row) —
    never a raw constraint violation (§7.6).
  - **`rpc_expire_stale_bookings`** (§7.7): scope deliberately narrow —
    only `CONFIRMED` bookings past their `service_date` move to `EXPIRED`.
    The second §7.7 case (stale `CHECKED_IN`/`CALLED`/`IN_PROGRESS`) is
    left untouched, since its grace period (`OQ-14` in `docs/DATABASE.md`
    §19) is still just a recommendation, not a lock, and this migration's
    brief said not to invent one. Verified live: a stale `CONFIRMED`
    booking became `EXPIRED`; a stale `CHECKED_IN` one in the same sweep
    call was left exactly as it was. `EXECUTE` granted to `service_role`
    only — verified `authenticated` gets `42501` calling it directly.
  - **`rpc_get_my_queue_position`** (§7.3, S-12): returns only
    `ahead_count`/`estimated_wait_minutes` — `now_serving_token` is not
    part of the return shape at all, per the explicit OQ-17 deferral
    (the original sketch in `docs/ARCHITECTURE.md` includes it; this is a
    deliberate omission, not an oversight). Anti-oracle property verified
    live: a farmer probing a real-but-foreign booking id and a random
    uuid got the byte-identical error (`P0002: booking not found`, same
    text and errcode both ways).
  - **`rpc_check_in`** / **`rpc_call_next_farmer`** (OQ-15, §14 R-1,
    §7.8): both restricted to Operator/Centre Admin at their own
    assigned centre — Master Admin is excluded, matching
    `docs/SECURITY.md` §3's read-only cell for Master Admin on
    `bookings`/`centre_status` and `docs/PROJECT.md`'s "day-to-day queue
    actions remain centre-scoped roles' work." OQ-15's exact locked
    distinction verified live: check-in succeeded while the centre was
    `PAUSED`; call-next was rejected with a distinct error in the same
    state. `rpc_call_next_farmer` uses `FOR UPDATE SKIP LOCKED` on the
    queue head — verified under **genuine concurrency**, not just
    structurally: two truly parallel calls against a single `CHECKED_IN`
    booking, one won it, the other correctly got `NULL` (queue looked
    empty from its side), never a double-call or an error.
  - **`rpc_set_centre_status`** (§5.1, OQ-9, closes the Migration 2
    "documented dependency"): Operator/Centre Admin only at their own
    centre; Master Admin is **not** authorized here either, matching the
    matrix's "R all" (no W) cell for Master Admin on `centre_status`.
    `DELAYED` without a reason is rejected before it would otherwise hit
    the table's own `CHECK` constraint. Every call correctly cascades
    through all three Migration 2/4/5 triggers automatically (history
    event, `centre_live_state` recompute, audit row) — verified live in
    one combined trace.
  - **Audit coverage verified end-to-end, not assumed**: a full session
    trace (farmer bookings created, checked in, called; centre status
    changed through `OPEN→PAUSED→DELAYED`) produced exactly the expected
    `audit_events` rows, each correctly attributed to the real calling
    user (`actor_profile_id`/`actor_role_snapshot` populated from
    `auth.uid()`, since these RPCs run in the caller's own session — no
    `SET LOCAL app.actor_profile_id` needed here, unlike the scheduled
    `rpc_expire_stale_bookings`, whose resulting `BOOKING_EXPIRED` row
    correctly attributed to no actor, confirmed live).
  - **Grant hardening applied proactively for all 6 functions from the
    start** (continuing the Migration 5 lesson): `anon` confirmed to have
    zero `EXECUTE` on any of the six, `authenticated` has exactly the
    five meant for it, `rpc_expire_stale_bookings` has neither
    `anon` nor `authenticated` — all verified live immediately after
    applying, no gap found this time.
  - **Regression-tested all 5 prior-migration invariants**: cross-farmer
    booking read denial, `profiles.role` self-promotion still blocked at
    the grant layer, `audit_events` cross-centre isolation, direct client
    writes to `bookings` still impossible outside the RPC path, `anon`
    still denied every helper/RPC `EXECUTE` checked. All intact.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 5 (`audit_events`):**
  - `supabase/migrations/20260904125857_audit_events.sql`. Scope:
    `docs/DATABASE.md` §18 row 10 only — `audit_events` and the database
    triggers on the six tables it names (`centre_status`, `bookings`,
    `procurement_records`, `payment_records`, `centre_assignments`,
    `profiles` role/account_status).
  - **Why row 10 before row 12 (the RPC layer the user originally asked
    for)**: row 12 formally depends on row 10 in §18's own table, and
    §16 states database-trigger audit logging is "a Phase 3B
    implementation requirement, not an optional nicety." Raised as a
    blocking dependency gap before writing any SQL; user chose "build
    audit_events first, then RPCs" from two other options (proceed
    unaudited, or combine both into one migration).
  - **`action` vocabulary completed, not redefined**: §16 lists example
    action names (`CENTRE_STATUS_CHANGED`, `DELAY_REPORTED`,
    `CENTRE_PAUSED`, `CENTRE_RESUMED`, `BOOKING_CHECKED_IN`,
    `QUEUE_CALLED_NEXT`, `PROCUREMENT_COMPLETED`, `PAYMENT_STATUS_CHANGED`,
    `CENTRE_ADMIN_ASSIGNED`, `OPERATOR_ASSIGNED`, `ASSIGNMENT_REVOKED`,
    `ACCOUNT_ROLE_CHANGED`, `ACCOUNT_SUSPENDED`) but `action` is typed
    `text`, not a Postgres enum, and several tables' full lifecycles
    aren't covered by the given names (e.g. no `BOOKING_CREATED`/
    `BOOKING_CANCELLED`/`BOOKING_COMPLETED`). Filled in following the same
    naming convention (`BOOKING_<PAST_TENSE_EVENT>`, `ACCOUNT_STATUS_CHANGED`
    for the un-suspend case with no listed name) rather than leaving those
    transitions unaudited — a vocabulary completion, not an invented
    architecture decision, since the column was never a closed enum.
  - **Actor attribution (§16) implemented exactly**: `current_actor_profile_id()`
    prefers a transaction-local `app.actor_profile_id` setting over
    `auth.uid()`, for the future privileged RPC paths that will set it.
    Verified live: with `app.actor_profile_id` set to a test Centre
    Admin, three sequential `centre_status` transitions
    (insert-as-OPEN → PAUSED → OPEN) produced exactly
    `CENTRE_STATUS_CHANGED` / `CENTRE_PAUSED` / `CENTRE_RESUMED`, each
    correctly attributed with `actor_role_snapshot = CENTRE_ADMIN`.
  - **S-10 (PII in audit metadata) honored by construction**: every
    trigger's `metadata` is hand-built from an explicit field list; none
    references `farmer_phone_snapshot` or any other phone/credential
    field. Verified live: `metadata->>'farmer_phone_snapshot'` returned
    `NULL` on every one of 7 booking/payment audit rows produced by a
    full booking lifecycle test (`BOOKING_CREATED` through
    `BOOKING_COMPLETED`, plus two `PAYMENT_STATUS_CHANGED` transitions).
  - **Every audit-writing path proactively hardened this time** (applying
    the Migration 4 lesson before, not after, discovering a gap):
    `write_audit_event()` and `current_actor_profile_id()` (plain
    functions, not trigger-typed, so directly callable if left grantable)
    had `EXECUTE` revoked from `anon`/`authenticated`/`public` in the same
    migration that created them; verified live immediately —
    `has_function_privilege` returns `false` for all three roles on both.
    All six trigger functions confirmed to reject direct invocation
    structurally (`trigger functions can only be called as triggers`),
    independent of any grant. `audit_events` itself has `INSERT`/
    `UPDATE`/`DELETE`/`TRUNCATE` explicitly revoked from `anon`/
    `authenticated` at the grant layer (§16: "no UPDATE/DELETE grants to
    any client role for any reason"), on top of RLS's default-deny.
  - **Adversarial tests run live**, fixtures created and fully deleted
    afterward (verified empty): Farmer and Operator (even at their own
    centre) denied all `audit_events` access; Centre Admin sees only
    their own centre's rows, denied another centre's; Master Admin sees
    all; a forged direct `INSERT` attempt into `audit_events` denied for
    **every** role including Master Admin (`permission denied for table`);
    a direct call to `write_audit_event()` attempting to insert an
    arbitrary forged row denied at the grant layer; a `DELETE` attempt
    (append-only enforcement) denied for every role.
  - **Regression-tested all 5 prior-migration invariants** after
    applying: cross-farmer booking read denial, `profiles.role`
    self-promotion still blocked at the grant layer, `centre_live_state`
    still read-all/zero-write, `anon` still has no `EXECUTE` on the
    original 3 scope helpers or `recompute_centre_live_state`, and
    `bookings`/`centre_status`/`procurement_records`/`payment_records`
    still carry zero write policies. All intact.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 4 (`centre_live_state`):**
  - `supabase/migrations/20260904124205_centre_live_state.sql` +
    `supabase/migrations/20260904124459_harden_live_state_grants.sql`
    (see "grant hardening" below). Scope: `docs/DATABASE.md` §18 row 8
    only — `centre_live_state`, its three maintenance triggers (on
    `bookings`, `centre_operating_days`, `centre_status`), RLS. No RPC
    layer, no realtime publication (§18 row 13, a separate later
    migration by design — "publish only after policies are proven").
  - **OQ-16 (locked, applied exactly)**: `served_count` = `COMPLETED`
    only. Verified live by walking one booking through
    `CHECKED_IN→CALLED→IN_PROGRESS→COMPLETED` and confirming
    `served_count` stayed `0` until the final transition, then became
    `1` — not `1` at `CALLED`/`IN_PROGRESS` as a looser reading might have
    produced.
  - **OQ-18 (locked, applied exactly)**: capacity consumption =
    every booking status except `CANCELLED`/`NO_SHOW`/`EXPIRED`
    (`COMPLETED` still consumes; this is deliberately a *different* status
    set than §7.6's "active" set used for the one-active-booking
    invariant, which excludes `COMPLETED` — the two "active" concepts
    answer different questions and are not the same set, a distinction
    the source documents don't call out explicitly). Verified live:
    marking a booking `NO_SHOW` moved `farmers_remaining` and
    `quantity_remaining_quintal` up immediately, and flipped
    `effective_status` from `FULL` back to `DELAYED` as capacity
    reopened.
  - **OQ-19 (locked, resolved without touching Migration 2's schema)**:
    `centre_status` (still one row per centre, unmodified) is read only
    when computing **today's** (Asia/Kolkata) `centre_live_state` row;
    every other `service_date`'s row derives `effective_status` purely
    from `is_active` + operating-day existence + that date's own
    capacity — never from `centre_status`. Verified live against the
    brief's own example: set `centre_status` to `PAUSED` with two
    `centre_operating_days` rows already live (today, tomorrow) — today's
    row became `PAUSED`, tomorrow's stayed `OPEN`, untouched (`version`
    unchanged). This also resolves the "fan-out scope" question raised in
    Migration 3's report: a `centre_status` change recomputes **only**
    today's row, not every row that exists for that centre.
  - **§6.1 precedence verified live, including the FULL-over-DELAYED
    case**: with `centre_status = DELAYED` and 3/3 farmer slots booked,
    `effective_status` read `FULL` (not `DELAYED`) while `delay_reason`
    stayed populated on the row (§6.4 — the reason must not be lost even
    when it isn't the display-winning fact). Freeing one slot (`NO_SHOW`)
    flipped it back to `DELAYED` automatically.
  - **OQ-17 not resolved — deliberately, per explicit instruction to STOP
    rather than invent.** No text in the approved docs specifies which
    token "wins" when several bookings are legitimately `IN_PROGRESS` at
    once (`docs/DATABASE.md` §7.8 locks that several operators may each
    serve a different farmer simultaneously). `now_serving_token` exists
    as a column (nullable text, matching §12.1's type) and is written as
    `NULL` by every code path in this migration — never populated by a
    guessed rule. Verified live: with two bookings sequentially reaching
    `IN_PROGRESS` for the same centre/date (one already `COMPLETED` by
    the time the second started), `now_serving_token` stayed `NULL`
    throughout every transition. **Carried forward, not silently
    dropped** — see OPEN QUESTIONS.
  - **A second doc contradiction found and resolved**: `docs/SECURITY.md`
    §3's matrix restricts Operator/Centre Admin to "R own centre" on
    `centre_live_state`, but §7 states plainly, with reasoning,
    "`centre_live_state` is readable by all authenticated users because
    it contains no personal data." §7's statement was taken as
    authoritative (more specific to this table, states its reasoning, and
    matches the already-implemented broad-read pattern on
    `procurement_centres`/`commodities`) — also required by the
    already-approved farmer flow (`/farmer/bookings/new`, §17) needing to
    compare centres a farmer isn't otherwise scoped to. Implemented:
    `centre_live_state` readable by every authenticated user, matching
    §7 exactly; `anon` gets nothing (no policy applies to it — verified
    live).
  - **Grant-hardening finding, found and fixed within this same
    migration's own required "verify grants" step, not carried
    forward**: `recompute_centre_live_state(uuid, date)` was created with
    the explicit intent that no client role gets `EXECUTE` on it (only
    the maintenance triggers call it) — live verification found
    `authenticated` could call it directly anyway, the same root cause as
    the Migration 1 anon-EXECUTE finding (Supabase's schema-level default
    privileges grant `EXECUTE` to `authenticated` at `CREATE FUNCTION`
    time, before the migration's own `revoke` ran), but here more
    serious: since the function is `SECURITY DEFINER` and writes to
    `centre_live_state` (zero client write policies by design), any
    authenticated user could have forced a write to that table for any
    centre/date. Closed immediately via a second, additive migration file
    (`20260904124459_harden_live_state_grants.sql`) rather than editing
    the first — verified live: `has_function_privilege('authenticated',
    ...)` now `false`. All three trigger functions
    (`bookings_recompute_live_state`,
    `centre_operating_days_recompute_live_state`,
    `centre_status_recompute_live_state`) confirmed to reject direct
    invocation structurally (`trigger functions can only be called as
    triggers`), independent of any grant.
  - **Adversarial + regression tests run live**, fixtures created and
    fully deleted afterward (verified empty): broad authenticated read on
    `centre_live_state` (PASS), `anon` denied (PASS), direct client
    `UPDATE` on `centre_live_state` a true no-op for **every** role
    including Master Admin (PASS — no write policy for anyone), direct
    call to the now-hardened `recompute_centre_live_state` denied at the
    grant layer (PASS). All 5 Migration 1-3 regression checks (cross-
    farmer booking read denial, `profiles.role` self-promotion, both
    booking partial-unique indexes, `request_id` uniqueness, zero write
    policies on `bookings`/`centre_status`/`procurement_records`/
    `payment_records`, `anon` still has no EXECUTE on the 3 original scope
    helpers) re-verified intact.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 3 (procurement_records + payment_records):**
  - `supabase/migrations/20260904103232_procurement_and_payment_records.sql`.
    Scope: `docs/DATABASE.md` §18 row 9 only — the other row that became
    ready after Migration 2 (row 8, `centre_live_state`) was evaluated and
    explicitly deferred, not silently skipped.
  - **Row 8 deferred — real, unresolved architectural questions, not
    guessed past.** `centre_live_state`'s dependency (bookings) is
    satisfied, but §12.1 specifies its columns' *intent* in one line each,
    not their exact SQL semantics, and several of those are product
    decisions this migration must not invent:
    1. `served_count` ("bookings that have left the waiting set today") —
       does `NO_SHOW` count, given a `NO_SHOW` booking may never have been
       `CHECKED_IN` (never entered the waiting set) at all?
    2. `now_serving_token` — a single token, but §7.8 locks that several
       bookings can be `IN_PROGRESS` at once (several operators, each
       serving a different farmer). Which token "wins" isn't specified.
    3. `farmers_remaining` / `quantity_remaining_quintal` — whether a
       `NO_SHOW` booking still consumes the day's committed capacity (slot
       was reserved, went unused) or frees it (matching `CANCELLED`/
       `EXPIRED`). §4.3 reuses the word "active" for this, but §7.6
       already gives "active" a precise, *different* meaning (the
       farmer-invariant status set, which excludes `COMPLETED`) — applying
       that definition here would make a centre's capacity un-consumed by
       farmers it already finished processing, contradicting §4.3's own
       description of `daily_farmer_capacity`. The document doesn't flag
       that these are two different "active" sets.
    4. Fan-out scope when `centre_status` changes: it's not date-scoped
       (one row per centre) but `centre_live_state` is per
       `(centre_id, service_date)` — "today only" vs. "every date with an
       existing row" vs. something else isn't specified.
    Recorded as open questions (below) rather than resolved by
    assumption, because getting any of these wrong ships incorrect
    farmer/operator-facing numbers silently — a different risk profile
    than the narrow, either-way-safe judgment calls made resolving the
    Migration 2 RLS-2 ambiguity.
  - `procurement_records` and `payment_records` built exactly per
    `docs/DATABASE.md` §8.1/§10.1: 1:1 with `bookings`, the
    `accepted_quantity_quintal <= gross_weight_quintal` check, and the
    payment transition-guard trigger (`docs/SECURITY.md` C-6: `PAID` is
    terminal except a Master-Admin correction to `FAILED`; `PAID ->
    PENDING` rejected). No new RLS ambiguity to resolve — `docs/SECURITY.md`
    §RLS-2 already names "quality/weighment/procurement recording" and
    "payment status change" explicitly in its RPC-only list, so both
    tables ship read-only (same pattern as `bookings`/`centre_status` in
    Migration 2), consistently across every role's matrix cell this time.
  - **Adversarial tests run live** with disposable fixtures (created and
    fully deleted afterward, verified empty): cross-farmer and
    cross-centre read denial on both tables; direct client `INSERT` on
    `procurement_records` (RLS violation); direct client `UPDATE` on
    `payment_records` blocked by RLS for **every** role including Master
    Admin (a true no-op, confirmed via `RETURNING`) — matching the
    RPC-only design; an oracle-style probe (a farmer's own real booking id
    vs. a random uuid against `procurement_records` returned identically
    empty results, no differentiated error); and the payment
    transition-guard trigger's internal logic tested directly in a
    privileged bypass context simulating the future RPC (`PENDING->PAID`
    succeeds; `PAID->PENDING` regression rejected; `PAID->FAILED` succeeds
    only with a Master-Admin identity, rejected otherwise).
  - **Regression-tested all 8 Migration 1/2 invariants** after applying:
    `anon` still has no EXECUTE on the 3 scope helpers; `profiles.role`
    self-promotion still blocked at the grant layer; both booking partial
    unique indexes and `request_id` uniqueness still present; `bookings`/
    `centre_status` still carry zero write policies. All intact —
    Migration 3 touched no Migration 1/2 object.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 2 (centre_status + bookings):**
  - `supabase/migrations/20260904101623_centre_status_and_bookings.sql`.
    Scope: `docs/DATABASE.md` §18 row 5 (`centre_status`,
    `centre_status_events`, trigger) and row 7 (`bookings` + constraints +
    indexes) — the two remaining rows whose dependencies Migration 1 fully
    satisfied and which don't depend on each other. Everything from row 8
    onward (`centre_live_state`, `procurement_records`/`payment_records`,
    `audit_events`, views, RPCs, realtime, the expiry sweep, seed data)
    deliberately excluded.
  - **Real contradiction found in `docs/SECURITY.md` §3 and resolved
    conservatively, not silently**: the per-table matrix's Centre Admin
    cell for both `centre_status` and `bookings` omits the "(via RPC)"
    qualifier that the Operator cell carries, which read in isolation
    could imply Centre Admin has a direct client write path. §RLS-2
    states plainly, with no role carve-out, that centre status change and
    every booking mutation are "never direct client table writes...
    regardless of policy." Resolution: **zero INSERT/UPDATE/DELETE
    policies on either table, for any role** — reads only until
    `rpc_set_centre_status`/`rpc_create_booking`/`rpc_check_in`/
    `rpc_call_next_farmer` etc. ship in a later migration. Strictly the
    safer reading either way; documented in the migration file itself.
  - **Active-booking invariant and `request_id` idempotency shipped as
    schema objects in this migration**, per instruction ("from the
    beginning," not deferred): the partial unique index on
    `bookings(farmer_id)` over the four active statuses, and
    `request_id uuid unique`. Both are inert right now — nobody can
    insert a booking at all yet, since there is no INSERT policy — so
    this is not the C-9 lockout risk the invariant+sweep coupling
    guards against; that risk only exists once `rpc_create_booking`
    exists, at which point `rpc_expire_stale_bookings` must ship in the
    same migration as it (both are §18 row-12/14 objects, correctly
    deferred together).
  - `EXPIRED` added to `booking_status`; the sweep mechanism itself
    (`rpc_expire_stale_bookings`) is not built — tracked, not silently
    dropped.
  - Status/timestamp coherence and the slot/service_date match are
    enforced by two new triggers on `bookings`
    (`enforce_booking_status_coherence`, `enforce_booking_service_date`),
    per `docs/DATABASE.md` §7.2. `centre_status_events` is written
    exclusively by a trigger on `centre_status`
    (`record_centre_status_event`), append-only, per §5.2.
  - **Anon-execute hardening finding from the Migration 1 reconciliation
    remediated in this migration**: `revoke execute ... from anon` added
    for `auth_role()`/`auth_is_master_admin()`/`auth_centre_ids()`, as a
    new additive statement — Migration 1's file was not touched, edited,
    or rerun. Verified live: `has_function_privilege('anon', ...)` now
    `false` for all three.
  - **Minor doc-drift fixed in passing**: `docs/BUSINESS_LOGIC.md`'s
    three-state-machine table still read `BOOKED → CHECKED_IN → ...` and
    omitted `EXPIRED`, predating the Phase 3A.1 `CONFIRMED` rename and the
    `EXPIRED` addition that the same document's own "Queue — state
    transitions" section (a few hundred lines earlier, and authoritative)
    already reflects. Corrected to match. Also noted, not touched:
    `docs/ARCHITECTURE.md` line ~64 still lists the pre-3A.1 four-table
    realtime publication (`centre_status`, `centre_queue_state`,
    `bookings`, `procurement_records`) instead of the locked two-table
    surface (`centre_live_state`, `bookings`) — realtime is out of scope
    until row 13, so left for whichever migration actually touches
    realtime to correct.
  - **Adversarial security tests run live against the linked database**,
    with disposable fixtures (2 test centres, 6 test profiles across all
    four roles, 1 booking) created and then fully deleted afterward —
    verified empty before finishing. All of: cross-farmer booking read
    denial, cross-centre operator read denial, Centre Admin's
    centre-wide (vs Operator's own-row-only) `centre_assignments` read
    scope, direct booking INSERT (RLS violation), direct booking status
    UPDATE / direct `centre_status` UPDATE (both true no-ops — zero rows
    affected, confirmed via `RETURNING` and a fresh read, not just "no
    error"), `profiles.role` self-promotion (blocked at the grant layer,
    same as Migration 1), the active-booking partial unique index, the
    `request_id` unique constraint, a farmer regaining an active slot
    after their booking goes terminal (no permanent lockout), both new
    trigger functions rejecting direct invocation
    (`record_centre_status_event`, `enforce_booking_service_date`,
    `enforce_booking_status_coherence`), the status/timestamp coherence
    check, and the slot/service_date match check — all passed as
    designed. The `EXPIRED` sweep itself is **NOT VERIFIED** — no RPC
    exists yet to test; reported as such, not asserted PASS.
  - `tsc --noEmit`, `next lint`, `next build` all re-run clean; all 19
    routes still statically prerender. No application file touched.
- **Phase 3B — Migration 1 (schema foundation):**
  - Supabase project `dzqddefcvnelamrfbfvo` confirmed already linked; `public`
    schema and migration history confirmed empty before writing any SQL
    (`supabase migration list`, `supabase db query` against
    `information_schema.tables`) — no blind SQL, no `db reset` used.
  - One migration,
    `supabase/migrations/20260904092326_schema_foundation.sql`, implementing
    exactly `docs/DATABASE.md` §18 steps 1/3/4/6: `user_role` and
    `account_status` enums (the only two enums a Migration-1 table needs),
    `profiles` + the `auth.users` provisioning trigger, the three
    `SECURITY DEFINER` scope helpers (`auth_role`, `auth_is_master_admin`,
    `auth_centre_ids`), `commodities`, `procurement_centres`,
    `centre_commodities`, `centre_assignments`, `centre_operating_days`,
    `slots` — columns, constraints, indexes and RLS policies exactly as
    specified per table in `docs/DATABASE.md` §§3-4 and
    `docs/SECURITY.md` §3. Deliberately excludes `centre_status`/
    `centre_status_events` (§5 — a later migration, not listed in the
    approved Migration-1 scope), bookings, `centre_live_state`,
    procurement/payment records, `audit_events`, views, RPCs, realtime
    publication and seed data.
  - RLS enabled and policies attached in the same migration as every
    table's creation, per §18's explicit deviation from the brief's later
    RLS step — no table existed unprotected at any commit.
  - **RLS-1 (`profiles.role` self-promotion) implemented as all three
    documented layers**: column-level grants (`authenticated` can UPDATE
    only `full_name`/`phone`/`village_text` — verified live: a direct
    `UPDATE profiles SET role = 'MASTER_ADMIN'` as `authenticated` fails
    with `permission denied for table profiles`, independent of any row
    existing), `WITH CHECK` pinning row ownership, and a backstop
    `BEFORE UPDATE` trigger rejecting any `role`/`account_status` change
    unless `auth_is_master_admin()`.
  - **Documented dependency, not a workaround**: because Postgres column
    grants are per database role (`authenticated`) and cannot distinguish
    "Master Admin" from "Farmer", the Layer-1 grant currently blocks
    *everyone*, including a future Master Admin, from changing
    `role`/`account_status` via a direct client UPDATE. Per
    `docs/SECURITY.md` §5, account/role administration is a Master-Admin-
    only **RPC** surface, not a direct table write — that RPC is
    `docs/DATABASE.md` §18 step 12, out of Migration 1's scope. Until it
    ships, role/status is unchangeable by any client — the safe state, not
    an insecure stopgap. Recorded here so it isn't rediscovered as a
    surprise.
  - **`role` is never taken from `auth.users` signup metadata** in
    `handle_new_user()` — always starts at the column default (`FARMER`),
    even though the application auth flow that would pass metadata isn't
    built yet. Closes a self-promotion-at-signup vector that
    `docs/SECURITY.md` §8 doesn't separately enumerate but which the same
    RLS-1 reasoning applies to.
  - **One interpretation judgment call, flagged rather than silent**:
    `docs/SECURITY.md` §3's matrix cell for `profiles` lists explicit W
    only for Farmer ("R/W own row") and Master Admin ("W role/status"),
    with Operator/Centre Admin showing R only. Implemented self-service
    update of `full_name`/`phone`/`village_text` for **any** authenticated
    user's own row (not Farmer-only), matching RLS-1's own framing ("a
    user", not "a farmer") and `village_text`'s documented "nullable for
    staff" note. The security-relevant part (role/status immutability) is
    identical either way and fully covered by the three RLS-1 layers.
  - Verified live against the linked project (not asserted): all 7 tables
    exist with `relrowsecurity = true`; 25 policies present, matching the
    per-table matrix exactly (`profiles` correctly has no INSERT/DELETE
    policy — rows are created only by the owner-run auth trigger and are
    never deleted, per "suspension over deletion"); every FK, CHECK,
    UNIQUE and the two documented partial indexes on `centre_assignments`
    exist as specified; both enums have exactly the documented labels; all
    6 functions exist with the correct `SECURITY DEFINER`/volatility
    flags; no `booking`/`audit`/`payment`/`centre_status`/`live_state`/
    `procurement_record`/`notification`-named table exists anywhere in
    `public` (confirms no out-of-scope object leaked in).
  - `tsc --noEmit`, `next lint`, `next build` all re-run and passed clean
    (expected — no application source file touched this phase); all 19
    routes still statically prerender.
  - `git status` before starting: clean, `master` branch, nothing to
    commit. No `.env*`, no unrelated application file touched — only the
    new migration file (plus this doc).
  - No local GitHub remote existed. Created `loltest-svg/kisansetu-sih2026`
    (private) and pushed `master`, per explicit instruction in the same
    message that requested this migration.
- Phase 0 reconnaissance (repository inspection, UX4G findings, architecture
  proposal, screen map, entity map, allocation-engine input/output sketch,
  MVP scope, risks)
- Phase 0.5 project constitution (`CLAUDE.md` + 9 files under `/docs`, git
  initialized, checkpoint committed)
- Phase 1 Next.js + UX4G + Tailwind(layout-only) + PWA foundation (see
  below for full detail; unchanged this phase, still verified working)
- UX4G `SKILL.md` read completely (seven times — Phase 0, 0.5, 1, 2A, 2B,
  2C, 2D)
- UX4G `Design.md` read completely (seven times — Phase 0, 0.5, 1, 2A, 2B,
  2C, 2D)
- **Phase 3A.1 — Design amendments after architecture review (DESIGN
  ONLY):**
  - Again, **nothing was built** — five documents changed, application
    byte-identical, no dependency, no SQL, no migration, no connection.
  - **`OQ-1` capacity units — LOCKED.** Two independent dimensions that
    never share vocabulary: farmer-processing capacity (farmers) and
    procurement-quantity capacity (quintals). Columns now carry their unit
    in the name (`daily_farmer_capacity`,
    `daily_quantity_capacity_quintal`, `slots.farmer_capacity`). Quantity
    is day-level only — it is a whole-day resource, so a per-slot
    equivalent would add a dimension nothing uses. Documented per-consumer:
    which screens, which role, which allocation input
    (`docs/DATABASE.md` §4.3, §4.3.1).
  - Refinement that fell out of the split: **committed vs procured
    quantity** are different numbers and both are needed — admission must
    use the farmer's *declared* quantity because it is all that exists at
    booking time, reporting must use the *accepted* weight because that is
    what happened.
  - **`OQ-6` one active booking — LOCKED.** Global, not per-date; enforced
    by a partial unique index over the active status set, which is atomic
    by construction where a check-then-insert is not.
  - **Two consequences of that invariant that had to be designed, not
    assumed:**
    - `EXPIRED` status plus a scheduled sweep, because a Postgres partial
      index predicate must be `IMMUTABLE` — a date-based predicate is
      rejected outright, so the invariant can only be expressed in
      statuses, so something must move abandoned bookings out of the
      active set. Without it, a farmer who books once and never arrives is
      **locked out permanently** (logged as consistency finding C-9).
    - `bookings.request_id` idempotency key, because a retried booking
      after a network timeout would otherwise hit the invariant and be
      told "you already have a booking" — true, and the wrong answer.
  - **`FULL` — precedence defined and justified**, not just asserted:
    `CLOSED > PAUSED > FULL > DELAYED > OPEN`, with all eight edge cases
    worked through (`docs/DATABASE.md` §6.1–6.2). `FULL` now derives from
    **farmer capacity only** per the locked decision; quantity exhaustion
    is a warning, not a booking block (`OQ-13`). `FULL` is described as an
    *availability state* rather than a member of the manual status enum —
    the two live in different layers.
  - **Farmer queue realtime — five approaches compared, one recommended.**
    A per-booking anonymised projection was rejected for O(n) write
    amplification on every call-next; RPC-only was rejected as pull-only;
    client-side sequence arithmetic was rejected because it is exact only
    while every departure is ahead of the caller and **fails silently**
    when a farmer behind them cancels. Recommendation: aggregate row as the
    realtime signal, `SECURITY DEFINER` RPC as the authoritative
    per-farmer answer (`docs/ARCHITECTURE.md`).
  - `centre_queue_state` renamed **`centre_live_state`** and widened to
    carry capacity headroom, `effective_status`, `delay_reason` and a
    monotonic `version`, so one subscription covers all ambient centre
    state and the §6 precedence logic is encoded once, server-side, rather
    than three times in three UIs.
  - **Realtime surface reduced from four published tables to two**
    (`centre_live_state`, `bookings`). `centre_status` and
    `procurement_records` dropped — their changes already reach subscribers
    via the aggregate or a refetch, and every published table is another
    place a policy mistake becomes a live leak.
  - **Cache for display, recompute for decisions** adopted as an explicit
    rule, so the one deliberate denormalisation cannot become a
    correctness dependency: admission recomputes capacity inside the
    locked transaction and never trusts the cached figure.
  - Queue position: documented *where* it runs, *what rows* it may see,
    *what* it returns, and how RLS stays enforced — plus an anti-oracle
    requirement that "not your booking" and "no such booking" return
    identical errors, or the function becomes a probe for valid IDs.
  - Status edge cases specified for Phase 3B: closed-with-bookings
    (bookings are **not** auto-cancelled — the farmer may already have
    travelled), paused-with-queue (check-in still allowed, calling blocked),
    full-with-bookings (existing commitments never invalidated),
    cancellation freeing capacity, reopening, and stale derived
    availability.
  - Adversarial review extended: **S-12** (`SECURITY DEFINER` oracle),
    **S-13** (aggregate scope creep), **C-9** (permanent lockout), **C-10**
    (retry vs duplicate), **C-11** (reassignment window). Verification plan
    gained matching tests.
- **Phase 3A — Backend architecture & data design (DESIGN ONLY):**
  - **Nothing was built.** No Supabase project, no dependency, no SQL, no
    migration, no policy, no connection, no credential. The only changes
    are to five documents; the application is byte-identical.
  - Grounded in the *implemented* UI, not just the earlier drafts — all
    three `lib/demo/*.ts` modules, all 15 route files and every
    role component tree were re-read, because three phases of screens are
    now the concrete statement of what the backend must produce.
  - `docs/DATABASE.md` **rewritten** as the full logical design: 16
    tables/entities, enum-vs-table-vs-derived reasoning, constraints,
    indexes, two views, ten RPC functions, race-condition analysis, a
    complete UI→data mapping for all 15 routes, a 14-step migration order,
    and 12 numbered open questions.
  - `docs/SECURITY.md` **rewritten** with the RLS design: per-table
    role/scope matrix, the `SECURITY DEFINER` scope-helper pattern, the
    RPC-only write surface, and an adversarial review (11 security, 8
    consistency, 5 scalability findings, each rated with a mitigation).
  - `docs/ARCHITECTURE.md` rewritten: client/server/database responsibility
    split, realtime strategy, notification outbox, and an explicit
    statement that everything below the UI is design.
  - `docs/BUSINESS_LOGIC.md` extended: three resolved decisions (below)
    plus the three-state-machine model and minimal quality/payment records.
  - **Five previously-open questions resolved with reasoning**:
    1. `FULL` is **derived, not operator-set** — it is a capacity
       consequence, not an operator intent, and allowing both creates two
       contradicting sources of truth for one fact. The approved
       five-value vocabulary is preserved via a derived
       `effective_status`; no UI change needed.
    2. `CHECKED_IN` vs `WAITING` are **the same state** — resolved by
       collapsing `queue_entries` into `bookings`.
    3. `queue_entries` is **removed** — it would have been 1:1 with
       `bookings`, carried a duplicate status enum for the same fact, and
       been mutated by the same actions. Recorded the two conditions
       (re-queue after no-show, walk-ins) that would justify reinstating it.
    4. Operator↔centre assignment uses a **`centre_assignments` join
       table**, not `profiles.centre_id` — a nullable FK cannot answer
       "who had access to this centre, and when", which is exactly what
       the approved audit requirement asks.
    5. Processing **stage is derived from timestamps**, not stored — a
       stage column can contradict its own evidence.
  - **Contradiction found in the implemented UI and escalated, not
    patched over** (`OQ-1`): capacity is rendered in *quintals*
    (`todaysCapacityQuintal`, `bookedQuintal`) while processing rate,
    waiting counts and "24 slots available today" are in *farmers*. The
    numbers only agree because demo fixtures were carried from a
    farmer-count model into quintal-labelled fields. These are two real
    and independent constraints (throughput vs volume), so the design
    models both (`slot_capacity` + `quantity_capacity_quintal`) — but the
    UI labels need a corresponding correction in 3B, and the underlying
    product question needs user confirmation.
  - **Concurrency requirement reconciled with the UI**: "multiple
    operators at one centre simultaneously" conflicts with a naive
    one-in-progress-per-centre constraint. Resolved per-operator (a centre
    may have several farmers in progress; each operator at most one), which
    also makes the existing single "Current Processing" card correct as
    *this operator's* farmer, with no UI change.
  - **Two silent-wrong-answer traps identified** that would not surface as
    errors: (a) queue position computed by a window function inside an
    RLS-protected view returns 1 for every farmer, because RLS filters
    rows before the window sees them — position must be a `SECURITY
    DEFINER` function; (b) a farmer subscribed only to their own booking
    receives no realtime event when the farmer *ahead* of them is called,
    because that row is correctly invisible — hence the one deliberate
    denormalisation, a non-personal `centre_queue_state` aggregate.
  - **Deviated from the brief's suggested migration order, with reason**:
    RLS is not a late step. Policies ship in the same migration as their
    table, because a table that exists unprotected for one commit is a
    table that can leak in that commit. Realtime genuinely does go last.
  - Validation: `tsc --noEmit`, `next lint`, `next build` all clean and all
    19 routes still prerender — expected, since no source file changed;
    run to prove it rather than assert it. `git diff --stat` confirms
    documentation-only changes.
- **Phase 2D — Master Admin Dashboard, UI only:**
  - All 4 existing Admin routes now render real content, replacing every
    Phase 2A `ComingSoon`: `/admin` (system overview), `/admin/centres`
    (centre management), `/admin/capacity` (capacity & congestion),
    `/admin/activity` (system activity). No route restructure needed —
    the Phase 2A paths already matched this phase's instructions exactly.
  - New components under `components/admin/`: `RoleSummary`,
    `AttentionPanel`, `CentreOverviewCard`, `CentreCongestionCard`,
    `CentreManagementCard`, `ActivityFeed`, `ActivityItem`. Reused
    `components/shared/MetricCard` (Phase 2C) for every KPI card rather
    than adding a redundant `SystemMetricCard` — the phase instructions'
    suggested component list included one, but it would have duplicated
    an existing generic component for no reason.
  - **Deliberately not a re-skinned Operator dashboard**: no single-centre
    queue, no per-farmer processing card, no operator-style status
    controls. `/admin` shows cross-centre aggregates (`MetricCard` row),
    a system-wide centre grid (`CentreOverviewCard`, all 6 demo centres),
    a status-distribution breakdown, a system-wide capacity bar, the
    exception list (`AttentionPanel`), a role-hierarchy acknowledgment
    (`RoleSummary`), and a activity-feed preview — matching the instructed
    "system-wide → monitoring-focused → exception-oriented" character
    against Operator's "dense → operational → queue-focused" and Farmer's
    "simple → personal → action-oriented".
  - **Role hierarchy made explicit in the UI, not just in code comments**:
    `RoleSummary` on `/admin` states plainly that the Master Admin
    oversees every Centre Admin and Operator, with live counts (derived
    from `demoCentres`, not separately hardcoded); every
    `CentreManagementCard` on `/admin/centres` shows that centre's
    assigned Centre Admin and operator count. No user-management routes
    or CRUD were built — exactly as instructed, this is acknowledgment,
    not administration.
  - **Centre management actions are honestly non-functional**:
    "Create centre" and every "Edit centre details" button use the native
    `disabled` attribute with an explanatory `title` (not a fake enabled
    control that silently does nothing, and not `aria-disabled` paired
    with a no-op click handler, which was the first draft and is a worse
    pattern — see UX4G findings below). "Deactivate"/"Activate centre"
    toggles *local component state only* inside `CentreManagementCard`
    (`useState`, resets on reload) with an explicit "(demo)" tag when
    deactivated — no API call, no persistence claim, no fake "saved"
    message anywhere on any of the 4 routes (checked directly, see
    Validation below).
  - **Demo-data strategy**: `lib/demo/adminDashboard.ts`, same pattern as
    Phase 2B/2C's modules. Six demo centres spanning every
    `CentreStatusValue` (2× OPEN, 1× DELAYED, 1× PAUSED, 1× FULL, 1×
    CLOSED) so every UI state actually has an example to render. A small
    pure `getAttentionState()` function classifies each centre into
    `NORMAL | NEAR_CAPACITY | CONGESTED | DELAYED | PAUSED | FULL |
    CLOSED` from its operator-reported `status` plus its capacity numbers
    — explicitly documented as presentation-only UI classification, not
    the Smart Allocation Engine and not a real congestion calculation
    (docs/BUSINESS_LOGIC.md's "no automatic failure detection" rule
    extended to this derived label too: status always wins over the
    capacity heuristic, so an operator-reported DELAYED centre is never
    re-labelled "Congested"). All system-wide aggregates
    (`systemOverview`) are getters derived from `demoCentres`, never
    separately hardcoded, so they can't silently drift out of sync with
    the per-centre list — same rule already applied to
    `demoCapacity` in Phase 2B.
  - **Found and fixed a data-modeling issue before shipping**: the first
    draft of `demoCentres` had every non-CLOSED centre reading as
    "requiring attention" (one centre's booked quantity happened to sit
    right at the 75% "Near Capacity" threshold), making `AttentionPanel`
    show literally everything and stop being a useful filter. Lowered
    that one centre's booked quantity so the panel now genuinely
    demonstrates "quickly identify healthy vs. attention-needing centres"
    — verified by re-rendering and re-inspecting the HTML, not just
    re-reading the code.
  - `/admin/capacity` sorts centres by utilisation (most congested first)
    so the "where is capacity becoming a bottleneck" question the phase
    poses is answered by the page's own ordering, not left to the reader
    to scan for.
  - **UX4G findings**: reused the Phase 2B-verified linear Progress
    Indicator pattern (`ux4g-progress-bar`/`-fill` driven by
    `--ux4g-progress-value`, not the README's plain `width` style) for
    both the system-wide capacity bar on `/admin` and each centre's bar
    on `/admin/capacity` — not factored into a shared component this
    phase, to avoid touching the Phase 2B file that already has its own
    copy. No new UX4G component gaps discovered this phase beyond what
    Phase 2B/2C already found and documented (progress-circle, Input
    wrapper, `ux4g-select`/Date Picker).
  - **Accessibility fix applied before commit**: `CentreManagementCard`'s
    "Edit centre details" button initially used `aria-disabled="true"`
    with an `onClick` that called `preventDefault()` — a half-implemented
    pattern (still focusable/clickable, screen readers announce
    "disabled" but the click handler does nothing meaningful). Replaced
    with the native `disabled` attribute, which is the simpler, more
    standard, more correctly-accessible choice for a control that
    genuinely has nothing to do yet.
  - Validated: `tsc --noEmit`, `next lint`, `next build` all clean (twice
    — once before, once after the attention-panel data fix); all 19
    routes still statically prerender.
  - Dev-server HTML inspection of all 4 Admin routes: exactly one `<h1>`
    each; zero `<table>` elements; every `<button>` has an explicit
    `type`; the Admin shell renders `<aside>` (persistent sidebar) and a
    "Menu" drawer-trigger button, never `.bottom-nav` (grepped directly —
    absent everywhere in the Admin tree, confirming Farmer's BottomNav
    was not accidentally reused); active navigation correct on `/admin`
    ("Overview") and `/admin/centres` ("Centres"); the "Create centre"
    and all six "Edit centre details" buttons render with the native
    `disabled` attribute and explanatory `title`; no "saved successfully"
    or equivalent text anywhere across all 4 routes; `AttentionPanel`
    correctly lists 5 of 6 centres after the data fix, excluding the one
    healthy (NORMAL) centre.
  - Confirmed the Phase 1 smoke test (`/`), the Operator dashboard
    (`/operator`), and all 5 Farmer routes still return HTTP 200 and were
    not modified by this phase.
  - **Not literally screenshotted** at 1440/1280/1024/390/430px — same
    tooling limitation as Phase 2B/2C (no browser/screenshot tool
    available in this environment). Verified instead via rendered-HTML
    inspection and reasoning from the actual CSS rules used (Card grids
    via `grid-cols-*` only at the `lg:` breakpoint, flex-wrap throughout,
    no fixed pixel widths introduced). Flagged here, not presented as
    visually confirmed — this is now the third phase in a row with this
    gap, and remains the single most valuable follow-up before any of
    Phase 2B–2D is called demo-ready rather than build-clean.
- **Phase 2C — Farmer Dashboard & Farmer Experience, UI only:**
  - **Route restructure** (per explicit Phase 2C instructions, not a
    silent change): `/farmer/new-booking` → `/farmer/bookings/new`
    (nested under My Bookings) and `/farmer/status` → `/farmer/centre`
    (relabelled "My Centre"). Done as real `git mv`s, not
    delete+recreate, so history is preserved. `lib/navigation.ts` and
    `docs/UI_SPEC.md`'s route table updated in the same change; grepped
    the whole repo afterward for the old paths to confirm nothing still
    pointed at them.
  - All 5 Farmer routes now render real content: `/farmer` (dashboard),
    `/farmer/bookings` (booking history), `/farmer/bookings/new` (booking
    form), `/farmer/queue` (live queue view), `/farmer/centre` (centre
    details) — replacing every Phase 2A `ComingSoon` on the Farmer tree.
  - New components under `components/farmer/`: `NextStepCard`,
    `FarmerCentreStatusCard`, `QuickActions`, `PaymentStatusCard`,
    `RecentNotifications`, `BookingCard`, `BookingList`,
    `QueueStatusCard`, `CentreDetailsCard`, `BookingForm`.
  - **Two components promoted to `components/shared/`** because they
    turned out to be genuinely role-agnostic, not Operator-specific:
    `WorkflowStepper` (moved from `components/operator/`, Phase 2B) is
    now used by both the Operator dashboard's Current Processing card and
    the Farmer dashboard's Procurement Progress section, with its prop
    type changed from importing `ProcessingStage` out of
    `lib/demo/operatorDashboard.ts` to a structural local `WorkflowStage`
    type so neither role's demo module depends on the other's. Likewise
    `OperationalMetricCard` moved and was renamed `MetricCard`, now used
    by Operator's KPI row and Farmer's "Farmers ahead"/"Estimated wait"
    stats. `app/operator/page.tsx`'s two import lines and JSX tag names
    were updated to match — the only Phase 2B file touched this phase,
    and only for this reason.
  - **Demo-data strategy**: `lib/demo/farmerDashboard.ts`, same pattern as
    `lib/demo/operatorDashboard.ts` (Phase 2B) — one file, file-level
    "PRESENTATION-ONLY DEMO DATA" banner comment, types shaped to match
    docs/DATABASE.md's proposed entities. Every Farmer page carries a
    visible "Demo data — not connected to a backend" tag (dashboard,
    queue) or an equivalent inline note (QueueStatusCard's own footnote,
    the New Booking form's info alert) — not just a code comment.
  - **New Booking form is honest about being non-functional**: submitting
    shows an explicit "This is a demo — no booking was created" message
    (`ux4g-alert-success`) instead of a fake confirmation screen. An info
    alert above the form states plainly that a real system would
    recommend a centre/slot automatically via the Smart Allocation Engine
    (not built here) rather than the farmer picking one manually — form
    fields chosen specifically to match Business Logic's documented
    allocation-engine inputs (centre, date, slot, crop, quantity) so a
    real implementation could sit behind the same fields later.
  - Quality Check is described on the dashboard as "assessed by centre
    staff when you arrive — this screen only shows where you are in the
    process, it does not decide quality itself" — directly satisfies the
    phase's explicit requirement that the app never implies it makes the
    final quality decision (docs/BUSINESS_LOGIC.md's existing advisory-
    only rule, now also stated in-product, not just in docs).
  - Payment status card shows status only (`PENDING`/`PROCESSED`) with an
    explicit "payment itself is handled outside this application" line —
    no amount, no bank details, no "pay now" action anywhere.
  - Live Queue (`/farmer/queue`) shows only the farmer's own token,
    position, and aggregate counts (farmers ahead, estimated wait,
    processing rate, which token is currently being processed) — never
    other farmers' names or tokens, per docs/SECURITY.md.
  - **UX4G finding, significant**: the README's Input example
    (`<div class="ux4g-input-container ..."><label/><input/></div>`) is
    missing a wrapper the *compiled* CSS actually requires. Confirmed by
    reading the compiled CSS directly:
    `.ux4g-input-md .ux4g-input{height:2.5rem}` and
    `.ux4g-input-error .ux4g-input{border-color:...}` both target a
    `.ux4g-input` element that the README's flat example never includes,
    and the actual field itself needs class `ux4g-input-input` (not a
    bare `<input>`). Every new field in `BookingForm.tsx` uses the full
    verified structure (`ux4g-input-container` > `.ux4g-input` >
    `ux4g-input-input`). **Not fixed this phase**: the Phase 1 smoke-test
    input and any other pre-2C input predate this discovery and still use
    the flatter, likely under-styled structure — flagged as a known
    limitation below rather than silently left broken or silently patched
    outside this phase's stated scope.
  - **Second UX4G finding**: `.ux4g-select` and `.ux4g-dropdown` both
    exist as more elaborate custom widgets in the compiled CSS (search/
    filter logic, `data-ux-*` attributes, an `.ux4g-select-caret` element)
    with no README documentation at all for `.ux4g-select` and only a
    trivial example for Dropdown. Rather than guess at an undocumented
    contract (same reasoning as Phase 2B's `ux4g-progress-circle`
    decision), the booking form's three selects use native `<select>`
    elements inside the verified `ux4g-input-container`/`.ux4g-input`
    wrapper instead — fully accessible, fully functional, zero guessed
    markup. Same reasoning for "Preferred date": Date Picker's
    `ux4g-date-picker-input` is documented `readonly`, implying it needs
    JS to become usable, but Date Picker is not in the runtime's
    documented Behaviors Provided list (Phase 1) — so a readonly text
    field styled that way would be inert. Used a native
    `<input type="date">` instead, same wrapper.
  - Icons throughout (`QuickActions`, BottomNav reused unchanged) use only
    the 5 ligature names already verified via fontTools in the Phase 2A
    mobile-nav extension (`home`, `event`, `receipt_long`, `queue`,
    `info`) — no new icon names introduced.
  - Farmer language kept plain throughout, matching the phase's explicit
    examples: "Farmers ahead" / "Estimated wait" / "Centre status", never
    the technical alternatives the instructions warned against.
  - Validated: `tsc --noEmit`, `next lint`, `next build` all clean (one
    stale-`.next`-cache TypeScript error from the route rename, resolved
    by deleting the git-ignored `.next/` directory and rebuilding — not a
    real code problem). All 19 routes still statically prerender, now
    listing `/farmer/bookings/new` and `/farmer/centre` instead of the old
    paths.
  - Dev-server HTML inspection of all 5 Farmer routes: exactly one `<h1>`
    each; zero `<table>` elements anywhere; every `<button>` has an
    explicit `type`; all 5 booking-form fields have correct `label`/`for`
    association; the `.ux4g-input`/`ux4g-input-input` structure renders as
    written; `/farmer/bookings/new` correctly shows "New Booking" active
    in navigation, not "My Bookings" (confirms the shared
    `getActiveHref` "longest match wins" rule handles the new nested
    route without modification); BottomNav's landmark stays uniquely
    labelled (`"Primary (mobile)"`, distinct from Sidebar's `"Primary"` —
    unchanged from the Phase 2A extension, re-verified here); all 7
    workflow stage labels render twice each on the dashboard (desktop +
    mobile dual-render, same verified pattern as Operator's).
  - Confirmed Phase 1's smoke test (`/`), Phase 2B's `/operator`
    dashboard, and the Admin shell (`/admin`) all still return HTTP 200
    and render their expected content, unmodified by this phase (aside
    from the one documented `WorkflowStepper`/`MetricCard` import-path
    change in `app/operator/page.tsx`).
  - **Not literally screenshotted** at 1440/1280/1024/390/430px — same
    tooling limitation as Phase 2B (no browser/screenshot tool available
    in this environment). Verified instead via rendered-HTML inspection
    and reasoning from the actual CSS rules used (flex-wrap throughout,
    `grid-cols-*` only via the `lg:` breakpoint, `pb-20 lg:pb-0` on
    `<main>` already proven in Phase 2A to clear BottomNav, no fixed
    pixel widths introduced anywhere in this phase's new code). Flagged
    here rather than presented as visually confirmed.
- **Phase 2B — Operator / Centre Operations Dashboard, UI only:**
  - `/operator` now renders the real dashboard (`app/operator/page.tsx`),
    replacing the Phase 2A `ComingSoon` placeholder. Everything else in
    the shell (`AppShell`, `Header`, `Sidebar`, `NavDrawer`, `BottomNav`,
    `PageContainer`, `PageHeader`) is untouched.
  - New reusable dashboard components under `components/operator/`:
    `CentreStatusCard`, `OperationalMetricCard`, `CurrentProcessingCard`,
    `WorkflowStepper`, `LiveQueue`, `QueueItemRow`, `CapacityCard`,
    `UpcomingBookings`, `AlertsPanel`, `DailySummary` — each renders
    props/data only, no business logic and no data fetching inside them
  - **Demo-data strategy**: all presentation data centralized in one
    clearly named, clearly documented module, `lib/demo/operatorDashboard.ts`
    (file-level comment block: "PRESENTATION-ONLY DEMO DATA — NOT BACKEND
    DATA"). Typed to match `docs/DATABASE.md`'s proposed entity shapes
    (`queue_entries`, `bookings`, `centre_status`) so a real Supabase query
    result of the same shape can replace it later without a component
    redesign. The page itself also carries a persistent, visible
    `"Demo data — not connected to a backend"` tag next to the title — not
    just a code comment
  - **Interactivity is real but local-only**: the page (`app/operator/page.tsx`)
    is a Client Component holding `useState` for centre status, delay
    reason, queue, current processing stage, and upcoming bookings.
    "Pause/Resume Centre", "Report Delay" (via a Modal + Textarea, reusing
    the Phase 1-verified Modal runtime pattern), "Call Next Farmer",
    "Complete Processing", and "Check In" all mutate this local state —
    nothing calls an API, nothing claims Supabase/Realtime/persistence.
    State resets on reload. No fake API calls, no fake auth, no fake
    realtime subscription anywhere in this phase's code
  - Centre status control models the full `OPEN | DELAYED | PAUSED | FULL
    | CLOSED` enum from `docs/BUSINESS_LOGIC.md`; "Report Delay" is the
    only path to `DELAYED` (with a reason), matching the doc's
    operator-provided/system-derived split — no automatic status changes
  - Workflow display uses the fuller 7-stage journey the phase instructions
    specified (Registration → Slot Booking → Check-in → Quality Check →
    Weighment → Procurement → Payment) via UX4G's Stepper component,
    reconciled with `docs/BUSINESS_LOGIC.md`'s narrower 5-stage
    operator-actionable subset — see the note added to that doc
  - **UX4G components used, each verified before use** (README text and/or
    grepped compiled CSS, not assumed): Card, Tag, List (queue and
    bookings — chosen over Table specifically to avoid the
    horizontal-overflow risk a wide table carries on a phone), Alert,
    Stepper, Progress Indicator (linear `ux4g-progress-bar`, not the
    circular variant — see below), Button, Modal, Textarea, plus the full
    typography scale and layout/flex/gap utilities already established in
    Phase 2A
  - **Identified UX4G gap/limitation**: `ux4g-progress-circle` (a
    candidate for the capacity utilisation indicator, and something
    `docs/UI_SPEC.md` had flagged `TODO — VERIFY`) exists, but its real
    DOM contract in the compiled CSS
    (`[data-ux-progress-circle]`/`-indicator`/`-ring`/`-value-wrap`, a
    conic-gradient mask driven by several CSS custom properties) is
    materially more complex than the two-line example the README shows.
    Rather than guess at an undocumented structure, `CapacityCard` uses
    the fully-documented linear `ux4g-progress-bar` instead — also a
    legitimate "Progress Indicator" per Design.md §12, just the safer of
    the two verified options
  - **Second finding**: the linear progress bar's fill width is actually
    driven by a `--ux4g-progress-value` CSS custom property in the
    compiled CSS (`inline-size: max(calc(var(--ux4g-progress-value)*1%),1px)`),
    not the plain `style="width:60%"` the README's simplified example
    shows. Confirmed by reading the compiled rule directly and used the
    custom-property form, not the README's literal sample
  - **Touch-target fix applied before commit**: initial action buttons used
    `ux4g-btn-sm`/`-xs` (32px/24px min-height, both under the 44px minimum
    — confirmed by reading the compiled CSS). All nine operator action/
    link buttons were upgraded to `ux4g-btn-md` (48px, confirmed via the
    `:where()`-wrapped base rule vs. `.ux4g-btn-md`'s own more specific
    `min-height:var(--ux4g-size-48)` rule) before validation passed
  - Non-colour-only status signalling carried through consistently: Tag
    text itself always spells out the state (OPEN/DELAYED/PROCESSING/etc,
    never colour alone); the active queue row also gets a font-weight
    change, matching the same pattern established for nav active-state in
    Phase 2A
  - Personal information: farmer phone numbers stay masked
    (`98XXXXXX21`-style) everywhere, including in the one locally-synthesized
    "checked in" queue entry the demo interaction creates
  - Validated: `tsc --noEmit` clean, `next lint` clean, `next build`
    succeeds — same 19 routes, all statically prerendered (this page is a
    Client Component but still prerenders; interactivity hydrates
    client-side)
  - Dev-server HTML inspection of `/operator`: exactly one `<h1>`;
    landmarks intact and unchanged from Phase 2A; the "Demo data" tag is
    present in the rendered HTML (not just in code); all card sections
    present; zero `<table>` elements; every `<button>` has an explicit
    `type`; the initial `Call Next Farmer` button renders `disabled`
    (correct — a farmer is already PROCESSING in the seed data); the
    linear progress bar's `--ux4g-progress-value:76` custom property is
    present and matches the seed data's 76% utilisation; all 7 workflow
    stage labels render twice each (the verified desktop-horizontal +
    mobile-vertical dual-render pattern)
  - Confirmed the Phase 1 UX4G smoke test at `/` and the Farmer/Admin
    shells still return HTTP 200 and were not modified
  - **Not literally screenshotted** at the requested 1440/1280/1024/390/430
    widths — no browser/screenshot tool is available in this environment.
    Verified instead via rendered-HTML inspection plus reasoning from the
    actual CSS rules used (flex-wrap everywhere, `grid-cols-*` only via
    the `lg:` breakpoint, no fixed pixel widths introduced anywhere in the
    new code) — the same substitute verification approach already used
    for responsive claims in Phase 2A. Flagged here rather than silently
    presented as visually confirmed.
- **Phase 2A — reusable application UI shell:**
  - Shell components (`components/shell/`): `AppShell`, `Header`, `Sidebar`
    (persistent desktop nav, Operator/Admin), `NavDrawer` (mobile nav, all
    three roles; also Farmer's only nav surface at every width),
    `NavList` (shared nav-item rendering, the one Client Component in the
    shell — needs `usePathname` for active-item state), `PageContainer`,
    `PageHeader`, `ComingSoon` (placeholder for unbuilt screen content)
  - `lib/navigation.ts` — per-role nav item arrays (data only, no auth
    implied); documents the role-hierarchy decision (Admin tree = future
    Master Admin; Operator tree = shared "centre operations" pages a
    future Centre Admin is expected to reuse)
  - Route trees created: `app/farmer/*` (5 routes, `variant="simple"` — no
    persistent sidebar, drawer-nav at every width), `app/operator/*` (6
    routes, `variant="sidebar"`), `app/admin/*` (4 routes,
    `variant="sidebar"`) — 15 routes total, each rendering
    `PageHeader` + `ComingSoon` only; no fabricated metrics or sample data
    shaped like the future schema anywhere
  - Every route/layout is UI/navigation only — no authentication, no role
    enforcement, no Supabase, no database, no allocation or booking logic
  - UX4G classes used, all verified against the installed package's own
    README/compiled CSS (not the CDN docs, not assumed): `ux4g-navbar`
    family, `ux4g-list`/`ux4g-list-item`/`ux4g-list-item-row` (incl. the
    verified `.active` state, confirmed in compiled CSS before use),
    `ux4g-drawer` family (reusing the Phase 1-verified runtime pattern),
    `ux4g-btn` family, `ux4g-tag-*`, `ux4g-badge-dot-primary`,
    `ux4g-empty-state`/`ux4g-empty-state-content`, `ux4g-heading-*`/
    `ux4g-title-*`/`ux4g-body-*`/`ux4g-label-*` typography scale,
    `ux4g-container`/`ux4g-p-*`/`ux4g-gap-*`/`ux4g-d-flex`/`ux4g-flex-*`
    layout utilities
  - **Identified gap, filled rather than worked around silently**: no
    dedicated vertical/sidebar-nav component exists in Design.md §12's
    parity table. `List` is the closest verified building block and is
    used for both Sidebar and NavDrawer content, applied to real
    `next/link` `Link` elements (not the README's `<div>`/`<span>`
    example) for correct link semantics — recorded in
    `components/shell/NavList.tsx` and here, not just left implicit
  - **Second identified gap**: UX4G ships `.ux4g-sr-only` (permanently
    hidden) but no focus-visible companion for the standard skip-link
    pattern. Filled with one narrowly-scoped custom CSS rule
    (`app/globals.css` `.skip-link:focus`), every value a UX4G token, no
    hard-coded colour/spacing — documented inline per the custom-CSS
    policy
  - Tailwind used for exactly three structural purposes:
    `min-h-screen flex flex-col` (outer shell), `hidden lg:block` /
    `lg:hidden` (Sidebar/menu-button breakpoint switch — `lg` = 1024px,
    matching UX4G's own Tablet/Desktop cutoff in Design.md §8, not an
    arbitrary Tailwind number), and `lg:flex`/`flex-1` (sidebar+main
    column split). Nothing else — no Tailwind colour, spacing, radius or
    typography anywhere a UX4G class/token already covers it
  - Fixed a real bug found during validation: the naive "does the current
    path start with this nav item's href" check made a role's root
    Dashboard item match every one of its own sub-routes (`/operator/queue`
    starts with `/operator/`), so Dashboard showed active on every
    Operator/Admin sub-page alongside the real current item. Replaced with
    a "longest matching href wins" rule in `NavList` — generic, not a
    special case for root paths (verified via rendered HTML before and
    after the fix, see Last Verified)
  - Validated: `tsc --noEmit` clean, `next lint` clean, `next build`
    succeeds — all 19 routes (Phase 1's smoke test + 15 Phase 2A routes +
    `/_not-found`) statically prerendered, no hydration/SSR errors
  - Dev-server checks: every new route returns HTTP 200; rendered HTML has
    exactly one `<h1>` per page, distinct landmarks
    (`<header>`, two `<nav>` with different `aria-label`s, `<aside>` on
    sidebar variant, `<main id="main-content">`), the skip-link's
    `href="#main-content"` target exists, and every `<button>` has an
    explicit `type="button"`
  - Confirmed the Phase 1 UX4G smoke test at `/` still renders correctly
    and was not modified or removed
- **Phase 2A extension — genuine mobile/desktop adaptation** (KisanSetu
  farmer-dashboard reference image supplied; used for information
  hierarchy and mobile nav pattern only, not copied pixel-for-pixel):
  - Replaced the binary `variant` prop with `mobileNav: "bottom" |
    "drawer"`. **Every** role now gets the same persistent Sidebar at
    `lg` and up (desktop no longer differs from before); below `lg`,
    Farmer gets a new fixed `BottomNav` (`components/shell/BottomNav.tsx`)
    while Operator/Admin keep the Header-triggered NavDrawer already
    verified in the base Phase 2A work — so the layout adapts by
    breakpoint *and* by role, not just by shrinking one layout
  - **Identified gap**: no "bottom navigation"/"tab bar" component exists
    anywhere in the installed package (checked README text and grepped
    compiled CSS for `bottom-nav`/`tab-bar` classes — none). BottomNav is
    composed entirely from existing verified primitives instead of an
    invented class: `ux4g-fixed`/`ux4g-bottom-0`/`ux4g-inset-x-0`/
    `ux4g-z-40` (positioning), `ux4g-bt-1` (top border, token-driven),
    `ux4g-jc-around`/`ux4g-ai-center`/`ux4g-gap-3xs` (layout), the
    typography scale, and `.ux4g-icon-outlined` icon glyphs
  - **Icon names verified by extracting the actual embedded font**, not
    assumed from naming convention: decoded the base64 `UX4G Material
    Icons Outlined` font out of the compiled CSS with a small script,
    loaded it with `fontTools`, and confirmed `home`, `event`,
    `receipt_long`, `queue`, `info` (the five used) all exist as real
    glyphs (2183 total) before writing any markup — the README alone only
    demonstrates 8 icon names, not enough to cover this need
  - `lib/navigation.ts`: added an optional `icon` field to `NavItem`
    (populated for `farmerNav` only) and extracted the "longest matching
    href wins" active-item rule into a shared `getActiveHref` helper, now
    used by both `NavList` and `BottomNav` instead of being duplicated
  - Active-state signalling in BottomNav follows the same non-color-only
    rule as NavList: `aria-current="page"` plus a font-weight change
    (`ux4g-label-s-strong` vs `-default`), colour via the verified
    `.ux4g-text-primary` utility class (not an inline hex/hard-coded
    style)
  - PWA: added `viewportFit: "cover"` to `app/layout.tsx`'s `viewport`
    export and one narrowly-scoped custom CSS rule
    (`app/globals.css` `.bottom-nav { padding-bottom:
    env(safe-area-inset-bottom) }`) so the bar clears the home
    indicator/gesture bar on notched Android/iOS devices — UX4G has no
    utility for device safe-area insets (a platform viewport concern, not
    a design token; the only existing `env(safe-area-inset-bottom)` in
    the compiled CSS is scoped to the Date Picker's own dropdown, not
    reusable)
  - `<main>` gets `pb-20 lg:pb-0` (Tailwind, structural clearance for the
    fixed bar — not a token concept) only when `mobileNav="bottom"`
  - Fixed a second landmark issue caught during validation: BottomNav
    initially reused the Sidebar's `aria-label="Primary"`, which meant two
    identically-labelled `<nav>` landmarks existed in the DOM at once
    (one hidden via `lg:hidden`/`display:none`, which removes it from
    modern browsers' accessibility trees, but duplicate labels are still
    worth avoiding). Relabelled to `"Primary (mobile)"`, matching how
    NavDrawer was already distinguished from Sidebar
  - Validated again after every change: `tsc --noEmit` clean, `next lint`
    clean, `next build` succeeds (same 19 routes, all statically
    prerendered); dev-server HTML inspection confirmed Farmer routes
    render both `<aside>` (desktop sidebar) and `.bottom-nav` with no
    "Menu" button, Operator/Admin routes render `<aside>` and "Menu" with
    no `.bottom-nav`, all 5 farmer icon ligatures (`home`, `event`,
    `receipt_long`, `queue`, `info`) appear in the rendered HTML, and
    active-state markers (`aria-current="page"`) appear exactly twice per
    page (Sidebar + the visible mobile nav) with no duplicate/incorrect
    active items
- **Phase 1 — Next.js + UX4G + Tailwind(layout-only) + PWA foundation:**
  - Next.js 16.3.4 App Router project scaffolded in place (React 19.2.8,
    TypeScript 5, ESLint 9, Tailwind CSS 4) via a scratch-directory
    `create-next-app` run merged in (couldn't run directly in this
    directory — npm rejects the uppercase-letter directory name `KS` as a
    package name)
  - `ux4g-web-components@2.0.1` installed via npm, version pinned exactly,
    matching the version Design.md §0 records as current (confirms that
    line of the doc is still accurate)
  - npm-only delivery — no CDN assets used, nothing mixed
  - CSS imported once at app root (`app/layout.tsx`), after Tailwind's
    import, so UX4G component styles are never lost to a Tailwind reset
    conflict
  - Runtime initialized via a dedicated Client Component
    (`components/Ux4gRuntime.tsx`) — side-effect import of
    `ux4g-web-components/design-system`, mounted once in the root layout;
    confirmed present in the shipped client JS bundle (not stripped)
  - `data-theme="light"` set on `<html>` — default UX4G theme, no custom
    token overrides added (per standing decision)
  - Smoke-test page (`app/page.tsx`) renders Button (base+variant+size,
    multiple variants, disabled state), Input (labelled, default + error
    state), Card (header/body/footer), Tag (status, matching the
    `centre_status` enum), and an interactive Modal driven entirely by the
    UX4G runtime (no React state) — every class verified against the
    installed package's README and compiled CSS, not invented
  - Tailwind scoped to two structural uses only: outer page shell
    (`min-h-screen flex flex-col`) and responsive column count on a grid
    (`grid grid-cols-1 sm:grid-cols-2`) — the actual gap value comes from
    `ux4g-gap-l`, not Tailwind, keeping the boundary real rather than
    nominal
  - PWA foundation: `public/manifest.webmanifest` + generated placeholder
    icons (192/512/512-maskable/apple-touch, using UX4G's own default
    `--ux4g-color-primary-600` primitive, not an invented brand colour) +
    metadata/viewport wiring in `app/layout.tsx`. No service worker, no
    offline sync, no push — deliberately out of scope for this phase
  - `.env.example` placeholder committed; no real credentials anywhere
  - Validated: `tsc --noEmit` clean, `next lint` clean, `next build`
    succeeds (both routes statically prerendered, no hydration/SSR
    errors), dev server smoke test returns HTTP 200 with `data-theme`
    present and no console errors
  - Confirmed and measured Design.md's flagged 8 MB CSS concern (§10, §14
    debt #7) directly in this project's own build: the compiled
    `ux4g.css` is 7.9 MB (3.83 MB gzip) — see Known Issues
  - Partially resolved a standing open question: the installed package's
    compiled CSS does wrap button base+variant selectors in `:where()` for
    `min-height`/`padding` (confirms that specific claim in the SKILL.md
    "v2.0.1 button theming note"). The note's broader claim — that
    `!important` is never needed for *colour* theming via the semantic
    token cascade — was not tested, since no custom theme was applied this
    phase. Still `TODO — VERIFY` before relying on it for colour overrides.
- Cross-document consistency audit performed (Phase 0.5, see below)

## CURRENT REPOSITORY STATE

- Application: **scaffolded**, reusable UI shell **plus three real screen
  groups** (`/operator`, all of `/farmer/*`, all of `/admin/*`) — Next.js
  App Router, TypeScript, same 19 routes, builds and lints clean
- Backend: Supabase project `dzqddefcvnelamrfbfvo` linked; `@supabase/ssr`
  and `@supabase/supabase-js` installed but **not yet wired into the
  application** (no client integration, no auth flow — Migration 1 was
  schema-only, per instruction)
- Database: **Migrations 1-9 applied** — 14 tables + **2 views**
  (`v_centre_availability`, `v_centre_daily_summary`; Migration 9 added
  no new table), 7 enums, 35 functions (unchanged — Migration 9 added no
  function, only views), RLS unchanged at 33 policies (views aren't
  RLS-eligible objects; their own `SELECT`-only grant to `authenticated`
  is the equivalent boundary, verified live). **All four core mutable
  tables — `bookings`, `centre_status`, `procurement_records`,
  `payment_records` — have a real, working, audited, RPC-only client
  write path**, and the two read-side views now back the five screens/
  the allocation engine's documented data needs (§13/§15). Still no
  direct table/view write for any client role anywhere. `OQ-17`
  (`now_serving_token` ordering under concurrent multi-operator
  `IN_PROGRESS`) remains open; not populated, returned, or depended on
  anywhere through Migration 9. `v_centre_daily_summary.uptime` remains
  unbuilt — no formula/baseline defined yet, deferred by explicit
  decision, not guessed. Rows 13 (realtime), 14 (expiry-sweep schedule),
  15 (seed data) all remain unbuilt
- UI: `/operator` (Phase 2B), all 5 `/farmer/*` routes (Phase 2C), and all
  4 `/admin/*` routes (Phase 2D) are real, UI-only screens backed by local
  demo state (`lib/demo/operatorDashboard.ts`, `lib/demo/farmerDashboard.ts`,
  `lib/demo/adminDashboard.ts`). Only `/operator`'s own sub-routes remain
  `ComingSoon` (e.g. `/operator/queue`, `/operator/bookings` — distinct
  from the `/operator` dashboard itself, which is real)
- Auth: **not implemented** — role trees are separate route namespaces
  reached by URL, not gated by any login
- New repository content since Phase 2C: `components/admin/*` (7 files),
  `lib/demo/adminDashboard.ts`, rewritten `app/admin/*` (all 4 route
  files; no layout/nav changes — the Phase 2A route paths already matched
  this phase's requirements)
- Changed in Phase 3A / 3A.1: **documentation only** — `docs/DATABASE.md`,
  `docs/SECURITY.md`, `docs/ARCHITECTURE.md` rewritten,
  `docs/BUSINESS_LOGIC.md` extended, this file updated. Zero source files,
  zero dependencies, across both phases

## DECISIONS

- UX4G default theme used initially — no custom brand tokens invented
  (`docs/UX4G.md`)
- Supplied operator-dashboard screenshot is a visual/product reference only;
  UX4G is the implementation authority; UX4G wins on conflict
  (`docs/UX4G.md`)
- Deterministic, explainable Smart Allocation Engine — no ML/scoring black
  box (`docs/BUSINESS_LOGIC.md`)
- Supabase (Postgres + Auth + RLS + Realtime) as sole backend
  (`docs/ARCHITECTURE.md`)
- Payment = status tracking only, no real processing (`docs/PROJECT.md`,
  `docs/BUSINESS_LOGIC.md`)
- SMS notification starts as a mock adapter behind an abstraction; real
  integration optional/later (`docs/PROJECT.md`, `docs/ARCHITECTURE.md`)
- Next.js route grouping is not a security boundary; Supabase RLS is
  (`docs/ARCHITECTURE.md`, `docs/SECURITY.md`)
- Centre statuses: `OPEN`, `DELAYED`, `PAUSED`, `FULL`, `CLOSED`
  (`docs/PROJECT.md`, `docs/BUSINESS_LOGIC.md`)
- No automatic machine/equipment failure detection — operator-reported only
  (`docs/PROJECT.md`, `docs/BUSINESS_LOGIC.md`)
- Pre-arrival quality readiness is advisory-only, never shown as official
  acceptance (`docs/BUSINESS_LOGIC.md`, `docs/UI_SPEC.md`)
- UX4G runtime initialization lives in one dedicated Client Component
  (`components/Ux4gRuntime.tsx`), mounted once in the root layout — Phase 1
- Tailwind scoped to exactly two structural uses (outer shell flex,
  responsive grid column count); no Tailwind color/spacing/radius value
  anywhere UX4G already tokenizes it — Phase 1, see `docs/UX4G.md`
- PWA foundation is manifest + icons + metadata only; explicitly no service
  worker, no offline sync, no push notifications this phase — Phase 1
- Role hierarchy: `admin` route tree is the future **Master Admin** /
  system-wide interface, not a generic single Admin role. A future
  **Centre Admin** is expected to reuse the `operator` tree's operational
  pages under a wider permission set, not a separate nav structure. No
  user is modelled as tied to one physical PC — Phase 2A, per explicit
  user instruction; recorded in `lib/navigation.ts` and `app/admin/layout.tsx`
- **Superseded**: Farmer's mobile nav was originally the same NavDrawer
  pattern as Operator/Admin at every width. Replaced in the Phase 2A
  mobile/desktop-adaptation extension with a fixed BottomNav below `lg`
  (matching the supplied KisanSetu reference), while Farmer gained the
  same persistent desktop Sidebar every other role has at `lg`+. "Farmer
  stays simpler than Operator" is now expressed as fewer nav items (5 vs
  6) and a lighter Header, not as "no sidebar ever" — see `mobileNav` prop
  in `components/shell/AppShell.tsx`
- No dedicated vertical/sidebar-nav component exists in UX4G; `List` is
  reused for that purpose, applied to real `Link` elements — Phase 2A, see
  `components/shell/NavList.tsx`
- No "bottom navigation" component exists in UX4G either (checked README
  and grepped compiled CSS — confirmed absent); BottomNav composes one
  from verified layout utilities + icon glyphs instead of inventing a
  class — Phase 2A, see `components/shell/BottomNav.tsx`
- Icon ligature names for BottomNav were verified by extracting and
  inspecting the installed package's actual embedded icon font with
  fontTools, not assumed from Material Icons naming convention — Phase 2A
- Skip-link visible-on-focus behaviour needed one narrowly-scoped custom
  CSS rule (UX4G ships `.ux4g-sr-only` but no focus-visible companion) —
  Phase 2A, see `app/globals.css`
- Device safe-area inset (notch/gesture bar) for BottomNav needed one
  narrowly-scoped custom CSS rule and `viewportFit: "cover"` — UX4G has no
  utility for this platform concern — Phase 2A
- `/operator` dashboard demo data centralized in one file
  (`lib/demo/operatorDashboard.ts`), typed to match `docs/DATABASE.md`'s
  proposed schema shapes, with a persistent visible "Demo data" tag on the
  page itself — not just a code comment — Phase 2B
- Dashboard interactions (Call Next, Complete Processing, Check In, Pause/
  Resume Centre, Report Delay) are real local React state changes, not
  fake API calls — chosen over static/non-interactive mockup so the
  intended UX is actually demonstrable, while staying honest that none of
  it persists — Phase 2B
- `CapacityCard` uses the linear Progress Indicator, not the circular one
  — the circular variant's real compiled-CSS structure is materially more
  complex than its README example, and guessing at it risked a broken
  render — Phase 2B
- All operator dashboard action/link buttons use `ux4g-btn-md` (48px),
  not `-sm`/`-xs` (32px/24px, both under the 44px touch-target minimum) —
  Phase 2B, applies to every future dashboard's tap targets too
- Live Queue and Upcoming Bookings use List, not Table — avoids the
  horizontal-overflow risk a wide table carries on a phone, same reasoning
  already applied to nav in Phase 2A — Phase 2B
- Current Processing's workflow display uses the fuller 7-stage journey
  (Registration → Slot Booking → Check-in → Quality Check → Weighment →
  Procurement → Payment) rather than `docs/BUSINESS_LOGIC.md`'s original
  5-stage operator-actionable subset — the two are reconciled, not
  contradictory: the 7-stage view is display/context, the 5-stage subset
  remains what an operator can actually act on — Phase 2B, doc updated in
  the same change
- Farmer route rename: `/farmer/new-booking` → `/farmer/bookings/new`,
  `/farmer/status` → `/farmer/centre` — Phase 2C, per explicit
  instruction; `lib/navigation.ts` and `docs/UI_SPEC.md` updated in the
  same change, whole repo grepped afterward for stale references
- `WorkflowStepper` and `MetricCard` (renamed from `OperationalMetricCard`)
  promoted from `components/operator/` to `components/shared/` — Phase 2C,
  once a second role (Farmer) needed the same generic components; neither
  changed behaviour, only location/import path (and, for `MetricCard`,
  name)
- BookingForm's New Booking submit shows an explicit "demo, no booking
  created" message rather than a fake success screen — Phase 2C, Data
  Honesty
- Booking form uses native `<select>`/`<input type="date">` instead of
  UX4G's `ux4g-select`/Dropdown/Date Picker components — those exist but
  are undocumented-in-README custom widgets (search/filter logic, `data-
  ux-*` attributes) or, for Date Picker, not in the runtime's documented
  Behaviors Provided list; native controls are fully functional and
  accessible with zero guessed markup — Phase 2C
- **UX4G Input structure gap found**: the documented README Input example
  omits a `.ux4g-input`/`ux4g-input-input` wrapper the compiled CSS
  actually requires for correct border/height/focus styling. All Phase 2C
  form fields use the corrected structure; Phase 1/2A's existing inputs do
  not (not retroactively touched this phase, since Phase 2C's scope was
  Farmer-only) — flagged as a known limitation, recommended for a later
  cleanup pass
- Master Admin dashboard is deliberately not a re-skinned Operator
  dashboard — system-wide aggregates + exception list + role acknowledgment
  + audit-feed preview, no single-centre queue or per-farmer processing —
  Phase 2D, per explicit instruction
- Centre "attention state" (`NORMAL`/`NEAR_CAPACITY`/`CONGESTED`/etc.) is
  a small pure presentation function over demo data, explicitly documented
  as UI classification, not the allocation engine and not a real
  congestion calculation; operator-reported `status` always overrides the
  capacity-derived heuristic — Phase 2D
- Centre management actions (`Create centre`, `Edit centre details`) use
  the native `disabled` attribute with an explanatory `title`, not
  `aria-disabled` + a no-op click handler (the first draft, replaced
  before commit) — Phase 2D, simpler and more correctly accessible for a
  control with nothing to do yet
- `Deactivate`/`Activate centre` uses local component state only
  (`useState` inside `CentreManagementCard`), explicitly tagged "(demo)"
  when deactivated — Phase 2D, Data Honesty
- Reused `components/shared/MetricCard` for every Admin KPI card rather
  than adding a `SystemMetricCard` the phase instructions suggested —
  avoided duplicating an existing generic component — Phase 2D

## OPEN QUESTIONS

**Still open — `centre_live_state`'s `now_serving_token`:**

- `OQ-17` When a centre has several bookings `IN_PROGRESS` simultaneously
  (§7.8, multiple operators each serving a different farmer), which one
  is `now_serving_token`? Explicitly not resolved by the Migration 4
  brief ("if the exact ordering rule is genuinely absent... STOP and
  report the ambiguity instead of inventing one") — genuinely absent from
  every design doc. `centre_live_state.now_serving_token` exists as a
  column but is always written `NULL` by Migration 4's maintenance logic;
  no code path guesses at a value. Needs an explicit product decision
  before it's populated or surfaced in any UI/RPC.

**Resolved in Migration 4** (were blocking `centre_live_state`, §18 row 8
— reasoning and live verification in this file's Migration 4 entry
above):

- ~~`OQ-16`~~ → **served_count = `COMPLETED` only.**
- ~~`OQ-18`~~ → **`NO_SHOW` does not consume farmer/quantity capacity**;
  capacity consumption = every status except `CANCELLED`/`NO_SHOW`/
  `EXPIRED` (`COMPLETED` still consumes — a deliberately different set
  from §7.6's "active" invariant set, which excludes `COMPLETED`).
- ~~`OQ-19`~~ → **`centre_status` applies only to today** (Asia/Kolkata)
  when computing `centre_live_state`; every other date derives its
  `effective_status` purely from capacity/operating-day facts, never from
  `centre_status`. Required no schema change to the already-applied
  `centre_status` table.

**Locked in Phase 3A.1** (were the three blocking decisions):

- ~~`OQ-1` capacity units~~ → **two independent dimensions**, farmer
  (farmers) and quantity (quintals), never conflated. Implies a UI label
  correction in 3B — copy and prop names, not layout
- ~~`OQ-6` multiple active bookings~~ → **at most one active booking per
  farmer**, global rather than per-date, partial unique index
- ~~`FULL` operator-settable vs derived~~ → **derived** from farmer
  capacity; the five-value display vocabulary is preserved, the
  operator-settable set is four

**New questions opened by those decisions** (none blocking 3B):

- `OQ-13` should quantity exhaustion also block new bookings, as farmer
  exhaustion does? Currently warn-only, per the locked allocation priority
- `OQ-14` grace period before a stale `CHECKED_IN`/`IN_PROGRESS` booking is
  expired — too short destroys evidence of a centre-side problem, too long
  blocks the farmer
- `OQ-15` should check-in be allowed while a centre is `PAUSED`?
  Recommended yes (the farmer has already travelled), with calling blocked

**Resolved in Phase 3A** (reasoning in `docs/DATABASE.md` §20):

- ~~Whether `FULL` is operator-set, system-derived, or both~~ → **derived**
- ~~Whether `CHECKED_IN` and `WAITING` are distinct~~ → **same state**
- ~~Whether an operator can be assigned to more than one centre~~ →
  schema supports many via `centre_assignments`; not enforced either way,
  so a relief operator is a data change rather than a migration

**Still deferred by design:**

- Allocation-engine ranking/scoring formula when multiple centres are
  eligible — deliberately not designed (`docs/BUSINESS_LOGIC.md`). The data
  model provides its inputs; the formula is a later decision
- `OQ-3` who sets payment status, `OQ-7` what happens on quality rejection,
  `OQ-8` MSP amounts, `OQ-11` end-of-day carry-over, and five further
  numbered ambiguities — full list in `docs/DATABASE.md` §19
- The "v2.0.1 button theming note" in `SKILL.md`: the `:where()`-wrapper
  claim is now confirmed true for button sizing (see Phase 1 completed
  work above); the claim that colour theming needs no `!important` is
  still unverified — no custom theme has been applied yet (`docs/UX4G.md`)
- Exact Next.js client/server component boundary convention for UX4G runtime
  init — **resolved in Phase 1**: a single dedicated Client Component
  (`components/Ux4gRuntime.tsx`) mounted once in the root layout
  (`docs/UX4G.md`)
- No screenshot image has actually been inspected pixel-by-pixel by Claude in
  this conversation — the visual reference has been used only via the user's
  written description of it plus the attached image in the Phase 0.5
  message. If further screens need to match it closely, re-confirm details
  against the image directly during UI implementation.

## KNOWN ISSUES

- **Phase 3B reconciliation audit finding: `anon` can directly `EXECUTE`
  `auth_role()`/`auth_is_master_admin()`/`auth_centre_ids()`.** The
  migration issued `revoke execute ... from public; grant execute ... to
  authenticated;` on all three, intending `anon` to have none — but the
  Supabase project's schema-level default privileges already grant
  `EXECUTE` to `anon` at `CREATE FUNCTION` time, before those statements
  run, and nothing in the migration revoked it from `anon` specifically.
  Confirmed live: `pg_proc.proacl` lists `anon=X/postgres` on all three;
  `has_function_privilege('anon', ...)` returns true. **Not a live
  vulnerability** — verified by direct test (`SET ROLE anon; SELECT
  auth_role();` → `NULL`, matching `auth.uid()` being `NULL` for an
  unauthenticated caller, so no row, no PII, no cross-tenant fact is ever
  returned) — but a deviation from the migration's own stated intent and
  the "minimal surface" principle (`docs/SECURITY.md` §2.1). Fix is a
  one-line `revoke execute ... from anon` in the next migration that
  touches these functions; not applied now per the reconciliation
  audit's "no database changes" instruction.
- **8 MB CSS bundle is real and measured, not just documented risk.** The
  installed `ux4g-web-components@2.0.1` ships a 7.9 MB `styles/ux4g.css`
  (3.83 MB gzip) — confirms Design.md §10/§14 debt #7 directly against this
  project's own production build. For a PWA prototype whose target users
  may be on constrained mobile connections, this is a real first-load cost.
  No fix applied — out of scope for "minimum correct integration"; Design.md
  attributes this to the upstream package, not something introduced here.
  If it becomes a problem before demo day, options to revisit: font
  self-hosting as separate `woff2` (Design.md's own suggested fix, requires
  patching the installed package — not attempted), or accepting it as a
  known prototype-scope tradeoff.
- `create-next-app` cannot run directly inside this directory because npm
  rejects the uppercase directory name `KS` as a package name — worked
  around by scaffolding in a scratch directory and merging the generated
  files in, then confirming `package.json`'s `name` field independently.
  Documented here so the workaround isn't rediscovered as a surprise later.
- `next dev` auto-appended a `<!-- BEGIN:nextjs-agent-rules -->` block to
  `CLAUDE.md` (a documented Next.js 16 behavior, regenerated automatically
  unless disabled via `agentRules: false` in `next.config.ts`). Left in
  place — it's framework-standard, not a stray edit, and Next.js recommends
  committing it.
- **UX4G's Drawer runtime does not trap focus or return focus to the
  trigger button on close** (verified by reading
  `dist/runtime/design-system.mjs` directly — it removes the open class on
  Escape/overlay-click/close-button but does nothing with `document
  .activeElement`). Not patched — that would mean overriding component
  internals, which the UX4G contract disallows. Keyboard users can still
  reach and activate every drawer control via Tab (verified: `visibility:
  hidden` on the closed overlay correctly removes it from the tab order),
  they just aren't auto-returned to the menu button afterward. Acceptable
  for a 3-day prototype; flagged rather than silently left unmentioned.
- The bug described above (Dashboard nav item wrongly active on every
  sub-page) was caught by actually reading the rendered HTML, not assumed
  fixed — a reminder that shell code needs the same verification rigor as
  everything else, not just "the build succeeded."
- **Phase 2B**: `ux4g-progress-circle`'s real DOM contract (compiled CSS)
  is more complex than its README sample — not used, linear bar used
  instead; see Phase 2B completed work above.
- **Phase 2B**: no browser/screenshot tool is available in this
  environment, so the requested 1440/1280/1024/390/430px checks were done
  by rendered-HTML inspection and CSS-rule reasoning, not literal
  screenshots. Worth a real visual pass (browser devtools or the `run`
  skill, if it supports viewport resizing) before this is called
  demo-ready, not just build-clean.
- **Phase 2C**: same no-screenshot-tool limitation applies to the Farmer
  routes — see Phase 2C completed work above. This is now a
  cross-cutting gap (Phase 2B and 2C both), not a one-off, and should be
  resolved (real browser check) before any of this is called demo-ready.
- **Phase 2C**: the Input structure gap (missing `.ux4g-input`/
  `ux4g-input-input` wrapper) affects every input built before this
  phase's discovery — the Phase 1 smoke test's two inputs, and nothing
  else, since Phase 2B's operator dashboard used Textarea (a different,
  correctly-simple component) rather than Input. Worth a small follow-up
  pass to add the wrapper there too, though it's cosmetic (likely
  under-styled height/border, not a functional break) rather than urgent.
- **Phase 2C**: `ux4g-select` and Date Picker's real interactive contracts
  were not implemented (native controls used instead — see Decisions
  above) — if a future phase wants the UX4G-branded versions specifically,
  their actual DOM/JS contract still needs to be reverse-engineered from
  the compiled CSS and runtime source, the README does not cover it.
- **Phase 2D**: same no-screenshot-tool limitation, now a third
  consecutive phase (2B, 2C, 2D) — see Phase 2D completed work above. A
  real browser/visual pass is the single highest-value follow-up before
  any UI phase is called demo-ready rather than build-clean.
- **Phase 2D**: `demoCentres`' first draft had 6 of 6 centres reading as
  "requiring attention" — fixed before commit (see Phase 2D completed
  work above), but a reminder that hand-written demo data needs the same
  "does this actually demonstrate the feature" scrutiny as real data
  would, not just type-correctness.

## NEXT PHASE

Phase 3B — backend implementation: Supabase project provisioning, the
migration sequence in `docs/DATABASE.md` §18 (identity → helpers →
reference data → assignments → status → capacity → bookings → queue
aggregate → processing/payment → audit → views → RPCs → realtime → seed),
RLS policies shipped with each table, and the attack-based verification
plan in `docs/SECURITY.md` §12.

All three previously-blocking decisions are now **locked** (Phase 3A.1), so
3B has no design prerequisites left. Two implementation couplings that must
not be split across migrations:

1. The one-active-booking index and the `EXPIRED` sweep ship **together** —
   the invariant without the sweep is a permanent farmer lockout (C-9).
2. `rpc_create_booking` ships with `request_id` idempotency from the start —
   retrofitting it after clients exist means clients that cannot safely
   retry (C-10).

The UI label correction for the two capacity dimensions also belongs in 3B,
alongside wiring the screens to real data — the same components are being
touched either way.

Also still outstanding from earlier phases, unaffected by 3A: a real
browser/visual check of Phase 2B–2D's responsive claims (a 3-phase-deep
gap), and the Input-wrapper fix for the Phase 1 smoke test.

Not started — awaiting explicit approval.

## LAST VERIFIED

- `.claude/skills/ux4g-design/SKILL.md` and `Design.md`: read in full seven
  times (Phase 0, 0.5, 1, 2A, 2B, 2C, 2D); content unchanged between
  reads.
- Phase 1: `npm view ux4g-web-components version` → `2.0.1`, matching
  Design.md §0's recorded npm version at time of writing.
- Phase 1: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean (see Phase 1 completed work above for details).
- Phase 1: dev server smoke test (`curl` against `http://localhost:3000/`)
  returned HTTP 200 with `data-theme="light"` present in the rendered HTML;
  manifest and favicon both returned HTTP 200; dev server log showed no
  compile or runtime errors.
- Phase 1: shipped client JS bundle grepped directly for
  `__UX4G_RUNTIME_INITIALIZED__` and `data-modal-target` — both present,
  confirming the runtime actually reaches the browser rather than being
  silently stripped as server-only code.
- Phase 2A: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean, all 19 routes statically prerendered.
- Phase 2A: every new route checked directly via `curl` — all return HTTP
  200. Rendered HTML for `/operator` and `/operator/queue` inspected
  directly: exactly one `<h1>`; landmarks present and distinctly labelled
  (`<header>`, two `<nav>`, `<aside>` on sidebar variant, `<main
  id="main-content">`); skip-link target exists; every `<button>` carries
  an explicit `type="button"`; before the NavList fix, 4
  `aria-current="page"` occurrences appeared on `/operator/queue` (bug);
  after the fix, exactly 2 (sidebar + drawer copies of the one correct
  item).
- Phase 2A: confirmed the Phase 1 smoke test at `/` still returns HTTP 200
  and still contains its Modal/Button markup — not modified.
- Phase 2A mobile/desktop-adaptation extension: `tsc --noEmit`, `next
  lint`, `next build` all re-run and passed clean after every change
  (three full passes total this extension), same 19 routes.
- Phase 2A extension: font glyph verification was not assumed — the
  embedded `UX4G Material Icons Outlined` font was base64-decoded out of
  the compiled CSS, loaded with fontTools, and its glyph order (2183
  names) checked directly for `home`, `event`, `receipt_long`, `queue`,
  `info` before any was used in markup.
- Phase 2A extension: rendered HTML checked directly for both roles —
  `/farmer/queue` contains `<aside>`, `.bottom-nav`, all 5 icon ligatures,
  and no `>Menu<` button; `/operator/queue` contains `<aside>` and
  `>Menu<` but no `.bottom-nav`; both show exactly 2
  `aria-current="page"` occurrences (Sidebar + the one visible mobile nav
  for that role) with the correct item active, not the root Dashboard
  item.
- Phase 2A extension: after relabelling BottomNav's landmark, confirmed
  by direct grep that `/farmer/queue` contains two `<nav
  aria-label="Primary">`-family landmarks with distinct label text
  (`"Primary"` on Sidebar, `"Primary (mobile)"` on BottomNav), not
  duplicates.
- `.ux4g-ai-center`'s apparent second, `!important`-qualified definition
  in the compiled CSS was checked in full selector context (not just
  matched in isolation) before trusting it in BottomNav — confirmed scoped
  to an unrelated `.ux4g-identity-access-layout-card .ux4g-form-box`
  compound selector, so it does not affect BottomNav's plain
  `ux4g-ai-center` usage.
- Compiled CSS grepped directly (not assumed) before use, twice this
  phase: `.ux4g-list-item-row.active` (confirmed real, bound to
  `--ux4g-bg-primary`/`--ux4g-text-brand-primary-default`) and
  `.ux4g-navbar-desktop`/`-mobile`'s `@media (max-width:768px)` toggle
  (informed the decision to use Tailwind's 1024px `lg:` breakpoint for the
  sidebar instead, matching Design.md §8 rather than UX4G's own 768px
  navbar-links breakpoint, since the sidebar and the navbar-links pattern
  are different components with no obligation to share a cutoff).
- No Supabase project, no auth, no database migration has been created —
  confirmed by absence of any Supabase-related file or dependency in
  `package.json` at time of writing (still true after Phase 2B).
- Phase 2B: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean, twice (once before the touch-target fix, once after) — same 19
  routes, all statically prerendered.
- Phase 2B: rendered `/operator` HTML inspected directly — one `<h1>`;
  unchanged Phase 2A landmarks; `"Demo data"` tag present; zero
  `<table>` elements; every `<button>` carries an explicit `type`; the
  seeded `Call Next Farmer` button renders `disabled` (correct, given a
  farmer is already PROCESSING in the seed data); `--ux4g-progress-value:76`
  present on the capacity bar (matches 76/100 booked in the seed data);
  all 7 workflow stage labels appear exactly twice each (desktop +
  mobile dual-render).
- Phase 2B: button min-height claims verified by reading the compiled CSS
  directly, not assumed — `.ux4g-btn-sm` 2rem (32px), `.ux4g-btn-xs`
  1.5rem (24px), `.ux4g-btn-md` `var(--ux4g-size-48)` (48px, more specific
  than the zero-specificity `:where()` base rule's 2.5rem). All nine
  operator buttons confirmed as `ux4g-btn-md` in rendered HTML after the
  fix (`grep -o ux4g-btn-md | wc -l` → 9).
- Phase 2B: confirmed the Phase 1 smoke test (`/`) and the Farmer
  (`/farmer`) and Admin (`/admin`) shells still return HTTP 200 and were
  not modified by this phase's changes.
- Phase 2C: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean after deleting a stale `.next/` cache (git-ignored build output
  referencing the pre-rename route paths — not a code defect); all 19
  routes still statically prerender, now listing `/farmer/bookings/new`
  and `/farmer/centre`.
- Phase 2C: all 5 Farmer routes checked directly via `curl` — all return
  HTTP 200. Rendered HTML for every one inspected directly: exactly one
  `<h1>` each; zero `<table>` elements across all 5; every `<button>`
  carries an explicit `type`; all 5 New Booking form fields have correct
  `label`/`for` pairs; the corrected `.ux4g-input`/`ux4g-input-input`
  structure renders as written (`grep` confirmed on both a `<select>` and
  an `<input type="date">` field); `/farmer/bookings/new` shows "New
  Booking" active in nav, not "My Bookings" (confirms the shared
  `getActiveHref` rule needed no changes for the new nested route);
  BottomNav's `aria-label="Primary (mobile)"` stays distinct from
  Sidebar's `"Primary"`; all 7 workflow stage labels appear twice on the
  dashboard (desktop + mobile dual-render).
- Phase 2C: confirmed the Phase 1 smoke test (`/`), the Operator dashboard
  (`/operator`), and the Admin shell (`/admin`) all still return HTTP 200
  and render their expected content — the one intentional touch to a
  Phase 2B file (`app/operator/page.tsx`'s `MetricCard`/`WorkflowStepper`
  import paths) did not change its rendered output, confirmed by grepping
  for `"Centre Operations Dashboard"` in the response.
- Phase 2D: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean, twice (once before, once after the attention-panel data fix) —
  same 19 routes, all statically prerendered.
- Phase 2D: all 4 Admin routes checked directly via `curl` — all return
  HTTP 200. Rendered HTML for every one inspected directly: exactly one
  `<h1>` each; zero `<table>` elements across all 4; every `<button>`
  carries an explicit `type`; the Admin shell renders `<aside>` +
  a "Menu" button and never `.bottom-nav` (grepped directly, confirmed
  absent — Farmer's BottomNav was not accidentally reused); active
  navigation correct on `/admin` ("Overview") and `/admin/centres`
  ("Centres"); `Create centre` and all six `Edit centre details` buttons
  render with the native `disabled` attribute and an explanatory `title`;
  `grep -i` for "saved successfully"/"successfully saved"/"changes saved"
  across all 4 routes returned nothing; `AttentionPanel` lists exactly 5
  of 6 centres after the data fix (re-verified by re-fetching and
  re-parsing the rendered HTML, not by re-reading the source).
- Phase 2D: confirmed the Phase 1 smoke test (`/`), the Operator dashboard
  (`/operator`), and all 5 Farmer routes still return HTTP 200 and were
  not modified by this phase — no Phase 2B or 2C file was touched at all
  this phase (unlike Phase 2C, which touched two Phase 2B files for the
  shared-component moves).
- Phase 3A: design phase, so the meaningful verification is that **nothing
  changed**. `git status` and `git diff --stat` confirm only five `docs/*.md`
  files differ — no file under `app/`, `components/`, `lib/`, `public/`, no
  `package.json`, no lockfile, no `.env*`, no `.sql`, no migration
  directory, no `@supabase/*` dependency.
- Phase 3A: `tsc --noEmit`, `next lint` and `next build` run and passed
  clean, all 19 routes still statically prerendered — run to prove the
  application is untouched rather than to assert it.
- Phase 3A.1: `git status` and `git diff --stat` again confirm only
  `docs/*.md` files differ — no source, no `package.json`, no lockfile, no
  `.env`, no `.sql`, no migration directory, no `@supabase/*` dependency.
  `tsc --noEmit`, `next lint` and `next build` re-run clean with all 19
  routes still prerendered.
- Phase 3A: the design was grounded in the implemented UI, not only the
  earlier drafts — all three `lib/demo/*.ts` modules, the route list, the
  operator state-transition handlers, and the admin/farmer component props
  were re-read. That is what surfaced the capacity-unit contradiction
  (`OQ-1`) and the multi-operator/single-"Current Processing" tension,
  neither of which is visible from the documentation alone.
