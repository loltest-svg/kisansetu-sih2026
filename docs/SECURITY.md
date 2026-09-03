# Security Model

`PLANNED` — no policies exist yet. This document proposes the model; nothing
here is implemented. Do not create RLS policies from this document without
re-verifying against the actual schema once `docs/DATABASE.md` is finalized
and implemented.

## Core principle

`DECISION` (also stated in `CLAUDE.md`, `docs/ARCHITECTURE.md`): Next.js
route grouping is a UX convenience, **never** a security boundary. Supabase
Row Level Security is the primary, mandatory data-access security boundary.
Any client can in principle reach any route or API surface; correctness must
hold at the database policy level regardless.

## Role model

Role is stored on a `profiles` row (`role: farmer | operator | admin`) tied
1:1 to `auth.users.id` via Supabase Auth. See `docs/DATABASE.md` for the
proposed shape.

### Farmer — proposed access

- Read/write own `profiles` row.
- Read/write own `bookings` rows.
- Read own `queue_entries` (rows linked to their own bookings).
- Read relevant/eligible `procurement_centres` and `centre_status` data —
  this is intentionally broader read access since farmers need to compare
  centres (public-ish reference data, not personal data).
- Read own `procurement_records` and `payment_status`.
- Read own `notifications`.
- No write access to centre-owned tables (`centre_status`, `slots`
  capacity, other farmers' data).

### Operator — proposed access

- Read/write operational data scoped to their **assigned centre only**
  (`centre_id` on their `profiles` row or a join table).
- Manage `bookings`, `queue_entries`, `centre_status`, `procurement_records`
  for that centre.
- Cannot read or write another centre's operational data.
- `TODO — VERIFY DURING PHASE 1`: exact mechanism for "assigned centre" —
  single `centre_id` column vs. join table — depends on whether an operator
  can ever be assigned to more than one centre (currently `ASSUMPTION`: one
  operator → one centre, MVP scope).

### Admin — proposed access

- Broader read visibility across all centres (overview, capacity/congestion,
  system activity).
- `DECISION` (Phase 0.5, PROJECT.md): admin functionality stays minimal for
  MVP — visibility-focused, not a general administration console. Write
  access beyond what's needed for that stays out of scope unless a specific
  need is identified.

## RLS requirement

- Every table holding role-scoped or personal data must have explicit RLS
  policies before it is queried from client code — no table ships with RLS
  disabled "temporarily."
- Policies must be written and tested per role before that role's screen is
  considered complete, not deferred to a later pass.

## Server-side mutation requirement (race conditions)

`DECISION`: Mutations where a race condition would cause a visible/incorrect
outcome — most notably **"Call Next Farmer"** in the operator queue, and slot
booking/capacity decrement — must go through a server-side route
handler/RPC, not a direct client-side write. Rationale: two operators (or two
browser tabs) must not be able to call the same farmer twice, and two
farmers must not be able to claim the same last slot.

## Secret/environment handling

- No secrets (Supabase service role key, SMS provider keys if ever added,
  any API key) are committed to the repository or pasted into chat/docs.
- `.env.local` (or equivalent) is git-ignored — see repository `.gitignore`.
- Only the Supabase anon/public key is ever exposed to the browser; the
  service role key is server-only, used solely where RLS cannot express the
  required check (expected to be rare or unnecessary at MVP scope).

## Privacy-conscious display

- `DECISION`: farmer phone numbers shown in operator-facing queue/booking
  views are masked (e.g. `98XXXXXX21`) — full number is not displayed in the
  UI even though the operator's role can access the booking record itself.
  Reflects the reference screenshot's masking pattern and is treated as a
  UX/privacy decision independent of RLS (RLS controls whether the row is
  reachable at all; masking controls what's rendered from it).

## Explicitly not covered by this MVP

- No physical/sensor-based verification of any operator-reported state
  (delay, machine status) — trust boundary is "authenticated operator for
  this centre," not device attestation.
- No payment security model — payment status is a display-only field with no
  transaction handling, so no PCI-relevant concerns apply.
