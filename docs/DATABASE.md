# Database — Logical Design (Phase 3A)

`DESIGN ONLY` — no Supabase project, no tables, no migrations, no SQL files
exist. This document is the design that Phase 3B will implement. Nothing
here is executable SQL by intent (see "Why no SQL yet" at the end).

**Supersedes** the Phase 0.5 draft of this file. Decisions from that draft
that survive review are kept; the ones this phase revises are called out
explicitly under **Revisions to earlier design** so nothing changes
silently (`CLAUDE.md` — implementation discipline).

Grounding sources, in the order they were trusted: approved SIH
requirements and conversation decisions → `docs/PROJECT.md` →
`docs/BUSINESS_LOGIC.md` → `docs/SECURITY.md` → this file's prior draft →
`docs/ARCHITECTURE.md` → **the actually-implemented UI** (`app/**`,
`components/**`, `lib/demo/*.ts`) → labelled assumptions.

The implemented UI mattered more than the earlier drafts here: three
phases of screens exist now, and they are the concrete statement of what
data the backend must produce.

---

## 1. Design principles applied

1. **One fact, one home.** Anything computable is derived, not stored,
   unless a specific read pattern or race makes storage necessary — and
   then it is maintained by a database trigger, never by application code.
2. **State machines are separated by owner.** The appointment lifecycle,
   in-centre processing progress, and payment lifecycle change at
   different times, for different reasons, by different actors. They get
   three small enums, not one large one.
3. **Stage is derived from evidence, not asserted.** Where a "stage" can
   be inferred from which timestamps/results exist, there is no stage
   column that could contradict the underlying data.
4. **Snapshot what a record means at the time it was made.** Actor names,
   roles, and farmer identity on a booking are captured at write time, so
   history stays truthful after a rename, role change, or account removal.
5. **The client is never trusted.** Every rule that matters is a
   constraint, a policy, or a locked transaction in the database.

---

## 2. Enums vs tables vs derived

| Concept | Choice | Reasoning |
|---|---|---|
| `user_role` | **Enum** | Fixed four-value vocabulary hard-referenced by RLS policies. A table would add a join to every policy for zero flexibility. |
| `booking_status` | **Enum** | Small closed lifecycle, referenced in constraints and indexes. |
| `centre_operational_status` | **Enum** | Operator-settable vocabulary; closed set. |
| `payment_status` | **Enum** | Closed set. |
| `quality_result` | **Enum** | Closed set, deliberately tiny (§9). |
| `notification_type` / `channel` | **Enum** | Closed set; adding SMS later adds a value, not a table. |
| Commodity / crop | **Table** (`commodities`) | Open, data-managed vocabulary; joined for booking options, per-centre acceptance, and token prefixes. Not an enum — adding a crop must not need a migration. |
| Centre ↔ accepted crops | **Table** (`centre_commodities`) | Queried as a filter by the allocation engine; a join beats an array for indexed filtering and future per-crop attributes. |
| Queue position | **Derived** (§7) | Storing it guarantees drift on every call/no-show. |
| Remaining capacity, utilisation | **Derived** (view) | Pure arithmetic over stored capacity and counted bookings. |
| Estimated wait / delay | **Derived** | Function of queue depth and processing rate. |
| Workflow "stage" (7-step stepper) | **Derived projection** (§8) | Computed from booking status + procurement timestamps + payment status. |
| `FULL` centre state | **Derived** (§6) | Capacity consequence, not an operator intent. |
| Queue aggregate for farmers | **Stored, trigger-maintained** (`centre_queue_state`) | The one deliberate denormalisation; justified in §12 — farmers cannot read other farmers' rows, so live queue facts must be exposed as a non-personal aggregate. |

---

## 3. Identity and access

### 3.1 `profiles`

Extends `auth.users` 1:1. Created by trigger on `auth.users` insert.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `role` | `user_role` NOT NULL DEFAULT `'FARMER'` | `MASTER_ADMIN │ CENTRE_ADMIN │ OPERATOR │ FARMER` |
| `full_name` | text NOT NULL | |
| `phone` | text | E.164 or 10-digit normalised; display + notification convenience copy |
| `village_text` | text NULL | Farmer-only in practice; nullable for staff |
| `account_status` | `account_status` NOT NULL DEFAULT `'ACTIVE'` | `ACTIVE │ SUSPENDED` — Admin UI shows account status; suspension must revoke access without deleting audit history |
| `created_at` / `updated_at` | timestamptz | |

Indexes: `(role)`, `(phone)`.

**`role` and `account_status` are not self-writable.** Enforced by
column-level `GRANT UPDATE (full_name, phone, village_text)` plus a
backstop trigger — see `docs/SECURITY.md` §RLS-1. Row-level policies alone
cannot restrict which *columns* a user updates; this is the single most
important detail in the whole identity design.

`ASSUMPTION`: one role per user. A person who is both Centre Admin at one
centre and Operator at another is not supported. Centre Admin permissions
are a superset of Operator permissions at their assigned centre, so the
realistic case is covered. If that assumption ever breaks, role moves onto
`centre_assignments` — noted as a known migration path, not built now.

**Revision**: the Phase 0.5 draft had a separate `farmers` table holding
`village_or_location` and `default_crop`. Folded into `profiles` — one
nullable text column does not justify a table, and the RLS separation it
appeared to buy is illusory (operators need farmer *names* regardless).
`default_crop` is dropped: no implemented screen uses it.

### 3.2 `centre_assignments`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid NOT NULL | FK → `profiles(id)` |
| `centre_id` | uuid NOT NULL | FK → `procurement_centres(id)` |
| `assigned_by` | uuid NULL | FK → `profiles(id)` |
| `assigned_at` | timestamptz NOT NULL DEFAULT now() | |
| `revoked_at` | timestamptz NULL | |
| `revoked_by` | uuid NULL | FK → `profiles(id)` |

Constraint: `UNIQUE (profile_id, centre_id) WHERE revoked_at IS NULL`.
Indexes: `(profile_id) WHERE revoked_at IS NULL`, `(centre_id) WHERE revoked_at IS NULL`.

**Why a join table rather than `profiles.centre_id`** (the Phase 0.5
draft's choice): the approved role hierarchy requires that *"Centre Admin
changes"* and *"user account changes"* be auditable, and that centre
assignment be represented explicitly. A single nullable FK is lossy — after
an operator is moved from centre A to centre B, nothing records that they
ever had access to A, which is exactly the question an audit asks. The join
table also makes revocation a first-class event rather than a NULL-out. The
cost is one small table and one helper function; multi-centre support
arrives free rather than as a later migration.

Master Admin has **no** rows here — system-wide scope comes from role, not
assignment. Farmers have no rows here either.

`ASSUMPTION`: an Operator is assigned to exactly one active centre in
practice, but the schema does not enforce it. Enforcing one-centre-only
would be a partial unique index on `profile_id`; left off deliberately so
a relief operator covering two centres is a data change, not a schema
change.

**Note on the "not tied to a PC" requirement**: nothing in this design
references a device, terminal, session, or workstation. Concurrency between
multiple operators at one centre is handled by per-operator attribution
(`bookings.processing_operator_id`, §7) and row-level locking (§14), not by
partitioning work per machine.

---

## 4. Procurement centres

### 4.1 `procurement_centres`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text NOT NULL UNIQUE | Human reference, e.g. `JPR-01` |
| `name` | text NOT NULL | |
| `district` / `state` | text NOT NULL | Text only — see location note below |
| `address_text` | text NULL | Displayed on `/farmer/centre` |
| `is_active` | boolean NOT NULL DEFAULT true | Backs the Admin activate/deactivate control; deactivation never deletes |
| `default_processing_rate_per_hour` | int NOT NULL | Baseline throughput; overridable per day |
| `opens_at` / `closes_at` | time NOT NULL | Needed for slot generation and the uptime metric |
| `guidance_note` | text NULL | The farmer-facing "what to bring" copy already in the UI |
| `created_at` / `updated_at` | timestamptz | |

**No latitude/longitude, no geometry, no map integration** — per phase
instruction. Centre suitability for the allocation engine is expressed as
district/state text matching against the farmer's `village_text`/district,
which is weak but honest. Adding real distance later means adding columns,
not restructuring.

### 4.2 `commodities` and `centre_commodities`

`commodities`: `id`, `code` (`WHT`), `name` (`Wheat`), `token_prefix`
(`WHT`), `is_active`. Gives the token scheme (`WHT-142`) a real source
instead of string munging, and feeds the booking form's crop list.

`centre_commodities`: `(centre_id, commodity_id)` composite PK. Drives the
allocation engine's eligibility filter (`docs/BUSINESS_LOGIC.md`: a centre
that does not accept the crop is not a candidate).

### 4.3 `centre_operating_days` — **capacity, both kinds**

| Column | Type | Notes |
|---|---|---|
| `centre_id` | uuid | FK, part of PK |
| `service_date` | date | part of PK |
| `slot_capacity` | int NOT NULL | Max **bookings/farmers** accepted that day |
| `quantity_capacity_quintal` | numeric NOT NULL | Max **volume** accepted that day |
| `processing_rate_per_hour` | int NOT NULL | Day-specific override of the centre default |
| `created_at` / `updated_at` | timestamptz | |

PK `(centre_id, service_date)`.

**This table exists to resolve a real contradiction found in the
implemented UI.** The Operator and Admin screens render
`todaysCapacityQuintal` / `bookedQuintal` (a *volume*), while the same
cards render `processingRatePerHour` as "8 farmers / hr", `farmersWaiting`
as a *count*, and `/farmer/centre` renders "24 slots available today" — a
*slot count* — from what the code computes as `capacity − booked` in
quintals. The numbers only line up because demo fixtures were carried over
from a farmer-count model into quintal-labelled fields.

They are two genuinely different constraints:

- **Throughput** (`slot_capacity`, `processing_rate_per_hour`) limits how
  many farmers can be served in a day and drives ETA and slot availability.
- **Volume** (`quantity_capacity_quintal`) limits how much grain can be
  procured and drives `docs/BUSINESS_LOGIC.md`'s rule that *"a centre with
  insufficient remaining capacity for the farmer's quantity must not be
  recommended"*.

A centre can be out of slots while still having volume headroom, and vice
versa. Modelling one number cannot express that. See `OQ-1` (§16) — the UI
labels need a matching correction in Phase 3B, which is a small copy change,
not a redesign.

### 4.4 `slots`

`id`, `centre_id`, `service_date`, `start_time`, `end_time`,
`slot_capacity int`. `UNIQUE (centre_id, service_date, start_time)`.

`booked_count` is **not stored** — it is `count(bookings)` for the slot,
computed in the availability view and, critically, counted *inside the
booking transaction while holding a lock on the slot row* (§14, race R-2).

---

## 5. Centre operational status

### 5.1 `centre_status` — current state, one row per centre

| Column | Type | Notes |
|---|---|---|
| `centre_id` | uuid PK | FK |
| `status` | `centre_operational_status` NOT NULL | `OPEN │ DELAYED │ PAUSED │ CLOSED` |
| `delay_reason` | text NULL | `CHECK (status <> 'DELAYED' OR delay_reason IS NOT NULL)` |
| `updated_at` | timestamptz NOT NULL | |
| `updated_by` | uuid NOT NULL | FK → `profiles(id)` — accountability |

Realtime-published (§12). One row per centre keeps reads and subscriptions
trivial.

### 5.2 `centre_status_events` — history (append-only)

`id`, `centre_id`, `from_status`, `to_status`, `reason`, `changed_by`,
`changed_at`. Written by trigger on `centre_status`.

`SHOULD HAVE`, not `MUST HAVE`. It exists for one implemented feature: the
Operator dashboard's **"Centre uptime"** stat, which is *not computable
from current state*. The alternative is deriving uptime from
`audit_events`, which works but couples a product metric to audit
retention. Recommendation: build it when the Daily Summary is wired up; the
Daily Summary is already classified `SHOULD HAVE` in `docs/PROJECT.md`.

---

## 6. `FULL` — resolved (was an open question since Phase 0.5)

**Recommendation: `FULL` is derived, not operator-set.**

The other four states are declarations of *operator intent or
availability*: the centre is open, running late, temporarily halted, or
shut. `FULL` is not an intent — it is the arithmetic consequence of
capacity being exhausted. Allowing it to be both set and derived creates
two contradicting sources of truth for one fact, and the contradiction
surfaces exactly when it hurts: an operator marks `FULL`, a booking is
cancelled, capacity frees up, and the centre stays wrongly `FULL` until
someone remembers to change it back.

Design:

- `centre_status.status` (operator-settable) = `OPEN │ DELAYED │ PAUSED │ CLOSED`.
- `v_centre_availability.effective_status` (derived, read-only) adds `FULL`:

```
effective_status =
  CLOSED   if status = 'CLOSED' or centre not active or no operating day
  PAUSED   if status = 'PAUSED'
  FULL     if remaining_slots <= 0 or remaining_quantity_quintal <= 0
  DELAYED  if status = 'DELAYED'
  OPEN     otherwise
```

- **The approved five-value vocabulary is preserved.** Every screen that
  shows a centre status keeps showing all five values; they now come from
  `effective_status`. The requirement was that the system *support* those
  five states, and it does.
- An operator who wants to stop intake for a non-capacity reason already
  has `PAUSED`, which means precisely that.
- No UI change is required — the components already render whatever status
  value they are given.

`DECISION` recorded; supersedes the `TODO — VERIFY` in
`docs/BUSINESS_LOGIC.md` and the open question in `docs/PROJECT_STATE.md`.

---

## 7. Bookings and the queue — **merged**

### 7.1 The revision

The Phase 0.5 draft proposed `bookings` **and** a separate `queue_entries`
table. This design **collapses them into `bookings`**.

Reasoning, adversarially: the two tables would have carried near-identical
status enums (`BOOKED│CHECKED_IN│PROCESSING│COMPLETED│CANCELLED│NO_SHOW`
vs `WAITING│CALLED│PROCESSING│COMPLETED│NO_SHOW`) describing the same
real-world fact, in a strict 1:1 relationship, mutated by the same actions.
That is a guaranteed drift surface, two sets of RLS policies, two realtime
publications, and an extra join on the hottest read path in the app — bought
in exchange for nothing, because no implemented screen treats a queue entry
as independent of its booking.

A separate queue table earns its place only if a booking can enter the
queue more than once (re-queue after a no-show) or if the queue can contain
entries with no booking (walk-ins). Neither exists in the MVP scope or in
any implemented screen. Both are recorded as the trigger conditions that
would justify splitting later (`OQ-4`, `OQ-5`).

This also resolves the standing `CHECKED_IN` vs `WAITING` open question:
they are the same state. A booking is "waiting" precisely when it is
checked in and not yet called. No separate value is needed.

### 7.2 `bookings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `centre_id` | uuid NOT NULL | FK |
| `slot_id` | uuid NOT NULL | FK |
| `service_date` | date NOT NULL | Denormalised from the slot; trigger-enforced to match. Every hot query filters on it |
| `farmer_id` | uuid NOT NULL | FK → `profiles(id)` |
| `farmer_name_snapshot` | text NOT NULL | See below |
| `farmer_phone_snapshot` | text NOT NULL | See below |
| `commodity_id` | uuid NOT NULL | FK |
| `expected_quantity_quintal` | numeric NOT NULL CHECK (> 0) | Farmer's declared quantity |
| `token` | text NOT NULL | `WHT-142`; assigned at booking creation |
| `status` | `booking_status` NOT NULL | `BOOKED │ CHECKED_IN │ CALLED │ IN_PROGRESS │ COMPLETED │ CANCELLED │ NO_SHOW` |
| `processing_operator_id` | uuid NULL | FK → `profiles(id)`; who is serving this farmer |
| `checked_in_at` | timestamptz NULL | |
| `called_at` | timestamptz NULL | |
| `processing_started_at` | timestamptz NULL | |
| `completed_at` | timestamptz NULL | |
| `cancelled_at` | timestamptz NULL | |
| `recommendation_reason` | text NULL | Allocation engine's explanation, stored at creation for explainability |
| `created_by` | uuid NOT NULL | FK → `profiles(id)`; farmer self-service vs operator-created |
| `created_at` | timestamptz NOT NULL | |

**Constraints**

- `UNIQUE (centre_id, service_date, token)` — token scope is per centre per
  day, which is what the display format implies.
- `UNIQUE (centre_id, service_date, processing_operator_id) WHERE status = 'IN_PROGRESS'`
  — see §7.4.
- Status/timestamp coherence enforced by trigger (e.g. `CHECKED_IN`
  requires `checked_in_at`; `COMPLETED` requires `completed_at`).

**Indexes**

- `(centre_id, service_date, status)` — operator queue and counts
- `(centre_id, service_date, status, checked_in_at)` — queue ordering
- `(farmer_id, created_at DESC)` — `/farmer/bookings`
- `(slot_id)` — capacity counting

**Why farmer identity is snapshotted onto the booking.** The operator queue
must display a farmer name and a (masked) phone. Without snapshots, every
operator needs read access to `profiles` rows of farmers who hold bookings
at their centre — expressible in RLS, but it means a correlated subquery on
a PII table on the hottest read path, and it widens operator access to the
`profiles` table generally. With snapshots, **operators never need any
access to `profiles` at all**: the queue is one table, and the PII exposed
is exactly the two fields the job requires, only for bookings at their own
centre. It is also the more correct record: a booking should say who the
farmer was when they booked. The tradeoff — a later name correction does
not propagate to historical bookings — is the desired behaviour for a
transaction record, and can be handled for *future* bookings only.

Phone masking (`98XXXXXX21`) stays a presentation concern, as
`docs/SECURITY.md` already decided; RLS governs whether the row is
reachable, masking governs what is rendered.

### 7.3 Queue position — derived, and it must be a function

Queue membership: `status IN ('CHECKED_IN','CALLED','IN_PROGRESS')` for a
given `(centre_id, service_date)`. Ordering: `checked_in_at ASC` (arrival
order among checked-in farmers), which matches the implemented UI.

Position is **never stored**. Storing it means rewriting every row on every
call, no-show, and cancellation.

**Critical correctness note.** A farmer's position cannot be computed by a
window function inside a normal RLS-protected view. RLS filters rows
*before* the window sees them, so a farmer querying such a view sees only
their own row and `row_number()` returns `1` for everyone. This is a silent
wrong-answer bug, not a permission error, which makes it the dangerous
kind. Position must therefore come from a `SECURITY DEFINER` function that
counts ahead-of-me rows server-side and returns only aggregates:

```
rpc_get_my_queue_position(booking_id)
  → { ahead_count, estimated_wait_minutes, now_serving_token }
```

The function verifies the caller owns the booking, then counts without
leaking any other farmer's row.

### 7.4 Concurrency: multiple operators, one centre

The approved requirement is explicit that several operators work the same
centre simultaneously from different machines. That conflicts with a naive
"one farmer in progress per centre" constraint — which the single "Current
Processing" card might otherwise suggest.

Resolution: **the centre may have several farmers in progress; each
operator may have at most one.**

`UNIQUE (centre_id, service_date, processing_operator_id) WHERE status = 'IN_PROGRESS'`

This reads the implemented UI correctly rather than contradicting it: the
"Current Processing" card shows *the farmer this operator is serving*,
which is the only sensible per-user meaning, and needs no UI change. It
also directly prevents one operator double-calling. The separate risk — two
*different* operators grabbing the same waiting farmer — is prevented by
row locking inside `rpc_call_next_farmer` (§14, race R-1), not by this
index.

---

## 8. Processing workflow — three state machines, one projection

Per the phase instruction to avoid one giant enum, the seven-step stepper
is a **presentation projection**, not a stored value:

| Stepper step | Real source |
|---|---|
| Registration | `profiles` row exists (account created) |
| Slot Booking | `bookings.status >= BOOKED` |
| Check-In | `bookings.checked_in_at IS NOT NULL` |
| Quality Check | `procurement_records.quality_checked_at IS NOT NULL` |
| Weighment | `procurement_records.weighed_at IS NOT NULL` |
| Procurement | `procurement_records.procured_at IS NOT NULL` |
| Payment | `payment_records.status` |

The current step index the UI already consumes is computed by one pure
function over those fields (`derive_workflow_stage(booking)`), server-side
or in a shared library. **There is no `stage` column** — the Phase 0.5
draft's `procurement_records.stage` enum is removed, because a stage column
can contradict the timestamps that prove what actually happened, and when
they disagree there is no principled way to decide which is right.

### 8.1 `procurement_records`

1:1 with a booking; created when processing starts.

| Column | Type | Notes |
|---|---|---|
| `booking_id` | uuid PK | FK → `bookings(id)` |
| `quality_result` | `quality_result` NULL | `ACCEPTED │ ACCEPTED_WITH_DEDUCTION │ REJECTED` |
| `quality_note` | text NULL | Short free text; **not** a lab report |
| `quality_checked_at` / `quality_checked_by` | timestamptz / uuid NULL | |
| `gross_weight_quintal` | numeric NULL | |
| `accepted_quantity_quintal` | numeric NULL | The quantity actually procured |
| `weighed_at` / `weighed_by` | timestamptz / uuid NULL | |
| `procured_at` / `procured_by` | timestamptz / uuid NULL | |

`CHECK (accepted_quantity_quintal IS NULL OR gross_weight_quintal IS NULL
OR accepted_quantity_quintal <= gross_weight_quintal)`.

---

## 9. Quality check — minimal by design

Per the instruction not to build a laboratory system, and
`docs/BUSINESS_LOGIC.md`'s standing decision that the **authorised centre
staff** make the quality decision and any farmer-facing readiness indicator
is advisory only:

- Stored: an **outcome** (three values), an optional **short note**, and
  **who/when**. Nothing else.
- Not stored: moisture percentage, foreign-matter percentage, grade
  matrices, sample identifiers, lab references. None of these appear in any
  implemented screen, and inventing them would imply an authority the
  system does not have.
- `attribution matters here more than detail`: `quality_checked_by` is the
  point of the record. A rejection must be traceable to a named officer.

**Farmer-side advisory readiness** (a "bring your crop in this condition"
hint) requires **no table at all** — it is static guidance content, already
implemented as `procurement_centres.guidance_note`. If it ever becomes
per-crop, it becomes a column on `commodities`, not a quality record.

---

## 10. Payment — status only

### 10.1 `payment_records`

| Column | Type | Notes |
|---|---|---|
| `booking_id` | uuid PK | FK |
| `status` | `payment_status` NOT NULL DEFAULT `'PENDING'` | `PENDING │ PROCESSING │ PAID │ FAILED` |
| `status_updated_at` | timestamptz NOT NULL | |
| `status_updated_by` | uuid NULL | FK → `profiles(id)`; NULL if set by an import |
| `failure_note` | text NULL | Only meaningful with `FAILED` |

**No amount, no bank reference, no transaction ID.** Three reasons, and the
third is the important one:

1. No implemented screen shows any of them — `PaymentStatusCard` renders a
   status and an explicit "payment itself is handled outside this
   application" line.
2. An amount would require MSP rate data the project does not have
   (`OQ-8`).
3. **A transaction ID generated by this application would be a fabrication.**
   A UTR is issued by a banking system. Storing a locally-generated string
   in a field farmers would read as an official payment reference is the
   kind of thing that looks harmless in a prototype and is indefensible in
   a government service. If a real reference ever arrives from an external
   import, it gets a column then, documented as externally-sourced and
   never generated here.

`FAILED` is included because a farmer needs to know a payment did not go
through; it is a status the system *reports*, never one it *causes*.

Transition guard (trigger): `PAID` is terminal except to `FAILED` by a
Master Admin correction; `PENDING → PAID → PENDING` regressions are
rejected (§15, C-6).

---

## 11. Notifications

### 11.1 `notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `farmer_id` | uuid NOT NULL | FK → `profiles(id)` |
| `booking_id` | uuid NULL | FK; most but not all notifications relate to a booking |
| `centre_id` | uuid NULL | FK; for centre-wide events |
| `type` | `notification_type` NOT NULL | `BOOKING_CONFIRMED │ SLOT_CHANGED │ QUEUE_APPROACHING │ CENTRE_DELAYED │ CENTRE_PAUSED │ PROCUREMENT_COMPLETED │ PAYMENT_STATUS_CHANGED` |
| `channel` | `notification_channel` NOT NULL | `IN_APP │ SMS_MOCK` — real `SMS` is a future enum value, not a schema change |
| `title` / `body` | text NOT NULL | Rendered text, composed at write time |
| `status` | `notification_status` NOT NULL DEFAULT `'QUEUED'` | `QUEUED │ SENT │ FAILED` |
| `created_at` / `sent_at` / `error_note` | | |

Index: `(farmer_id, created_at DESC)`.

Design intent: the table is the outbox. Today a mock adapter marks rows
`SENT` on the `SMS_MOCK` channel; tomorrow a real worker reads `QUEUED`
rows on an `SMS` channel and updates them. **No SMS provider is chosen,
integrated, or assumed** — and nothing outside the adapter reads this table
to decide behaviour, so a missing provider never breaks the app.

`QUEUE_APPROACHING` deserves a note: it is triggered by *someone else's*
queue progression. It must be generated server-side (trigger or RPC on
queue advance), never by the farmer's client noticing its own position
changed — a closed client sends nothing.

---

## 12. Realtime design

Published tables (explicit publication membership — nothing is realtime by
accident):

| Table | Subscribers | Why |
|---|---|---|
| `centre_status` | Farmer, Operator, Admin | Status changes must reach farmers immediately (`docs/DEMO.md` steps 11–12) |
| `centre_queue_state` | Farmer, Operator, Admin | The queue aggregate — see below |
| `bookings` | Operator (own centre), Farmer (own rows) | Operator queue list; farmer's own booking state |
| `procurement_records` | Farmer (own), Operator (own centre) | Live workflow stepper progress |

Explicitly **not** published: `audit_events` (append-only firehose; the
Admin activity feed refetches), `profiles`, `payment_records` (low
frequency; refetch on booking change is sufficient).

### 12.1 `centre_queue_state` — the deliberate denormalisation

| Column | Type |
|---|---|
| `centre_id` + `service_date` | composite PK |
| `waiting_count` | int |
| `in_progress_count` | int |
| `now_serving_token` | text NULL |
| `last_called_at` | timestamptz NULL |
| `updated_at` | timestamptz |

Trigger-maintained from `bookings`.

**Why this must exist.** A farmer's queue position changes when *another
farmer* is called. RLS correctly forbids the farmer from reading that other
row — so a farmer subscribed only to their own booking receives **no event
at all** when the thing they care about changes. Without this table, live
queue updates for farmers are impossible without either weakening RLS or
polling.

This row contains no personal data (counts and a token), is safe for any
authenticated farmer to read, and gives a single cheap subscription that
says "something in this queue moved" — the client then calls
`rpc_get_my_queue_position` to refresh its own numbers. One denormalised
row per centre per day, maintained by a trigger, is a small price for
correct realtime under RLS.

Operational note: set `REPLICA IDENTITY` deliberately. `FULL` sends the
entire old row on updates, which then has to pass the same RLS check — a
needless widening of what crosses the wire. Default (primary key) is right
for these tables.

---

## 13. Views and functions

**Views**

- `v_centre_availability` — per centre per date: `slot_capacity`,
  `booked_count`, `remaining_slots`, `quantity_capacity_quintal`,
  `booked_quantity_quintal`, `remaining_quantity_quintal`,
  `utilisation_pct`, `waiting_count`, `processing_rate_per_hour`,
  `estimated_delay_minutes`, `effective_status`. Backs `/admin`,
  `/admin/capacity`, `/farmer/centre`, `/operator/capacity`, and the
  allocation engine. One view, five screens, no duplicated arithmetic.
- `v_centre_daily_summary` — `SHOULD HAVE`; avg wait
  (`avg(called_at − checked_in_at)`), peak concurrent waiting, uptime.
  Uptime needs `centre_status_events` (§5.2).

**Functions** (all `SECURITY DEFINER`, `STABLE` where read-only, minimal
surface, each validating the caller):

| Function | Purpose |
|---|---|
| `auth_role()` | Caller's role without triggering `profiles` RLS recursion |
| `auth_centre_ids()` | Caller's active centre ids |
| `auth_is_master_admin()` | Convenience predicate |
| `rpc_create_booking(...)` | Capacity check + token allocation, atomically (R-2, R-3) |
| `rpc_check_in(booking_id)` | Operator marks arrival |
| `rpc_call_next_farmer(centre_id)` | Locks queue head, attributes to caller (R-1) |
| `rpc_record_quality(...)` / `rpc_record_weighment(...)` / `rpc_complete_procurement(...)` | Processing steps with attribution |
| `rpc_set_centre_status(centre_id, status, reason)` | Status change + history + audit |
| `rpc_get_my_queue_position(booking_id)` | Farmer's position without exposing other rows (§7.3) |

---

## 14. Race conditions and the transactions that fix them

| # | Race | Failure mode | Fix |
|---|---|---|---|
| R-1 | Two operators call next simultaneously | Same farmer called twice; two "now serving" | `rpc_call_next_farmer` selects the head row `FOR UPDATE SKIP LOCKED`, re-checks status inside the transaction, then transitions |
| R-2 | Two farmers claim the last slot | Overbooking | `rpc_create_booking` takes `SELECT ... FOR UPDATE` on the `slots` row, counts bookings, compares against both capacities, inserts — all in one transaction |
| R-3 | Concurrent token generation | Duplicate `WHT-142` | Allocate inside the same locked transaction; `UNIQUE (centre_id, service_date, token)` is the backstop; retry on conflict |
| R-4 | Operator completes a booking another operator already completed | Double procurement record | State-transition guard in the RPC (`WHERE status = 'IN_PROGRESS'` and row count check) |
| R-5 | Status change races a capacity change | Stale `effective_status` | `effective_status` is derived at read time, so it cannot go stale — a direct benefit of §6 |

`docs/SECURITY.md`'s standing decision that these mutations go through
server-side RPCs rather than direct client writes is what makes all of the
above enforceable.

---

## 15. UI → data mapping

Every implemented screen, what it needs, and where it comes from. Route
names are the **actual implemented routes**; the phase brief's
`/operator/farmers` is implemented as `/operator/processing` ("Farmer
Processing" in the nav).

### Farmer

| Route | Data needed | Source | Derived | Access |
|---|---|---|---|---|
| `/farmer` | Next booking (centre, date/time, token, status), farmers ahead, est. wait, centre status, workflow stage, payment status, notifications | `bookings` + `procurement_centres` + `centre_status` + `payment_records` + `notifications` | `ahead_count`, `estimated_wait_minutes` via `rpc_get_my_queue_position`; stepper index via `derive_workflow_stage` | Own rows only |
| `/farmer/bookings` | Booking history: token, centre, date/time, status, crop, quantity | `bookings` ⋈ `procurement_centres` ⋈ `commodities` | — | Own rows only |
| `/farmer/bookings/new` | Centre options, crop options, slot options, capacity/status per centre | `v_centre_availability`, `commodities`, `centre_commodities`, `slots` | Eligibility filter; later the allocation recommendation | Read: all active centres. Write: `rpc_create_booking` |
| `/farmer/queue` | Own token, position, ahead count, est. wait, processing rate, now-serving token | `rpc_get_my_queue_position` + `centre_queue_state` | Position, ETA | Own booking; aggregate row is non-personal |
| `/farmer/centre` | Centre name/location/status, capacity, remaining, rate, delay, slots available, guidance | `v_centre_availability` + `procurement_centres` | Remaining, utilisation, `effective_status` | Read-only, any authenticated user |

### Operator (all scoped to assigned centre)

| Route | Data needed | Source | Derived | Access |
|---|---|---|---|---|
| `/operator` | Centre status + controls, farmers waiting, processing now, capacity, remaining, live queue, current processing + stage, upcoming bookings, alerts, daily summary | `centre_status`, `v_centre_availability`, `bookings`, `procurement_records`, `centre_status_events` | Counts, ETA, stage projection, summary stats | Own centre; writes via RPCs |
| `/operator/queue` | Ordered queue: token, farmer name, masked phone, status, est. wait | `bookings` (snapshots — no `profiles` access) | Order, per-row ETA | Own centre |
| `/operator/processing` | Current farmer, crop, expected/recorded quantity, stage, actions | `bookings` ⋈ `procurement_records` | Stage projection | Own centre; own in-progress booking |
| `/operator/bookings` | All bookings for centre + filters | `bookings` | — | Own centre |
| `/operator/capacity` | Capacity, booked, available, utilisation, processing rate | `v_centre_availability`, `centre_operating_days` | Remaining, utilisation | Own centre |
| `/operator/status` | Current status, change controls, delay reason | `centre_status` | — | Own centre; write via `rpc_set_centre_status` |

### Master Admin (system-wide)

| Route | Data needed | Source | Derived | Access |
|---|---|---|---|---|
| `/admin` | Total centres, open count, farmers waiting (all), total capacity, centres needing attention, per-centre cards, status distribution, system utilisation, role counts, recent activity | `v_centre_availability` (all rows), `centre_assignments`, `profiles`, `audit_events` | Attention state, aggregates | All centres |
| `/admin/centres` | Per centre: status, capacity, assigned Centre Admin, operator count, activate/deactivate | `procurement_centres` ⋈ `centre_assignments` ⋈ `profiles` ⋈ `v_centre_availability` | Attention state | All centres; writes Master Admin only |
| `/admin/capacity` | Per centre capacity, booked, remaining, utilisation, waiting, delay, rate, congestion state | `v_centre_availability` | Utilisation, attention state, sort order | All centres |
| `/admin/activity` | Audit feed: what/where/who/when | `audit_events` | — | Master Admin (all); Centre Admin scoped by `centre_id` |

**Attention state** (`NORMAL │ NEAR_CAPACITY │ CONGESTED │ DELAYED │ PAUSED
│ FULL │ CLOSED`) is already implemented as a pure function in
`lib/demo/adminDashboard.ts`. It moves to the view or stays a shared pure
function over view rows — either way it is derived, never stored, and
operator-reported status always outranks the capacity heuristic (already
the implemented behaviour).

---

## 16. Audit

### `audit_events` (append-only)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `occurred_at` | timestamptz NOT NULL DEFAULT now() | |
| `actor_profile_id` | uuid NULL | NULL = system/automated |
| `actor_role_snapshot` | `user_role` NULL | Role **at the time**, not current |
| `actor_name_snapshot` | text NULL | Survives rename/deletion |
| `centre_id` | uuid NULL | Scopes Centre Admin visibility |
| `entity_type` | text NOT NULL | `booking │ centre_status │ profile │ centre_assignment │ procurement_record │ payment_record │ centre` |
| `entity_id` | uuid NULL | |
| `action` | text NOT NULL | `CENTRE_STATUS_CHANGED`, `DELAY_REPORTED`, `CENTRE_PAUSED`, `CENTRE_RESUMED`, `BOOKING_CHECKED_IN`, `QUEUE_CALLED_NEXT`, `PROCUREMENT_COMPLETED`, `PAYMENT_STATUS_CHANGED`, `CENTRE_ADMIN_ASSIGNED`, `OPERATOR_ASSIGNED`, `ASSIGNMENT_REVOKED`, `ACCOUNT_ROLE_CHANGED`, `ACCOUNT_SUSPENDED` |
| `summary` | text NOT NULL | Human-readable, composed at write time (what `/admin/activity` renders) |
| `metadata` | jsonb NULL | Before/after values; **must never contain full phone numbers or credentials** |

Indexes: `(occurred_at DESC)`, `(centre_id, occurred_at DESC)`,
`(entity_type, entity_id)`.

**Snapshots, not joins.** Actor role and name are copied in at write time.
Joining to `profiles` at read time would rewrite history: an operator
promoted to Centre Admin would appear to have always been one, and a
deleted account would blank out its own trail. For an audit log that exists
to answer "who did this, with what authority, at the time", live joins are
simply wrong.

**Written by database triggers, not application code.** Application-written
audit can be forgotten in a new code path, bypassed by any direct database
write, and skipped entirely by a service-role script. Triggers on
`centre_status`, `bookings`, `procurement_records`, `payment_records`,
`centre_assignments`, and `profiles` (role/account_status columns) cannot
be.

**Actor attribution under the service role.** Inside a trigger,
`auth.uid()` is NULL when a server action runs with the service role. Any
privileged server path must therefore set a transaction-local setting
(`SET LOCAL app.actor_profile_id = '<uuid>'`) that the trigger reads and
prefers over `auth.uid()`. Without this, every privileged action lands in
the audit log as an anonymous "system" event — which is precisely the case
where attribution matters most. This is a Phase 3B implementation
requirement, not an optional nicety.

**Append-only enforcement**: no `UPDATE`/`DELETE` grants to any client role
for any reason; `SELECT` restricted per §RLS in `docs/SECURITY.md`.

---

## 17. Smart-allocation inputs (data only — engine is not built)

`v_centre_availability` is designed to be the engine's single input query.
For a farmer request of *(commodity, quantity, preferred date)* it already
supplies, per candidate centre:

- `effective_status` — enforces "never recommend `CLOSED`; do not recommend
  `PAUSED`" (`docs/BUSINESS_LOGIC.md`)
- `remaining_quantity_quintal` — enforces "insufficient capacity for the
  farmer's quantity is not a candidate"
- `remaining_slots`, plus per-slot availability from `slots` — enforces "a
  slot with no remaining availability is not a candidate"
- `waiting_count`, `processing_rate_per_hour`, `estimated_delay_minutes` —
  congestion and ETA inputs
- `centre_commodities` — crop eligibility
- `district`/`state` text — weak suitability signal, honestly labelled

`bookings.recommendation_reason` stores the explanation at booking time, so
a recommendation stays auditable after the inputs change — which is what
"explainable" has to mean in practice.

**No ranking formula is designed here.** That remains deliberately open
(`docs/BUSINESS_LOGIC.md`), and no ML, scoring table, or geospatial
infrastructure is introduced.

---

## 18. Migration order (for Phase 3B)

Ordered by hard dependency, with the safety property that **RLS is never
"added later"** — every table gets its policies in the same migration that
creates it. A table that exists for one commit without policies is a table
that can leak in that commit.

| # | Migration | Depends on | Notes |
|---|---|---|---|
| 1 | Enums + `profiles` + `auth.users` trigger + column grants + role-change guard | — | Identity first; nothing else is expressible without `auth_role()` |
| 2 | `auth_role()` / `auth_centre_ids()` / `auth_is_master_admin()` helpers | 1 | Needed by every later policy; must exist before the first policy that calls them |
| 3 | `commodities`, `procurement_centres`, `centre_commodities` | 1–2 | Reference data; low risk |
| 4 | `centre_assignments` + policies | 1–3 | Completes the access model — after this, "scoped to my centre" is expressible |
| 5 | `centre_status` + `centre_status_events` + trigger | 3–4 | |
| 6 | `centre_operating_days`, `slots` | 3 | Capacity model |
| 7 | `bookings` + constraints + indexes | 4–6 | The core table; needs capacity and assignment first |
| 8 | `centre_queue_state` + maintenance trigger | 7 | |
| 9 | `procurement_records`, `payment_records` | 7 | |
| 10 | `audit_events` + triggers across 5,7,9,4,1 | all above | Deliberately late: triggers attach to tables that must already exist. Trade-off accepted — nothing is in production before this |
| 11 | Views (`v_centre_availability`, summary) | 3–9 | |
| 12 | RPC functions | 7–11 | |
| 13 | Realtime publication membership | 5,7,8,9 | Last: publish only after policies are proven |
| 14 | Seed data (centres, commodities, slots, demo accounts) | all | |

**Deviation from the brief's suggested order**, with reason: the brief put
RLS at step 10 and realtime at 11. Deferring RLS to a single late migration
means every table between creation and step 10 is unprotected, and the
"add policies" step becomes a large, error-prone batch where one omission
is invisible. Policies belong with their table. Realtime genuinely does go
last — publishing a table before its policies are verified is the one
ordering mistake that leaks data to subscribers silently.

---

## 19. Open questions and assumptions

Numbered for reference from the other docs and the final report.

| # | Question | Why it matters | Recommendation |
|---|---|---|---|
| `OQ-1` | **Capacity unit: farmers or quintals?** The UI mixes both (§4.3) | Wrong choice makes every capacity number, the "slots available" figure, and the allocation engine's core rule incoherent | Model both (`slot_capacity` + `quantity_capacity_quintal`) and correct the UI labels in 3B. **Needs user confirmation** |
| `OQ-2` | Does one booking consume one slot regardless of quantity? | Determines whether a 2-quintal and a 40-quintal farmer cost the same throughput | `ASSUMPTION`: yes, one booking = one slot; quantity is checked separately against volume capacity |
| `OQ-3` | Who sets payment status, and from what trigger? | Currently no actor is defined; the operator UI has no payment control | `ASSUMPTION`: Centre Admin/Master Admin sets it manually in MVP; a real feed replaces this later |
| `OQ-4` | Can a no-show farmer re-enter the queue same day? | If yes, `bookings` alone cannot hold queue membership and `queue_entries` returns | `ASSUMPTION`: no re-queue in MVP; operator creates a new booking if needed |
| `OQ-5` | Walk-in farmers with no prior booking? | Same structural consequence as `OQ-4` | `ASSUMPTION`: not supported; `bookings.created_by` already allows an operator to create one on the farmer's behalf |
| `OQ-6` | Can a farmer hold multiple active bookings (same day, different centres)? | Gaming/hoarding of scarce slots | Recommend: at most one active booking per farmer per `service_date`, as a partial unique index. **Needs confirmation** |
| `OQ-7` | Quality `REJECTED` — what happens to the booking and the queue? | Determines whether procurement completes with zero quantity or the booking ends differently | Recommend: booking still `COMPLETED`, `accepted_quantity_quintal = 0`, reason in `quality_note` — the visit did happen and must stay auditable |
| `OQ-8` | Payment amount / MSP rates | Cannot compute value without policy rate data | Out of MVP scope; no amount stored (§10) |
| `OQ-9` | Can a Centre Admin override an Operator's centre status? | Hierarchy implies yes; never stated | `ASSUMPTION`: yes — Centre Admin has Operator's rights at their centre |
| `OQ-10` | Timezone for `service_date` and "today" | Midnight boundary bugs; UTC server vs IST users | `DECISION`: all day-boundary logic uses `Asia/Kolkata`; `service_date` is a stored `date`, never derived from a client clock |
| `OQ-11` | Unprocessed farmers at end of day | Carry over, auto-no-show, or manual? | `ASSUMPTION`: manual operator action in MVP; no automatic job |
| `OQ-12` | Single crop per booking? | Token prefix and quantity accounting assume one | `ASSUMPTION`: yes, one commodity per booking; a mixed load is two bookings |

---

## 20. Revisions to earlier design

Recorded explicitly so no prior decision changes silently.

| Change | From (Phase 0.5 draft) | To (this design) | Why |
|---|---|---|---|
| Queue table | Separate `queue_entries` | Merged into `bookings` | 1:1, duplicated status enums, no independent lifecycle; §7.1 |
| `CHECKED_IN` vs `WAITING` | Open question | Same state | Falls out of the merge; §7.1 |
| Farmer table | Separate `farmers` | Folded into `profiles` | One nullable column did not justify a table; §3.1 |
| Centre assignment | `profiles.centre_id` | `centre_assignments` table | Audit and revocation history; §3.2 |
| `FULL` status | Open question | Derived, not operator-set | Two sources of truth for one fact; §6 |
| Processing stage | `procurement_records.stage` enum | Derived from timestamps | A stage column can contradict its own evidence; §8 |
| Capacity | Single `daily_capacity` | `slot_capacity` + `quantity_capacity_quintal` | The UI already needs both; §4.3 |
| Farmer identity on queue | Join to `profiles` | Snapshot on `bookings` | Removes operator access to `profiles` entirely; §7.2 |
| Audit actor | `actor_id` FK only | FK + role/name snapshots | Live joins rewrite history; §16 |
| Payment | `SIMULATED_FAILED`, transaction id implied | `PENDING│PROCESSING│PAID│FAILED`, no reference field | Never fabricate a payment reference; §10 |
| Status history | Not modelled | `centre_status_events` | "Centre uptime" is not computable from current state; §5.2 |
| Queue aggregate | Not modelled | `centre_queue_state` | Farmers cannot receive realtime queue events otherwise; §12.1 |

---

## Why no SQL yet

This phase is design-only by instruction. The deeper reason to hold: three
decisions here (`OQ-1` capacity units, `OQ-6` multiple active bookings, and
the §6 `FULL` recommendation) touch previously-approved product decisions
and should be confirmed before they are frozen into migrations. Writing SQL
first would make the confirmation cosmetic.
