# Database — Proposed Data Model

`PLANNED` — this is a proposal only. No SQL, no migrations, no tables exist
yet. Derived from `docs/UI_SPEC.md` §F (UI Data Requirements). Field lists
are MVP-focused; anything not needed by a documented screen is left out
rather than spec'd speculatively.

Field flags: `REQUIRED MVP` · `OPTIONAL` · `DERIVED` (computed, not
necessarily stored as its own column — flagged so it isn't blindly
duplicated).

---

## `profiles`

**Purpose**: extends Supabase `auth.users` with role and identity fields
shared by all three roles.

- `id` (PK, FK → `auth.users.id`) — REQUIRED MVP
- `role` (`farmer | operator | admin`) — REQUIRED MVP
- `name` — REQUIRED MVP
- `phone` — REQUIRED MVP
- `centre_id` (FK → `procurement_centres.id`, nullable) — REQUIRED MVP for
  operator role (assigned centre); `ASSUMPTION`: one operator → one centre
  (see `docs/SECURITY.md` open question)

**UI needed by**: Login/identity display across all screens.
**Owner**: each user owns/reads their own row; admin can read all.

---

## `farmers`

**Purpose**: farmer-specific extension data, kept separate from `profiles`
so operator/admin rows don't carry unused farmer fields.

- `profile_id` (PK, FK → `profiles.id`) — REQUIRED MVP
- `village_or_location` — OPTIONAL (only if used in eligibility/UI copy)
- `default_crop` — OPTIONAL

**UI needed by**: Farmer Dashboard, New Booking (pre-fill).
**Owner**: farmer (own row); operator/admin read as needed via booking
joins only, not direct broad access.

---

## `procurement_centres`

**Purpose**: master data for each physical centre.

- `id` (PK) — REQUIRED MVP
- `name` — REQUIRED MVP
- `location` — REQUIRED MVP
- `daily_capacity` — REQUIRED MVP
- `processing_rate` (units/hour) — REQUIRED MVP
- `accepted_crops` — REQUIRED MVP (needed for allocation-engine eligibility
  per `docs/BUSINESS_LOGIC.md`)

**UI needed by**: Farmer Recommendation/Alternative Centres, Operator
Dashboard, Admin Centres Overview.
**Owner**: admin manages; farmer/operator read.

---

## `centre_status`

**Purpose**: current live operational state of a centre — operator-provided
per `docs/BUSINESS_LOGIC.md`'s operator-provided/system-derived split.

- `centre_id` (PK/FK → `procurement_centres.id`, one current row per centre,
  or latest-row pattern) — REQUIRED MVP
- `status` (`OPEN | DELAYED | PAUSED | FULL | CLOSED`) — REQUIRED MVP
- `delay_reason` — OPTIONAL (present when status = DELAYED)
- `updated_at` — REQUIRED MVP
- `updated_by` (FK → `profiles.id`) — REQUIRED MVP (accountability, feeds
  `status_events`)

**UI needed by**: Operator Centre Status control, Farmer Centre Status
(Realtime), Admin Centre Status Visibility.
**Owner**: operator (own centre) writes; farmer/admin read; Realtime-
subscribed.

---

## `slots`

**Purpose**: bookable time slots per centre per day.

- `id` (PK) — REQUIRED MVP
- `centre_id` (FK) — REQUIRED MVP
- `date` — REQUIRED MVP
- `start_time` / `end_time` — REQUIRED MVP
- `capacity` — REQUIRED MVP
- `booked_count` — REQUIRED MVP (or DERIVED from counting `bookings`;
  `TODO — VERIFY DURING PHASE 1` whether to store a counter for query
  simplicity vs. derive live — leaning DERIVED per the anti-duplication
  principle below, final call at implementation time)

**UI needed by**: Farmer Slot Selection, Operator Capacity & Slots.
**Owner**: admin/operator manage; farmer reads available slots.

---

## `bookings`

**Purpose**: a farmer's reservation — the central linking entity.

- `id` (PK) — REQUIRED MVP
- `farmer_id` (FK → `farmers.profile_id`) — REQUIRED MVP
- `centre_id` (FK) — REQUIRED MVP
- `slot_id` (FK) — REQUIRED MVP
- `crop` — REQUIRED MVP
- `quantity` — REQUIRED MVP
- `status` (`BOOKED | CHECKED_IN | PROCESSING | COMPLETED | CANCELLED |
  NO_SHOW`) — REQUIRED MVP (`TODO — VERIFY DURING PHASE 1`: final enum list
  — see open question in `docs/PROJECT_STATE.md` on WAITING vs. CHECKED_IN)
- `created_at` — REQUIRED MVP
- `recommendation_reason` — OPTIONAL (store the allocation engine's
  explanation string at booking time, for later reference/demo value)

**UI needed by**: Farmer Booking Detail/Check-in, Operator Bookings List,
Operator Centre Overview (counts).
**Owner**: farmer (own rows) read/write within allowed transitions;
operator (own centre) reads/writes; admin reads.

---

## `queue_entries`

**Purpose**: live queue state, separate from `bookings` so queue-specific
fields (position, live status) don't bloat the booking record.

- `id` (PK) — REQUIRED MVP
- `booking_id` (FK, 1:1 with a checked-in booking) — REQUIRED MVP
- `centre_id` (FK) — REQUIRED MVP
- `token` — REQUIRED MVP (display identifier, e.g. `WHT-142`)
- `position` — DERIVED (computed by ordering, not necessarily a stored
  column — `TODO — VERIFY DURING PHASE 1`)
- `status` (`WAITING | CALLED | PROCESSING | COMPLETED` — plus optionally
  `NO_SHOW`) — REQUIRED MVP
- `entered_at` — REQUIRED MVP
- `estimated_wait_minutes` — DERIVED (from position × processing rate; not
  stored as ground truth, computed at read/subscribe time)

**UI needed by**: Operator Live Queue, Farmer Live Queue (Realtime on both).
**Owner**: operator (own centre) writes (call next, mark no-show, complete);
farmer reads own entry; Realtime-subscribed.

---

## `procurement_records`

**Purpose**: outcome/progress of the physical processing stages.

- `booking_id` (PK/FK, 1:1 with `bookings`) — REQUIRED MVP
- `stage` (`CHECK_IN | QUALITY_CHECK | WEIGHMENT | PROCUREMENT | PAYMENT` —
  per `docs/BUSINESS_LOGIC.md`) — REQUIRED MVP
- `expected_quantity` — REQUIRED MVP
- `recorded_quantity` / `graded_quantity` — REQUIRED MVP once quality
  check/weighment happens; nullable before then
- `stage_updated_at` — REQUIRED MVP

**UI needed by**: Operator Current Processing, Farmer Procurement Status.
**Owner**: operator (own centre) writes; farmer reads own record.

---

## `payment_status`

**Purpose**: status-only payment tracking — explicitly not a transaction
record (`docs/BUSINESS_LOGIC.md`).

- `booking_id` (PK/FK, 1:1 with `bookings`) — REQUIRED MVP
- `status` (`PENDING | PROCESSED | SIMULATED_FAILED`, naming
  `TODO — VERIFY DURING PHASE 1`) — REQUIRED MVP
- `updated_at` — REQUIRED MVP

**UI needed by**: Farmer Payment Status.
**Owner**: operator/admin sets (simulated); farmer reads own.

---

## `notifications`

**Purpose**: outbound notification log, written by the mock SMS adapter
(`docs/ARCHITECTURE.md`).

- `id` (PK) — REQUIRED MVP
- `farmer_id` (FK) — REQUIRED MVP
- `type` (e.g. `BOOKING_CONFIRMED`, `CALLED_NEXT`, `DELAY_UPDATE`) —
  REQUIRED MVP
- `message` — REQUIRED MVP
- `channel` (`sms-mock`) — REQUIRED MVP (explicit so it's never confused
  with a real channel)
- `status` (`LOGGED` — no real "sent/delivered" states are meaningful for a
  mock) — REQUIRED MVP
- `sent_at` — REQUIRED MVP

**UI needed by**: not directly a farmer-facing screen in the MVP list, but
backs any in-app "recent notifications" affordance if built; primarily a
demo/audit artifact (`docs/DEMO.md` step 15).
**Owner**: system-written; farmer reads own.

---

## `status_events`

**Purpose**: audit/history trail feeding Admin System Activity.

- `id` (PK) — REQUIRED MVP
- `entity_type` (`booking | centre_status | queue_entry | ...`) — REQUIRED
  MVP
- `entity_id` — REQUIRED MVP
- `event` (short description/type) — REQUIRED MVP
- `actor_id` (FK → `profiles.id`) — REQUIRED MVP
- `created_at` — REQUIRED MVP

**UI needed by**: Admin System Activity.
**Owner**: system-written on relevant mutations; admin reads.

---

## Anti-duplication note

Per the source instructions: values that are obviously derivable (remaining
capacity, queue position, estimated wait, utilization) are flagged `DERIVED`
above rather than given a blind stored column. Final call on "stored counter
vs. computed at read time" per field is a `TODO — VERIFY DURING PHASE 1`
implementation decision, made when real query-performance needs are known —
not assumed now.

## Not yet decided

- Exact `bookings.status` and `queue_entries.status` enum values (see
  `docs/PROJECT_STATE.md` open questions).
- Whether `slots.booked_count` is stored or derived.
- Whether `queue_entries.position` is stored or computed by ordering.
- No SQL types, constraints, indexes, or RLS policies are specified in this
  document — that is explicitly deferred to implementation.
