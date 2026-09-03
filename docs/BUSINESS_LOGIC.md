# Business Logic (planned, deterministic)

`PLANNED` — nothing in this document is implemented. These are the rules and
state machines to build against, not a description of existing code.

## Smart Allocation Engine

### Inputs

- Farmer: `crop`, `quantity`
- Per-centre: acceptance of `crop`, `centre_status`, `daily_capacity`,
  `remaining capacity` (derived), `processing_rate`
- Per-centre queue: current `queue_entries` count / active bookings
- Per-slot: `available slots`, remaining capacity per slot
- Derived: `estimated wait time` per candidate centre

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
- A centre with insufficient remaining capacity for the farmer's quantity
  must not be recommended.
- A slot with no remaining availability must not be recommended.
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

- Waiting count (`queue_entries` where status = waiting)
- Remaining capacity (derived: `daily_capacity − booked_count`, not stored
  redundantly unless a strong reason emerges — see `docs/DATABASE.md`)
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
  (`v_centre_availability.effective_status`): adds `FULL` when remaining
  slots or remaining quantity reach zero.
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
BOOKED → CHECKED_IN → CALLED → IN_PROGRESS → COMPLETED
   │           │         │
   ├───────────┴─────────┴──→ CANCELLED   (not permitted once IN_PROGRESS)
   └────────────────────────→ NO_SHOW     (from BOOKED or CHECKED_IN)
```

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
