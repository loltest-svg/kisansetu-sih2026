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
- Whether `FULL` is a derived status that also blocks recommendation, or a
  distinct operator-set status, is `TODO — VERIFY` — see Dynamic Centre
  Status below.

## Dynamic Centre Status

`DECISION`: explicit distinction between operator-provided state and
system-derived metrics. Do not conflate the two in implementation or in UI
copy.

### Operator-provided (authoritative, operator sets/confirms it)

- `OPEN`, `DELAYED`, `PAUSED`, `FULL`, `CLOSED`
- Operational delay reason (free text or short reason code)

### System-derived (computed from live data, never operator-typed)

- Waiting count (`queue_entries` where status = waiting)
- Remaining capacity (derived: `daily_capacity − booked_count`, not stored
  redundantly unless a strong reason emerges — see `docs/DATABASE.md`)
- Processing-rate-based ETA
- Utilization percentage
- Possibly: whether a centre *should* be flagged `FULL` — `TODO — VERIFY`
  whether this is auto-suggested to the operator or fully manual for MVP;
  not decided yet, so implementation must not silently automate it.

`DECISION`: the platform does not claim automatic machine/equipment failure
detection. Any "delay" or "machine problem" shown in the UI is
operator-reported/verified — there is no sensor or automated fault-detection
system, and no copy anywhere should imply otherwise.

## Queue — state transitions

`PLANNED` conceptual states:

```
BOOKED → CHECKED_IN → WAITING → CALLED → PROCESSING → COMPLETED
```

Optional side-states: `NO_SHOW`, `CANCELLED` — included only if useful to
the demo story (see `docs/DEMO.md`); not required for the state machine to
function.

`TODO — VERIFY DURING PHASE 1`: whether `CHECKED_IN` and `WAITING` are
collapsed into one state or kept distinct (reference screenshot shows a
`WAITING` status directly, with check-in implied by presence in queue).

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
