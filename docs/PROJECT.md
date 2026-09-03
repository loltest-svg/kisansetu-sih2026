# Project — Smart MSP Procurement Coordination Platform

**SIH problem statement:** SIH26032 — Delay in Providing Farmers Information
Regarding Procurement Schedules and Status.
**Competition:** SIH 2026. **Constraint:** 3-day working PWA prototype.

## Problem being solved

Farmers lack timely, reliable information about procurement-centre schedules,
capacity, and status, leading to wasted trips, long unmanaged waits, and
uncoordinated arrivals relative to actual centre throughput.

## Product positioning

`DECISION`: This platform is **not** a replacement for existing government
procurement systems. It is a coordination layer on top of procurement
operations, focused on matching farmer arrivals to real centre capacity and
giving visibility into status, queue, and wait time.

## Core USP

`DECISION`: Intelligent coordination of farmer arrivals with real
procurement-centre capacity by combining demand-aware slot allocation, live
queue visibility, and dynamic centre status — not merely digitising
appointment booking.

## User roles

### Farmer
Register/Login → Farmer profile → Enter crop and quantity → View eligible
procurement centres → Receive smart centre + slot recommendation → See why it
was recommended → Book slot → View booking → Check in → View live queue and
ETA → View centre status → Procurement processing → Procurement status →
Payment status.

`DECISION`: Farmer UI is mobile-first and substantially simpler than the
operator dashboard.

### Centre Operator
Login → Centre dashboard → Today's bookings/capacity → Check in farmers →
Manage live queue → Call next farmer → Process farmer → Update processing
stages → Complete procurement → Update centre operational status → Report
delays → View capacity/workload/processing rate.

`DECISION`: Centre statuses support at minimum: `OPEN`, `DELAYED`, `PAUSED`,
`FULL`, `CLOSED`.

`DECISION`: The platform does not claim automatic physical detection of
machine/equipment failure. Delays and machine problems are
operator-reported/verified for the MVP — there is no sensor integration.

### Admin
Login → Platform overview → Procurement centre overview →
Capacity/congestion visibility → Centre status visibility → System activity.

`DECISION`: Admin functionality stays minimal for the MVP — visibility, not
management tooling.

## MUST HAVE (3-day MVP)

- Farmer: login, crop/quantity entry, centre+slot recommendation, booking,
  booking detail, check-in
- Operator: login, dashboard, bookings list, queue management (call next),
  status update
- Admin: centres overview, platform status
- Supabase Auth + RLS role separation
- Realtime queue + centre status
- Deterministic allocation engine
- UX4G-based UI shell (header/nav, cards, tables, forms)

## SHOULD HAVE

- Delay reporting (operator)
- System activity feed (admin)
- Procurement status stage tracking (farmer)
- Basic PWA manifest/installability

## SIMULATED (explicitly not real integrations)

- SMS notifications — mock adapter, logs instead of sending
- Payment status — enum only, no gateway, no real transaction
- Pre-arrival quality readiness — advisory only, never presented as official
  centre acceptance (official quality check happens at the centre)

## Explicitly excluded (production vision or not)

No ML, no blockchain, no chatbot, no facial recognition, no microservices
split, no native Android app, no real banking/payment integration, no
automatic machine-failure detection.

## Production vision vs. 3-day MVP

| Area | Production vision | 3-day MVP |
|---|---|---|
| SMS | Real SMS gateway integration | Mock adapter, logged only |
| Payment | Possibly integrated status feed from a payment system | Manually/simulated status enum, no processing |
| Allocation engine | Same deterministic approach, possibly richer inputs | Deterministic, small fixed input set |
| Quality check | Centre-authorised, in production workflow | Same, but pre-arrival readiness stays advisory-only in both |
| Admin | Could grow into full ops console | Minimal read-only overview |
| Notifications | Multi-channel (SMS + push) | SMS-mock only |
| Offline/PWA | Full offline-first | App-shell installability only |

`ASSUMPTION`: "Eligible procurement centres" for a farmer means centres that
accept the farmer's stated crop and are not `CLOSED`. Exact eligibility rule
is `TODO — VERIFY` during allocation-engine design (see
`docs/BUSINESS_LOGIC.md`).
