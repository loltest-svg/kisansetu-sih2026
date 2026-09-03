# Business Logic (planned, deterministic)

`PLANNED` — nothing in this document is implemented. These are the rules and
state machines to build against, not a description of existing code.

## Smart Allocation Engine

### Inputs

`DECISION` (Phase 3A.1): the MVP engine ranks on the **farmer-processing
dimension**; the quantity dimension is modelled and available but is not yet
a ranking input (`docs/DATABASE.md` §4.3).

**Primary (MVP):**
- Farmer: `crop`
- Per-centre: acceptance of `crop`, `effective_status`,
  `daily_farmer_capacity`, `farmers_remaining` (derived),
  `processing_rate_per_hour`
- Per-centre queue: `farmers_waiting` (active bookings)
- Per-slot: `farmer_capacity` and remaining availability
- Derived: `estimated_wait_minutes` per candidate centre

**Modelled, not yet ranked on:**
- Farmer: declared `quantity` (quintals) — recorded on the booking and
  checked against `quantity_remaining_quintal` for reporting; a hard block
  is `OQ-13`
- Per-centre: `daily_quantity_capacity_quintal`,
  `quantity_committed_quintal`, `quantity_remaining_quintal`

### Outputs

- `recommended_centre_id`
- `recommended_slot_id`
- `estimated_wait_minutes`
- `reason` — human-readable string, assembled from the same factors used to
  reach the decision (never a separately-authored narrative, so
  recommendation and explanation cannot drift apart)

### Rules — `DECISION`

- A `CLOSED` centre must never be recommended.
- A `PAUSED` centre must not be recommended for a new booking unless a later
  phase explicitly redesigns this (not assumed here).
- A centre with no remaining **farmer capacity** must not be recommended
  (this is the same condition that derives `FULL`).
- A slot with no remaining availability must not be recommended.
- `AMENDED (3A.1)`: the original form of this rule was "insufficient
  remaining capacity **for the farmer's quantity**". Under the locked
  capacity decision the MVP blocks on the farmer dimension and treats
  quantity as a warning (`OQ-13`), so the quantity form of the rule is
  deferred rather than dropped — it returns unchanged if `OQ-13` is
  resolved toward a hard block.
- The explanation text is generated from the same inputs used in the
  decision — no separate/inconsistent copy.

### Explicitly deferred

- The actual scoring/ranking formula (how candidate centres are ordered when
  more than one is eligible) is **not designed yet**. `TODO — VERIFY DURING
  PHASE 1` / later implementation task. This document intentionally does not
  invent one.
- ~~Whether `FULL` is a derived status~~ — **resolved in Phase 3A**: `FULL`
  is derived, never operator-set. See Dynamic Centre Status below.

## Dynamic Centre Status

`DECISION`: explicit distinction between operator-provided state and
system-derived metrics. Do not conflate the two in implementation or in UI
copy.

### Operator-provided (authoritative, operator sets/confirms it)

- `OPEN`, `DELAYED`, `PAUSED`, `CLOSED` — **`FULL` removed from this set in
  Phase 3A**, see below
- Operational delay reason (free text or short reason code)

### System-derived (computed from live data, never operator-typed)

- Waiting count (`bookings` where status = `CHECKED_IN`)
- `farmers_remaining` (derived: `daily_farmer_capacity − farmers_booked`)
- `quantity_remaining_quintal` (derived:
  `daily_quantity_capacity_quintal − quantity_committed_quintal`)
- Neither is stored redundantly; both are cached for display only in
  `centre_live_state` — see `docs/DATABASE.md` §12.1
- Processing-rate-based ETA
- Utilization percentage
- **`FULL`** — resolved below

### `FULL` — `DECISION` (Phase 3A)

`FULL` is **derived, not operator-set.** The other four states declare
operator *intent or availability*: the centre is open, running late,
temporarily halted, or shut. `FULL` is not an intent — it is the arithmetic
consequence of capacity being exhausted. Allowing it to be both set and
derived creates two contradicting sources of truth for one fact, and the
contradiction surfaces exactly when it hurts: an operator marks `FULL`, a
booking is cancelled, capacity frees up, and the centre stays wrongly
`FULL` until someone remembers to undo it.

- Operator-settable: `OPEN | DELAYED | PAUSED | CLOSED`.
- Derived for display and for allocation
  (`v_centre_availability.effective_status`): adds `FULL` when **farmer
  processing capacity** is exhausted. Quantity exhaustion is deliberately
  *not* a `FULL` trigger — it is a warning, not a booking block (`OQ-13`).
- Precedence, with the reasoning for each ordering and eight worked edge
  cases: `docs/DATABASE.md` §6.1–6.2. In short:
  `CLOSED > PAUSED > FULL > DELAYED > OPEN`.
- **The approved five-value vocabulary is preserved** — every screen still
  shows all five; `FULL` now comes from the derived value. The requirement
  was that the system *support* those states, and it does.
- An operator wanting to stop intake for a non-capacity reason already has
  `PAUSED`, which means precisely that.

Full definition and the exact precedence order: `docs/DATABASE.md` §6.

This does not weaken the standing rule below: nothing about `FULL` is
detected from equipment or sensors — it is computed from bookings and
capacity, both of which are operator/farmer-entered data.

`DECISION`: the platform does not claim automatic machine/equipment failure
detection. Any "delay" or "machine problem" shown in the UI is
operator-reported/verified — there is no sensor or automated fault-detection
system, and no copy anywhere should imply otherwise.

## Queue — state transitions

`DECISION` (Phase 3A) — one lifecycle enum on `bookings`, no separate queue
entity:

```
CONFIRMED → CHECKED_IN → CALLED → IN_PROGRESS → COMPLETED
    │            │          │
    ├────────────┴──────────┴──→ CANCELLED   (blocked once IN_PROGRESS)
    ├────────────┴──────────────→ NO_SHOW    (operator asserts non-arrival)
    └───────────────────────────→ EXPIRED    (system sweep; date passed)
```

Active (blocks a second booking): `CONFIRMED`, `CHECKED_IN`, `CALLED`,
`IN_PROGRESS`. Terminal: `COMPLETED`, `CANCELLED`, `NO_SHOW`, `EXPIRED`.

**`CHECKED_IN` and `WAITING` are the same state** — the open question is
resolved by collapsing it. A booking *is* waiting precisely when it is
checked in and not yet called; no second value can disagree with that.
"Farmers waiting" is a count of `CHECKED_IN` bookings, and queue order is
`checked_in_at ASC`.

The Phase 0.5 draft's separate `queue_entries` table is removed —
`docs/DATABASE.md` §7.1 has the full reasoning. In short: it would have been
1:1 with `bookings`, carried a near-duplicate status enum for the same
real-world fact, and been mutated by the same actions — a guaranteed drift
surface bought for nothing. It becomes justified again only if a booking can
re-enter the queue after a no-show (`OQ-4`) or if walk-ins without bookings
are supported (`OQ-5`); neither is in MVP scope.

`CANCELLED` and `NO_SHOW` are retained (not optional) — the implemented
Farmer booking history already renders `CANCELLED`, and no-shows are the
operator's stated queue action.

**Concurrency**: several operators work one centre simultaneously, so a
centre may have several bookings `IN_PROGRESS` at once — but each operator
at most one (`bookings.processing_operator_id`, enforced by a partial unique
index). The Operator dashboard's single "Current Processing" card therefore
means *the farmer this operator is serving*, which is the only coherent
per-user reading and needs no UI change.

## One active booking per farmer — `DECISION` (Phase 3A.1, locked)

**A farmer may hold at most one active booking at a time.** Active means
`CONFIRMED`, `CHECKED_IN`, `CALLED`, or `IN_PROGRESS`; the four terminal
statuses do not count and never block a rebooking.

The limit is **global, not per-date**: a farmer with a confirmed booking
for Thursday cannot also hold one for Friday, or one at another centre.
The purpose is to stop one account holding several scarce slots, and a
per-date limit would not do that.

Enforcement is a **partial unique index on `farmer_id` over the active
status set** — not application logic, because a check-then-insert leaves a
window in which two concurrent requests both pass the check. Full mechanics,
including the Postgres immutability constraint that forces the invariant to
be expressed in statuses rather than dates: `docs/DATABASE.md` §7.6.

Two consequences worth stating as rules rather than leaving implicit:

- **`EXPIRED` exists because of this invariant.** Without a path out of the
  active set for a booking nobody ever acted on, a farmer who books and
  never arrives is locked out of the system permanently. A scheduled sweep
  expires stale bookings (`docs/DATABASE.md` §7.7).
- **Reassignment is an update, never cancel-then-create.** Moving a farmer
  to a different slot or centre must modify the existing booking, so that
  exactly one row is in the active set at every instant. Cancel-then-create
  opens a window where the farmer has none — and, if it races, could leave
  them with two.

## Status edge cases — `DECISION` (Phase 3A.1)

What must happen when centre status and existing bookings disagree. None of
this is implemented; it is the specification Phase 3B builds against.

### Centre `CLOSED` while confirmed bookings exist

- **Bookings**: *not* auto-cancelled. Destroying a farmer's booking because
  someone toggled a status is worse than leaving a stale one — the farmer
  may have already travelled, and the centre may reopen within the hour.
- **Queue**: preserved as-is; no calling while closed.
- **Farmer display**: `CLOSED` plus an explicit notice that their booking
  may be affected, and a `CENTRE_CLOSED` notification.
- **Operator/Admin display**: the count of affected bookings surfaces as an
  attention item — closing a centre with live bookings is an event someone
  should act on, not a silent state change.
- **Allocation**: centre excluded (already the standing rule).
- Rebooking is a farmer or operator action. **Never automatic** — the
  system does not get to move someone's appointment for them.

### Centre `PAUSED` while a queue exists

- **Queue**: preserved, order frozen. `rpc_call_next_farmer` rejects while
  paused — that is the meaning of the state.
- **Check-in**: still permitted (`OQ-15`). A farmer who has already
  travelled should have their arrival recorded; refusing it loses real
  information and tells them nothing useful. The queue grows but does not
  move, which is an honest representation of a paused centre.
- **Farmer display**: `PAUSED` with "your place is held".
- **Allocation**: excluded for new bookings (standing rule).

### Centre `DELAYED` with capacity remaining

- Fully bookable. `effective_status` = `DELAYED` (case 6, `docs/DATABASE.md`
  §6.2).
- **ETA**: inflated by the reported delay — this is the one place the delay
  figure changes a number rather than just a label.
- **Allocation**: may deprioritise, must not exclude.

### Centre `FULL` while bookings already exist

- **Existing bookings are unaffected.** `FULL` blocks *new* bookings only.
  A derived state must never invalidate a commitment already made — that
  would make the derivation actively harmful.
- **Farmer display**: `FULL` when browsing; their own booking still shows
  `CONFIRMED`.

### Cancellation frees capacity

- `farmers_remaining` recomputes; `effective_status` flips `FULL → OPEN`
  with no operator action. This is precisely the failure mode a manually-set
  `FULL` would have had, and the main practical argument for deriving it.
- The aggregate's `version` bumps, so farmers browsing see it live.

### Centre reopening

- `CLOSED → OPEN` restores normal operation. If capacity is still
  exhausted, the centre displays `FULL` — again with no second operator
  action, because the derivation handles it.

### Stale derived availability

- `effective_status` and the capacity counts are **cached** in
  `centre_live_state` for display and realtime, and recomputed by trigger
  on every input change.
- **The rule that makes this safe: cache for display, recompute for
  decisions.** Booking admission recomputes capacity inside the transaction
  while holding the slot lock; it never trusts the cached number. The worst
  case for a stale cache is a UI briefly behind, never an overbooked slot.

## Procurement — stages

`PLANNED` conceptual stages:

```
CHECK-IN → QUALITY CHECK → WEIGHMENT → PROCUREMENT → PAYMENT STATUS
```

`DECISION`: **Quality Check** here is the authorised-centre processing
stage, performed by the centre. Any "pre-arrival quality readiness" feature
shown to a farmer before arrival is **advisory only** and must never be
presented as, or visually confused with, official centre acceptance. UI copy
and component choice for the two must be visibly distinct (see
`docs/UI_SPEC.md`).

`DECISION`: "Payment status" tracking is exactly that — a status field
reflecting whatever payment state exists elsewhere. It is not payment
processing, and no part of this stage initiates or handles a real
transaction.

### Display stages vs. operator-actionable stages (Phase 2B)

The Operator Dashboard's Current Processing widget
(`components/operator/WorkflowStepper.tsx`) displays a fuller 7-step
journey — `Registration → Slot Booking → Check-in → Quality Check →
Weighment → Procurement → Payment` — rather than the 5-stage list above.
These are not in conflict: `Registration` and `Slot Booking` happen
earlier, online, before the farmer physically arrives (they are Farmer-app
flow, `docs/UI_SPEC.md` §B), and are shown on the operator's stepper only
as journey context, not as anything the operator does or completes. The
5-stage list above remains the accurate scope of what happens *at the
centre* and what an operator can actually act on — `handleCallNext` in
`app/operator/page.tsx` starts a newly-called farmer's stage index at
`CHECK_IN` for exactly this reason, never at `REGISTRATION`.

### Three state machines, one projection — `DECISION` (Phase 3A)

The 7-step stepper is a **presentation projection**, not a stored value.
Three separate lifecycles change at different times, for different reasons,
driven by different actors, and collapsing them into one enum would force
unrelated facts to share a single cursor:

| Machine | Owner | Values |
|---|---|---|
| **Appointment** (`bookings.status`) | Farmer books; operator advances | `BOOKED → CHECKED_IN → CALLED → IN_PROGRESS → COMPLETED`, plus `CANCELLED` / `NO_SHOW` |
| **In-centre processing** (`procurement_records`) | Centre staff | Evidence-based: quality → weighment → procurement, each recorded with who and when |
| **Payment** (`payment_records.status`) | Set from outside the centre workflow | `PENDING → PROCESSING → PAID`, or `FAILED` |

The stepper index is computed by one pure function over all three:

| Step | Derived from |
|---|---|
| Registration | account exists |
| Slot Booking | booking exists |
| Check-In | `checked_in_at` is set |
| Quality Check | `quality_checked_at` is set |
| Weighment | `weighed_at` is set |
| Procurement | `procured_at` is set |
| Payment | `payment_records.status` |

**There is no stored `stage` column.** A stage value can contradict the
timestamps that prove what actually happened, and when they disagree there
is no principled way to decide which is right. Deriving it means the
question cannot arise. `docs/DATABASE.md` §8.

Payment is genuinely independent: it can move to `PAID` days after
procurement completes, and a `FAILED` payment does not reopen the
appointment.

### Quality check — minimum viable record `DECISION` (Phase 3A)

Stored: an **outcome** (`ACCEPTED | ACCEPTED_WITH_DEDUCTION | REJECTED`), an
optional short note, and **who checked it and when**. Nothing else.

Not stored: moisture percentage, foreign-matter percentage, grade matrices,
sample identifiers, lab references. None appear in any implemented screen,
and recording them would imply a laboratory authority the system does not
have. The attribution is the point of the record — a rejection must be
traceable to a named officer.

`OQ-7` (open): on `REJECTED`, does the booking still complete? Recommended:
yes, with `accepted_quantity_quintal = 0` and the reason in the note — the
visit happened and must stay auditable — but this is not yet confirmed.

### Payment — representable states `DECISION` (Phase 3A)

`PENDING | PROCESSING | PAID | FAILED`. `FAILED` is included because a
farmer needs to know a payment did not arrive; it is a state the system
*reports*, never one it *causes*.

**No amount, no bank reference, no transaction ID is stored.** Beyond the
fact that no implemented screen shows them, a transaction ID generated by
this application would be a fabrication: a UTR is issued by a banking
system. Storing a locally-generated string in a field farmers would read as
an official payment reference is indefensible in a government service, and
the prototype gains nothing from it. If a real reference ever arrives from
an external import, it gets a column then — documented as externally
sourced and never generated here.
