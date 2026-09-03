# Architecture

`PLANNED` — nothing below is implemented yet. This document describes the
intended system, not current repository state. See `docs/PROJECT_STATE.md`
for what actually exists.

## System overview

```mermaid
flowchart LR
    User[Farmer / Operator / Admin] --> PWA[Next.js PWA]
    PWA --> Logic[App / Business Logic\n(allocation, ETA, status rules)]
    Logic --> Supabase[Supabase]
    Supabase --> PG[(PostgreSQL)]
    Supabase --> RT[Realtime]
    RT --> PWA
    Logic --> Notif[Notification Abstraction\n(mock SMS adapter)]
```

`PLANNED`: User request enters through the Next.js PWA. Business logic
(allocation engine, ETA/queue calculations, centre-status rules) runs
server-side and reads/writes Supabase Postgres through RLS-scoped queries.
Supabase Realtime pushes queue/status changes back to connected clients so
farmer and operator UIs update live.

## Frontend responsibilities

- Render role-scoped UI (Farmer / Operator / Admin route groups) using UX4G
  components per `docs/UX4G.md`.
- Hold no authorization logic of its own beyond UX convenience — see Security
  note below.
- Subscribe to Supabase Realtime channels relevant to the current view (a
  farmer's own booking/queue row; an operator's own centre's queue/status).
- PWA shell: installable manifest, app-shell caching. `PLANNED`, not full
  offline-first (see `docs/PROJECT.md`).

## Backend responsibilities (Supabase)

- **Auth**: Supabase Auth issues sessions; role is carried on a `profiles`
  row keyed to `auth.users.id` (see `docs/DATABASE.md`).
- **RLS**: every table holding role-scoped data has explicit Row Level
  Security policies. This is the actual access-control boundary — see
  Security note below.
- **Realtime**: Postgres changes on `queue_entries`, `centre_status`,
  `bookings` are broadcast to subscribed clients scoped by RLS.
- **PostgreSQL**: source of truth for all entities in `docs/DATABASE.md`.

## Allocation-engine responsibilities

`PLANNED`: A deterministic, explainable server-side function. Given a
farmer's crop/quantity and current centre/queue/capacity state, it returns a
recommended centre, slot, ETA, and a reason string built from the same
factors used in the decision. Full input/output/rule spec:
`docs/BUSINESS_LOGIC.md`. No scoring formula has been designed yet — that is
a later implementation task, not an architectural claim made here.

## Notification-abstraction responsibilities

`PLANNED`: A single interface (e.g. `sendNotification(farmerId, type,
payload)`) with a mock adapter that logs to a `notifications` table instead
of dispatching a real SMS. Real SMS integration is optional/later and must
not be assumed present anywhere else in the system.

## Deployment

`PLANNED`: Vercel hosts the Next.js app. Supabase project hosts Auth/DB/
Realtime. No other infrastructure.

## Security boundary — explicit statement

`DECISION`: Next.js route separation (e.g. `/(farmer)`, `/(operator)`,
`/(admin)` route groups) is **not** a security boundary. It exists purely to
organize UI. **Supabase Row Level Security is the primary data-access
security boundary.** Any data access must be safe even if a client bypasses
the intended route — because RLS, not routing, is what actually restricts it.
Full detail: `docs/SECURITY.md`.

## Do-not-describe-as-implemented

Nothing in this document should be read as "already built." Every
responsibility above is `PLANNED` until `docs/PROJECT_STATE.md` marks the
corresponding piece as built and verified.
