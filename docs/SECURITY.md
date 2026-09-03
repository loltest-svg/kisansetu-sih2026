# Security Model

`DESIGN ONLY` — no Supabase project, no policies, no SQL exist. Phase 3A
designs the access model; Phase 3B implements it. Nothing in this file may
be described as enforced.

Prior decisions from Phase 0.5 are preserved below and marked; the RLS
design (§3 onward) and the adversarial review (§8) are new in Phase 3A.

---

## 1. Core principle (unchanged)

`DECISION` (also in `CLAUDE.md`, `docs/ARCHITECTURE.md`): Next.js route
grouping is a UX convenience, **never** a security boundary. Supabase Row
Level Security is the primary, mandatory data-access boundary. Every access
must be safe assuming the client reaches any route, calls any table
directly with the anon key, and subscribes to any realtime channel —
because it can.

Corollary that shapes the whole design: **if a rule cannot be expressed as
a policy, a constraint, or a locked transaction, it is not a rule — it is a
hope.**

---

## 2. Role and scope model

| Role | Scope | Source of scope |
|---|---|---|
| `MASTER_ADMIN` | System-wide | `profiles.role` |
| `CENTRE_ADMIN` | Assigned centre(s) | `centre_assignments` (active rows) |
| `OPERATOR` | Assigned centre(s), narrower actions | `centre_assignments` (active rows) |
| `FARMER` | Own records only | `auth.uid()` |

Centre Admin's permissions are a **superset** of Operator's at the same
centre (`OQ-9`). Master Admin is not a super-operator: it has system-wide
*visibility* and account/centre administration, but day-to-day queue
actions remain centre-scoped roles' work. That separation is deliberate —
`docs/PROJECT.md` keeps Admin visibility-focused.

### 2.1 Scope helpers — and the recursion trap

Policies need the caller's role and centres. Doing this inline
(`SELECT role FROM profiles WHERE id = auth.uid()`) inside a policy on
another table causes `profiles`' own policies to evaluate, which in the
common case recurses and in the best case runs a subquery per row.

`DECISION`: three `SECURITY DEFINER`, `STABLE` helper functions own this:

```
auth_role()            → user_role
auth_centre_ids()      → uuid[]   (active assignments only)
auth_is_master_admin() → boolean
```

They are owned by a privileged role, have `search_path` pinned, and are the
**only** sanctioned way a policy learns who the caller is.

`DECISION`: role is **not** authorised from JWT claims alone. Custom claims
are a legitimate later optimisation, but a JWT is a bearer token that stays
valid until expiry — a suspended or reassigned user would keep their old
access for the life of the token. The database check is the authority; a
claim may only ever be a cache in front of it.

---

## 3. Per-table policy design

Notation: `R` read, `W` write, `—` no access. "Own centre" means
`centre_id = ANY(auth_centre_ids())`.

| Table | Farmer | Operator | Centre Admin | Master Admin |
|---|---|---|---|---|
| `profiles` | R/W own row (**restricted columns**) | R own row | R own row + staff at own centre | R all, W role/status |
| `centre_assignments` | — | R own rows | R own centre | R/W all |
| `procurement_centres` | R active only | R own centre | R own centre | R/W all |
| `commodities`, `centre_commodities` | R | R | R | R/W |
| `centre_operating_days`, `slots` | R (active centres) | R own centre | R/W own centre | R/W all |
| `centre_status` | R | R own centre, W via RPC | R/W own centre | R all |
| `centre_status_events` | — | R own centre | R own centre | R all |
| `centre_queue_state` | R (all — aggregate, no PII) | R own centre | R own centre | R all |
| `bookings` | R own; INSERT via RPC only | R/W own centre (via RPC) | R/W own centre | R all |
| `procurement_records` | R own (via own booking) | R/W own centre | R/W own centre | R all |
| `payment_records` | R own | R own centre | R/W own centre | R/W all |
| `notifications` | R own | — | — | R all |
| `audit_events` | — | — | R own centre | R all |

Every table has RLS **enabled with a default-deny posture**: no permissive
policy means no access. No table ships with RLS off "temporarily".

### RLS-1 — `profiles` privilege escalation (the critical one)

A row-level policy that lets a user update their own row lets them update
**every column of it**, including `role`. `UPDATE profiles SET role =
'MASTER_ADMIN' WHERE id = auth.uid()` would satisfy any `USING (id =
auth.uid())` policy.

Three layers, all required:

1. **Column-level grants** — `GRANT UPDATE (full_name, phone, village_text)
   ON profiles TO authenticated`. Postgres column privileges, not RLS, are
   the correct mechanism for "which columns"; RLS decides *which rows*.
2. **`WITH CHECK` pinning** the immutable columns to their current values.
3. **A backstop trigger** rejecting any change to `role` or
   `account_status` unless `auth_is_master_admin()`.

Layer 1 alone is sufficient in theory. All three are specified because this
is the single failure that converts any farmer account into full system
control, and because a future migration that re-grants table-level UPDATE
would silently remove layer 1 without anyone noticing.

### RLS-2 — write paths go through RPCs

`DECISION` (extends the Phase 0.5 server-side mutation decision): the
following are **never** direct client table writes, regardless of policy:
booking creation, check-in, call-next, quality/weighment/procurement
recording, centre status change, payment status change.

Reasons: each needs a multi-row transaction, a capacity or state-machine
check, and an audit trail. A direct `INSERT` with a permissive policy
cannot express "and only if the slot still has room". The policies for
these tables therefore grant *no* direct INSERT/UPDATE to client roles at
all — the RPCs (`SECURITY DEFINER`, caller-validated) are the entire write
surface.

This also closes mass-assignment: a farmer cannot insert a booking with
`status = 'COMPLETED'`, someone else's `farmer_id`, or a forged token,
because they cannot insert bookings.

---

## 4. What must never reach the client

| Item | Why |
|---|---|
| Supabase **service-role key** | Full RLS bypass. Server-only env var, never `NEXT_PUBLIC_`-prefixed, imported only in modules guarded by the `server-only` package so a client import fails at build time rather than shipping the key |
| Another farmer's booking, name, or phone | Core privacy boundary |
| Another centre's operational data | Cross-centre confidentiality |
| Full phone numbers in `audit_events.metadata` | Audit is broadly readable by admins and is retained; PII must not accumulate there |
| Raw `profiles` rows to operators | Not needed — booking snapshots (`docs/DATABASE.md` §7.2) mean operators never query `profiles` |
| Any SQL error text or database identifier | Leaks schema; server routes return generic failures |

---

## 5. Server vs client vs database

| Concern | Lives in | Reason |
|---|---|---|
| Session/auth | Supabase Auth, cookie-based via `@supabase/ssr` | Server components need the session too |
| Read queries for own/scoped data | Client **or** server, anon key + RLS | RLS makes both safe |
| Booking, check-in, call-next, status, procurement, payment writes | **Database RPC**, invoked from a server action | Transactional + auditable |
| Allocation engine | Server (reads via `v_centre_availability`) | Deterministic, explainable, must not be client-tamperable |
| Queue position | **Database function** (`SECURITY DEFINER`) | Cannot be computed correctly under RLS any other way (`docs/DATABASE.md` §7.3) |
| Notification dispatch | Server worker/adapter | Needs privileged read of `notifications` |
| Account/role/centre administration | Server action → RPC, Master Admin only | Highest-privilege surface |
| Audit writing | **Database triggers** | Cannot be forgotten or bypassed |

Service-role usage is expected to be rare: notification dispatch and
account administration. Everywhere else, RLS with the caller's identity is
both sufficient and safer, because a bug in a service-role path has no
backstop.

---

## 6. Privacy decisions (preserved from Phase 0.5, extended)

- **Phone masking** stays a presentation concern (`98XXXXXX21`). RLS decides
  whether the row is reachable; masking decides what is rendered. Both are
  needed; neither substitutes for the other.
- **Farmer identity data is minimal by design**: name, phone, optional
  village. **No Aadhaar, no land records, no bank details, no government
  identifiers.** The farmer-facing guidance text ("bring your Aadhaar card
  and land records") refers to *physical documents to carry to the centre*
  and creates no storage obligation — it must not be read as implying the
  app holds them.
- **Audit metadata excludes PII** beyond the actor's display name.
- **Suspension over deletion**: `account_status = 'SUSPENDED'` revokes
  access while preserving audit history. Hard-deleting a user would either
  orphan or erase their trail.

---

## 7. Notification and realtime exposure

- Realtime respects RLS, but only for tables that are *in the publication*.
  Publication membership is therefore an access-control decision, not a
  performance one: `docs/DATABASE.md` §12 lists the four intended tables and
  nothing else is added.
- `REPLICA IDENTITY` stays at the default (primary key). `FULL` would ship
  entire old rows to subscribers on every update — more data crossing the
  boundary, for no product benefit.
- `centre_queue_state` is readable by all authenticated users **because it
  contains no personal data** — counts and a currently-serving token. That
  is what makes it safe to be the farmer's live-queue signal.

---

## 8. Adversarial review — security

Rated by impact if it reaches production unmitigated.

| # | Failure mode | Severity | Mitigation |
|---|---|---|---|
| S-1 | **Self-promotion via `profiles.role`.** Any farmer sets their own role to `MASTER_ADMIN` with one PostgREST call; row-level policies do not restrict columns | **Critical** | Column grants + `WITH CHECK` + backstop trigger (RLS-1). Add a test that asserts the update fails |
| S-2 | **Cross-centre read via direct object ID.** Operator at centre A calls `/rest/v1/bookings?id=eq.<uuid from centre B>`. A policy written as "operators may read bookings" without a centre predicate returns it | **Critical** | Every operator/centre-admin policy predicate includes `centre_id = ANY(auth_centre_ids())`. Verify by querying a known foreign ID as a real operator session, not by reading the policy |
| S-3 | **Service-role key in the client bundle.** One `import` of a server module from a client component ships full RLS bypass to every browser | **Critical** | `server-only` package on every module touching the key; env var never `NEXT_PUBLIC_`; CI grep of the built client chunks for the key prefix |
| S-4 | **Policy recursion / `profiles` lookups inside policies.** Either infinite recursion or a per-row subquery on a PII table; the "fix" people reach for is loosening `profiles` policies | **High** | `SECURITY DEFINER` `STABLE` helpers (§2.1); `profiles` policies never referenced from another table's policy |
| S-5 | **Audit log over-exposure.** Operators or farmers able to read `audit_events` learn other centres' operations and staff names | **High** | Master Admin reads all; Centre Admin restricted by `centre_id`; operators and farmers get none |
| S-6 | **Mass assignment on booking insert.** Farmer inserts a booking with a forged token, another farmer's id, or `status='COMPLETED'` | **High** | No client INSERT on `bookings` at all; `rpc_create_booking` sets every trusted field server-side (RLS-2) |
| S-7 | **Stale JWT after suspension/reassignment.** A dismissed operator keeps centre access until token expiry if role/centre came from claims | **High** | Authorise from the database, not claims (§2.1); short token TTL; `account_status` checked in helpers |
| S-8 | **Realtime leakage via an unintended published table.** Adding a table to the publication for convenience exposes every row change subject only to whatever policies exist | **Medium-High** | Publication membership is explicit and reviewed; realtime is the *last* migration, after policies are verified |
| S-9 | **Farmer enumeration through shared reference data.** Farmers legitimately read centres and slots; if slot rows ever carried booked-farmer references, that read becomes a directory of who is where | **Medium** | `slots` holds counts and capacity only; no farmer references on any farmer-readable table |
| S-10 | **PII accumulation in audit metadata.** `before/after` JSON on a booking update would capture `farmer_phone_snapshot` into a long-retained, admin-readable table | **Medium** | Trigger explicitly allow-lists the columns copied into `metadata`; phone is excluded |
| S-11 | **Anonymous audit under service role.** Privileged server actions write audit rows with `auth.uid() = NULL`, so the highest-privilege actions are the least attributable | **Medium** | `SET LOCAL app.actor_profile_id` in every privileged transaction; triggers prefer it over `auth.uid()` (`docs/DATABASE.md` §16) |

---

## 9. Adversarial review — data consistency

| # | Failure mode | Severity | Mitigation |
|---|---|---|---|
| C-1 | **Double call-next.** Two operators call simultaneously; one farmer is called twice or two farmers are both "next" | High | `FOR UPDATE SKIP LOCKED` on the queue head inside `rpc_call_next_farmer`; per-operator partial unique index on `IN_PROGRESS` |
| C-2 | **Slot overbooking.** Two farmers pass the capacity check concurrently and both commit | High | Capacity counted inside the transaction holding `FOR UPDATE` on the `slots` row |
| C-3 | **Stored-vs-derived drift.** A `booked_count` or `position` column diverges from the rows it summarises | High | Not stored. The one exception (`centre_queue_state`) is trigger-maintained, never written by application code |
| C-4 | **Status/timestamp contradiction.** `status='COMPLETED'` with `completed_at IS NULL`, or a stage enum disagreeing with its own evidence | Medium-High | Stage derived, not stored; status/timestamp coherence trigger on `bookings` |
| C-5 | **Token collision** under concurrent booking | Medium | Allocation inside the locked transaction + `UNIQUE (centre_id, service_date, token)` backstop |
| C-6 | **Payment status regression.** `PAID → PENDING` from a stray update or double-click | Medium | Transition-guard trigger; `PAID` terminal except to `FAILED` by Master Admin |
| C-7 | **Day-boundary errors.** "Today" computed in UTC on the server and IST in the user's head; bookings land on the wrong `service_date` around midnight | Medium | `service_date` stored explicitly, all boundary logic in `Asia/Kolkata`, never derived from a client clock (`OQ-10`) |
| C-8 | **Orphaned processing on cancellation.** A booking cancelled while `IN_PROGRESS` leaves a half-written procurement record | Medium | State machine forbids cancellation after `IN_PROGRESS`; cancellation is a distinct terminal path |

---

## 10. Adversarial review — scalability

Rated for the realistic prototype scale (tens of centres, hundreds of
bookings/day), with the point at which each stops being fine.

| # | Concern | Severity | Mitigation / breaking point |
|---|---|---|---|
| P-1 | **Queue position via window function** over a day's bookings per request | Low-Medium | Index `(centre_id, service_date, status, checked_in_at)`; a counting function beats a window here. Fine to thousands of rows/centre/day |
| P-2 | **Admin dashboard fan-out** — six centres today is six aggregate queries; a hundred centres is a hundred | Medium | `v_centre_availability` computes all centres in one pass; materialise only if it measurably hurts |
| P-3 | **Realtime fan-out** — every booking change broadcast to every operator at the centre, each event RLS-checked per subscriber | Medium | Subscribe with explicit `centre_id` filters; the aggregate row means farmers need one subscription, not one per booking |
| P-4 | **`audit_events` unbounded growth**, with the Admin feed reading the newest rows | Medium | `(occurred_at DESC)` and `(centre_id, occurred_at DESC)` indexes; retention/partitioning policy before it matters, not after |
| P-5 | **Peak-queue computation** sweeps a day's timestamps per view | Low | Acceptable at MVP scale; precompute into a daily summary row if the Daily Summary is built |

---

## 11. Business-rule ambiguities affecting security

These are catalogued in full in `docs/DATABASE.md` §19; the ones with a
security or integrity edge:

- `OQ-1` **capacity units** — a wrong unit lets a centre accept volume it
  cannot handle, or reject farmers it could serve.
- `OQ-6` **multiple active bookings per farmer** — without a limit, one
  account can hold scarce slots across centres. Recommended: one active
  booking per farmer per `service_date`, enforced by a partial unique index.
- `OQ-3` **who sets payment status** — an unowned write path is an
  unauditable one.
- `OQ-9` **Centre Admin override of Operator status** — assumed yes;
  affects who can pause a centre.

---

## 12. Verification plan for Phase 3B

Policies are not "reviewed", they are **attacked**, with a real session per
role:

1. Farmer attempts: promote self; read another farmer's booking by id;
   insert a booking directly; read `audit_events`; read another centre's
   queue rows.
2. Operator attempts: read a booking id from another centre; update
   `centre_status` for another centre; read `profiles` broadly; call next
   twice concurrently.
3. Centre Admin attempts: read another centre's audit; assign a user to
   another centre.
4. Master Admin: confirm system-wide read works, and that day-to-day queue
   actions are still centre-scoped.
5. Concurrency: two simultaneous `rpc_call_next_farmer`, two simultaneous
   last-slot bookings — assert exactly one wins each.
6. Build-time: assert the service-role key appears in no client chunk.

Each of these is a test that fails loudly, not a checklist item someone
ticks.

---

## 13. Explicitly not covered by this MVP (preserved)

- No physical/sensor verification of operator-reported state — the trust
  boundary is "authenticated operator assigned to this centre", not device
  attestation.
- No payment security model — status is display-only, no transaction
  handling, no card/bank data, therefore no PCI-relevant scope.
- No penetration testing, threat modelling of the hosting platform, or
  rate limiting beyond what Supabase provides by default. Worth naming
  rather than implying the review above is exhaustive.
