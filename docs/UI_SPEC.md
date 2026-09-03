# UI Specification

`PLANNED` for content — screens are not implemented yet (Phase 2B+). The
reusable shell (Header, Sidebar, NavDrawer, PageContainer, PageHeader) and
the routes below **are** implemented as of Phase 2A — see
`docs/PROJECT_STATE.md`. Routes:

| Role | Route | Nav label |
|---|---|---|
| Farmer | `/farmer` | Dashboard |
| Farmer | `/farmer/bookings` | My Bookings |
| Farmer | `/farmer/bookings/new` | New Booking |
| Farmer | `/farmer/queue` | Live Queue |
| Farmer | `/farmer/centre` | My Centre |
| Operator | `/operator` | Dashboard |
| Operator | `/operator/queue` | Live Queue |
| Operator | `/operator/processing` | Farmer Processing |
| Operator | `/operator/bookings` | Bookings |
| Operator | `/operator/capacity` | Capacity & Slots |
| Operator | `/operator/status` | Centre Status |
| Admin | `/admin` | Overview |
| Admin | `/admin/centres` | Centres |
| Admin | `/admin/capacity` | Capacity & Congestion |
| Admin | `/admin/activity` | System Activity |

Source of truth for these is `lib/navigation.ts`, not this table — if they
ever diverge, the code wins and this table needs updating. `/farmer/*` and
`/operator` routes now render real content (Phase 2C, Phase 2B — see
`docs/PROJECT_STATE.md`); every other route still renders `PageHeader` +
`ComingSoon` only (no fabricated data). Farmer route paths changed in
Phase 2C (`/farmer/new-booking` → `/farmer/bookings/new`, `/farmer/status`
→ `/farmer/centre`) per explicit routing instructions that phase.

This document, below, specifies intent for that later content.
Component names are checked against `docs/UX4G.md` / `Design.md` §12's
verified parity table; anything not verified is marked
`TODO — VERIFY DURING PHASE 1`. No exact variant/size is locked here — that
happens in the component-plan step immediately before implementation, per
the UX4G skill's mandatory preflight.

**Visual reference**: the supplied operator-dashboard screenshot
("KisanSetu Design System 3.0"). Used for information hierarchy and layout
concept only — see `docs/UX4G.md` for the screenshot-vs-UX4G authority rule.
Its literal name/branding ("KisanSetu") is noted here for traceability only;
it is not a confirmed product name decision.

---

## A. Global application shell

- **Header**: platform identity/logo, current page context, notifications
  affordance, current user identity (name + role badge). Present on
  Operator and Admin; a lighter variant on Farmer mobile views.
- **Sidebar** (Operator/Admin, desktop): persistent left navigation grouped
  by section (e.g. Operations, Management, Settings — grouping concept only,
  not a final IA).
- **Theme**: default UX4G theme, `data-theme="light"` initially (per
  `docs/UX4G.md` decision). Dark mode support deferred unless trivial.
- Likely component categories: Navbar, Badge (notification count), Avatar
  (user identity) — all `✅` in Design.md §12 parity table.

---

## B. Farmer experience (mobile-first)

| Screen | Purpose | Info displayed | Actions | Backend data required | Likely UX4G component categories |
|---|---|---|---|---|---|
| Login/Register | Authenticate | Phone/credential field | Submit, OTP verify | `profiles`/auth | Input, OTP, Button, Form Field |
| Farmer Dashboard | Entry point | Active booking summary (if any), quick action | Start new booking, view active booking | `bookings` (own, latest) | Card, Button |
| New Booking — Crop/Quantity | Start allocation flow | Crop selector, quantity input | Submit | none yet (client-side until submit) | Dropdown/Combobox, Input, Button |
| Centre Recommendation | Show engine output | Recommended centre, slot, ETA, reason | Accept, or view alternatives | allocation engine output | Card, Badge, TODO — VERIFY DURING PHASE 1 (status/progress component for ETA) |
| Alternative Centres | Let farmer compare | List of eligible centres, status, capacity | Select a centre | `procurement_centres`, `centre_status`, derived capacity | Card, Chip, Badge, Empty State (no eligible centres case) |
| Slot Selection/Confirmation | Finalize slot | Available slots for chosen centre | Confirm booking | `slots` | Dropdown, Button |
| Booking Detail | Reference for the farmer | Centre, slot, status, crop, quantity | Check-in (when eligible), cancel (if supported) | `bookings` (own) | Card, Badge |
| Check-in | Arrive at centre | Booking reference, confirm action | Check in | `bookings`, writes `queue_entries` | Button, Alert (confirmation) |
| Live Queue | Track wait | Queue position, status, ETA | none (read-only, live) | `queue_entries` (own), Realtime | List/Result List, TODO — VERIFY DURING PHASE 1 (progress/SLA indicator) |
| Centre Status | Understand delays | OPEN/DELAYED/PAUSED/FULL/CLOSED, delay reason, processing rate | none | `centre_status`, Realtime | Badge, Alert |
| Procurement Status | Track processing | Current stage (check-in → quality check → weighment → procurement) | none | `procurement_records` | TODO — VERIFY DURING PHASE 1 (Stepper vs. Status Pipeline vs. Journey Timeline — all `✅` in parity table, exact fit not chosen yet) |
| Payment Status | See payment state | Status badge (pending/processed) | none | `payment_status` | Badge, Card |

`DECISION`: Farmer UI is deliberately simpler than Operator — fewer
simultaneous data points per screen, single-column flow, large touch
targets (44×44px minimum per Design.md §9).

---

## C. Operator experience (responsive, desktop-first)

Structural reference: supplied screenshot. Grouping below reflects it; not
every decorative stat in the screenshot is assumed required for MVP (see
`docs/PROJECT.md` MUST/SHOULD/SIMULATED split — the operator dashboard
sections below are annotated accordingly).

### Header
Platform identity, page context ("Procurement Centre Dashboard"),
notifications, operator identity + centre name. Component categories:
Navbar, Badge, Avatar.

### Sidebar
Sections (concept, not final labels): Dashboard; Operations (Live Queue,
Farmer Processing, Bookings, Capacity & Slots, Centre Status); Management
(Reports, Payments, Support Requests, Announcements — `SHOULD HAVE`/later,
not MUST HAVE per `docs/PROJECT.md`); Settings (Profile, Users, Centre
Settings — `TODO — VERIFY DURING PHASE 1` whether Users/Centre Settings are
in MVP scope at all, likely not). Component category: Navbar (side variant)
— `TODO — VERIFY DURING PHASE 1` exact UX4G sidebar/nav pattern.

### Centre Overview (MUST HAVE)
KPI cards: farmers booked today, farmers processed today, farmers waiting,
slots available, centre status summary (status + processing rate + est.
delay). Component categories: Card, Badge.

### Live Queue (MUST HAVE)
Ordered list: token, farmer name, masked phone, status (e.g. NEXT/WAITING),
estimated wait. Actions: Call Next Farmer, Mark No-show (`SHOULD HAVE`).
Component categories: Table or List (`✅`), Button, Badge.

### Capacity & Slots (MUST HAVE)
Total capacity, booked, available slots, waitlist (`SHOULD HAVE` — only if
waitlist concept is adopted; not yet decided), utilization, processing rate
adjustment. Component categories: Card, TODO — VERIFY DURING PHASE 1
(circular utilization indicator — Design.md §12 lists Progress Indicator as
`✅`; whether a circular variant exists needs checking against the installed
package, not assumed from the screenshot).

### Current Processing (MUST HAVE)
Active token: farmer, crop, expected/recorded quantity, processing stage.
Action: Update Status. Stages: Check-in → Quality Check → Weighment →
Procurement → Payment Status (per `docs/BUSINESS_LOGIC.md`). Component
category: TODO — VERIFY DURING PHASE 1 (same Stepper/Status
Pipeline/Journey Timeline choice as Farmer's Procurement Status screen — use
the same component in both places once chosen, for consistency).

`DECISION` (carried from `docs/BUSINESS_LOGIC.md`): Quality Check here is
the official, centre-authorised stage — this screen must never be visually
conflated with any farmer-facing "pre-arrival readiness" indicator.

### Centre Status control (MUST HAVE)
Current status + control to change it (`OPEN`, `DELAYED`, `PAUSED`, `FULL`,
`CLOSED`), delay reason input when reporting a delay. Component categories:
Badge, Switch/Radio, Textarea, Button.

### Alerts & Notifications (SHOULD HAVE)
Feed of recent operational events (delay updated, capacity updated, support
request raised). Component categories: List, Alert.

### Today's Summary (SHOULD HAVE / partially SIMULATED)
Average wait time, peak queue, centre uptime — MVP-safe operational stats
derived from real data. `TODO — VERIFY DURING PHASE 1`: "Farmer
Satisfaction" rating and "Daily Report PDF/Excel" export shown in the
screenshot are **not** in `docs/PROJECT.md`'s MUST/SHOULD list — treat as
`NOT REQUIRED FOR MVP` unless explicitly added there; do not build them by
default just because the screenshot shows them.

---

## D. Admin experience (responsive, desktop-first)

| Screen | Purpose | Info displayed | Likely UX4G component categories |
|---|---|---|---|
| Platform Overview | Top-level KPIs | System-wide counts (centres, active bookings, etc.) | Card, Alert |
| Centres Overview | List all centres | Status, capacity, congestion per centre | Table, Badge, Card |
| Capacity/Congestion Monitor | Cross-centre comparison | Congestion indicators per centre | Table, Progress Indicator, Badge |
| System Activity | Audit/activity feed | Recent bookings/status changes across centres | List, TODO — VERIFY DURING PHASE 1 (Journey Timeline for a cross-entity feed — unconfirmed fit) |
| Centre Status Visibility | Read-only status per centre | OPEN/DELAYED/PAUSED/FULL/CLOSED | Badge |

`DECISION`: Admin stays read-only/minimal for MVP — no management actions
beyond what's listed (`docs/PROJECT.md`).

---

## E. Responsive behaviour

| Role | Strategy | Notes |
|---|---|---|
| Farmer | Mobile-first | Single-column; sidebar/table concepts don't apply |
| Operator | Desktop-first, usable on tablet/mobile | Dense dashboard (KPI cards, tables) degrades conceptually: KPI card row wraps/scrolls horizontally on narrow screens; Live Queue table becomes a stacked card list per row rather than a wide table; sidebar collapses to a top/hamburger nav |
| Admin | Desktop-first, responsive | Same table→card degradation pattern as Operator for centre lists |

No CSS is specified here — degradation is described conceptually per the
skill's "no implementation yet" constraint. Actual responsive classes/tokens
come from UX4G's breakpoint system (Design.md §8: Mobile 0–1023 / Tablet
1024–1439 / Desktop 1440–1767 / Desktop XL 1768+) at implementation time.

---

## F. UI data requirements

This section drives `docs/DATABASE.md` — every field listed there traces
back to a line here.

**Operator → Centre Overview** requires: centre ID, date, daily capacity,
booked count, processed count, waiting count, available slots, centre
status, processing rate, estimated delay.

**Operator → Live Queue** requires: queue entry ID, booking ID, token,
farmer display name, masked phone, queue position, queue status, entered
time, estimated wait.

**Operator → Capacity & Slots** requires: total capacity (today), booked
count, available slot count, waitlist count (if adopted), utilization
(derived), processing rate.

**Operator → Current Processing** requires: token/booking ID, farmer name,
crop, expected quantity, recorded/graded quantity, current processing stage,
stage timestamps.

**Operator → Centre Status control** requires: current status enum, delay
reason (if any), last updated timestamp/actor.

**Operator → Alerts & Notifications** requires: event type, message,
timestamp, related entity reference.

**Farmer → New Booking (Crop/Quantity)** requires: crop options list (static
or from a lookup), farmer identity.

**Farmer → Recommendation** requires: eligible centres, centre status,
remaining capacity, available slots, queue length, processing rate, derived
ETA, recommendation reason.

**Farmer → Alternative Centres** requires: same as above, listed rather than
single-recommended.

**Farmer → Booking Detail / Check-in** requires: booking ID, centre, slot,
crop, quantity, status.

**Farmer → Live Queue** requires: own queue entry ID, position, status,
estimated wait (Realtime-subscribed).

**Farmer → Centre Status** requires: centre status enum, delay reason,
processing rate (Realtime-subscribed).

**Farmer → Procurement Status** requires: booking ID, current processing
stage, stage timestamps.

**Farmer → Payment Status** requires: booking ID, payment status enum.

**Admin → Centres Overview / Capacity / Status** requires: all centres'
`centre_status`, capacity, booked/waiting counts (aggregated read).

**Admin → System Activity** requires: a cross-entity event/audit log
(status changes, bookings created, etc.) with timestamp and actor role.
