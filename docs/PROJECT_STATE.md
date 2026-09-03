# Project State

## CURRENT PHASE

Phase 2C — Farmer Dashboard & Farmer Experience (UI only)

## COMPLETED

- Phase 0 reconnaissance (repository inspection, UX4G findings, architecture
  proposal, screen map, entity map, allocation-engine input/output sketch,
  MVP scope, risks)
- Phase 0.5 project constitution (`CLAUDE.md` + 9 files under `/docs`, git
  initialized, checkpoint committed)
- Phase 1 Next.js + UX4G + Tailwind(layout-only) + PWA foundation (see
  below for full detail; unchanged this phase, still verified working)
- UX4G `SKILL.md` read completely (six times — Phase 0, 0.5, 1, 2A, 2B, 2C)
- UX4G `Design.md` read completely (six times — Phase 0, 0.5, 1, 2A, 2B, 2C)
- **Phase 2C — Farmer Dashboard & Farmer Experience, UI only:**
  - **Route restructure** (per explicit Phase 2C instructions, not a
    silent change): `/farmer/new-booking` → `/farmer/bookings/new`
    (nested under My Bookings) and `/farmer/status` → `/farmer/centre`
    (relabelled "My Centre"). Done as real `git mv`s, not
    delete+recreate, so history is preserved. `lib/navigation.ts` and
    `docs/UI_SPEC.md`'s route table updated in the same change; grepped
    the whole repo afterward for the old paths to confirm nothing still
    pointed at them.
  - All 5 Farmer routes now render real content: `/farmer` (dashboard),
    `/farmer/bookings` (booking history), `/farmer/bookings/new` (booking
    form), `/farmer/queue` (live queue view), `/farmer/centre` (centre
    details) — replacing every Phase 2A `ComingSoon` on the Farmer tree.
  - New components under `components/farmer/`: `NextStepCard`,
    `FarmerCentreStatusCard`, `QuickActions`, `PaymentStatusCard`,
    `RecentNotifications`, `BookingCard`, `BookingList`,
    `QueueStatusCard`, `CentreDetailsCard`, `BookingForm`.
  - **Two components promoted to `components/shared/`** because they
    turned out to be genuinely role-agnostic, not Operator-specific:
    `WorkflowStepper` (moved from `components/operator/`, Phase 2B) is
    now used by both the Operator dashboard's Current Processing card and
    the Farmer dashboard's Procurement Progress section, with its prop
    type changed from importing `ProcessingStage` out of
    `lib/demo/operatorDashboard.ts` to a structural local `WorkflowStage`
    type so neither role's demo module depends on the other's. Likewise
    `OperationalMetricCard` moved and was renamed `MetricCard`, now used
    by Operator's KPI row and Farmer's "Farmers ahead"/"Estimated wait"
    stats. `app/operator/page.tsx`'s two import lines and JSX tag names
    were updated to match — the only Phase 2B file touched this phase,
    and only for this reason.
  - **Demo-data strategy**: `lib/demo/farmerDashboard.ts`, same pattern as
    `lib/demo/operatorDashboard.ts` (Phase 2B) — one file, file-level
    "PRESENTATION-ONLY DEMO DATA" banner comment, types shaped to match
    docs/DATABASE.md's proposed entities. Every Farmer page carries a
    visible "Demo data — not connected to a backend" tag (dashboard,
    queue) or an equivalent inline note (QueueStatusCard's own footnote,
    the New Booking form's info alert) — not just a code comment.
  - **New Booking form is honest about being non-functional**: submitting
    shows an explicit "This is a demo — no booking was created" message
    (`ux4g-alert-success`) instead of a fake confirmation screen. An info
    alert above the form states plainly that a real system would
    recommend a centre/slot automatically via the Smart Allocation Engine
    (not built here) rather than the farmer picking one manually — form
    fields chosen specifically to match Business Logic's documented
    allocation-engine inputs (centre, date, slot, crop, quantity) so a
    real implementation could sit behind the same fields later.
  - Quality Check is described on the dashboard as "assessed by centre
    staff when you arrive — this screen only shows where you are in the
    process, it does not decide quality itself" — directly satisfies the
    phase's explicit requirement that the app never implies it makes the
    final quality decision (docs/BUSINESS_LOGIC.md's existing advisory-
    only rule, now also stated in-product, not just in docs).
  - Payment status card shows status only (`PENDING`/`PROCESSED`) with an
    explicit "payment itself is handled outside this application" line —
    no amount, no bank details, no "pay now" action anywhere.
  - Live Queue (`/farmer/queue`) shows only the farmer's own token,
    position, and aggregate counts (farmers ahead, estimated wait,
    processing rate, which token is currently being processed) — never
    other farmers' names or tokens, per docs/SECURITY.md.
  - **UX4G finding, significant**: the README's Input example
    (`<div class="ux4g-input-container ..."><label/><input/></div>`) is
    missing a wrapper the *compiled* CSS actually requires. Confirmed by
    reading the compiled CSS directly:
    `.ux4g-input-md .ux4g-input{height:2.5rem}` and
    `.ux4g-input-error .ux4g-input{border-color:...}` both target a
    `.ux4g-input` element that the README's flat example never includes,
    and the actual field itself needs class `ux4g-input-input` (not a
    bare `<input>`). Every new field in `BookingForm.tsx` uses the full
    verified structure (`ux4g-input-container` > `.ux4g-input` >
    `ux4g-input-input`). **Not fixed this phase**: the Phase 1 smoke-test
    input and any other pre-2C input predate this discovery and still use
    the flatter, likely under-styled structure — flagged as a known
    limitation below rather than silently left broken or silently patched
    outside this phase's stated scope.
  - **Second UX4G finding**: `.ux4g-select` and `.ux4g-dropdown` both
    exist as more elaborate custom widgets in the compiled CSS (search/
    filter logic, `data-ux-*` attributes, an `.ux4g-select-caret` element)
    with no README documentation at all for `.ux4g-select` and only a
    trivial example for Dropdown. Rather than guess at an undocumented
    contract (same reasoning as Phase 2B's `ux4g-progress-circle`
    decision), the booking form's three selects use native `<select>`
    elements inside the verified `ux4g-input-container`/`.ux4g-input`
    wrapper instead — fully accessible, fully functional, zero guessed
    markup. Same reasoning for "Preferred date": Date Picker's
    `ux4g-date-picker-input` is documented `readonly`, implying it needs
    JS to become usable, but Date Picker is not in the runtime's
    documented Behaviors Provided list (Phase 1) — so a readonly text
    field styled that way would be inert. Used a native
    `<input type="date">` instead, same wrapper.
  - Icons throughout (`QuickActions`, BottomNav reused unchanged) use only
    the 5 ligature names already verified via fontTools in the Phase 2A
    mobile-nav extension (`home`, `event`, `receipt_long`, `queue`,
    `info`) — no new icon names introduced.
  - Farmer language kept plain throughout, matching the phase's explicit
    examples: "Farmers ahead" / "Estimated wait" / "Centre status", never
    the technical alternatives the instructions warned against.
  - Validated: `tsc --noEmit`, `next lint`, `next build` all clean (one
    stale-`.next`-cache TypeScript error from the route rename, resolved
    by deleting the git-ignored `.next/` directory and rebuilding — not a
    real code problem). All 19 routes still statically prerender, now
    listing `/farmer/bookings/new` and `/farmer/centre` instead of the old
    paths.
  - Dev-server HTML inspection of all 5 Farmer routes: exactly one `<h1>`
    each; zero `<table>` elements anywhere; every `<button>` has an
    explicit `type`; all 5 booking-form fields have correct `label`/`for`
    association; the `.ux4g-input`/`ux4g-input-input` structure renders as
    written; `/farmer/bookings/new` correctly shows "New Booking" active
    in navigation, not "My Bookings" (confirms the shared
    `getActiveHref` "longest match wins" rule handles the new nested
    route without modification); BottomNav's landmark stays uniquely
    labelled (`"Primary (mobile)"`, distinct from Sidebar's `"Primary"` —
    unchanged from the Phase 2A extension, re-verified here); all 7
    workflow stage labels render twice each on the dashboard (desktop +
    mobile dual-render, same verified pattern as Operator's).
  - Confirmed Phase 1's smoke test (`/`), Phase 2B's `/operator`
    dashboard, and the Admin shell (`/admin`) all still return HTTP 200
    and render their expected content, unmodified by this phase (aside
    from the one documented `WorkflowStepper`/`MetricCard` import-path
    change in `app/operator/page.tsx`).
  - **Not literally screenshotted** at 1440/1280/1024/390/430px — same
    tooling limitation as Phase 2B (no browser/screenshot tool available
    in this environment). Verified instead via rendered-HTML inspection
    and reasoning from the actual CSS rules used (flex-wrap throughout,
    `grid-cols-*` only via the `lg:` breakpoint, `pb-20 lg:pb-0` on
    `<main>` already proven in Phase 2A to clear BottomNav, no fixed
    pixel widths introduced anywhere in this phase's new code). Flagged
    here rather than presented as visually confirmed.
- **Phase 2B — Operator / Centre Operations Dashboard, UI only:**
  - `/operator` now renders the real dashboard (`app/operator/page.tsx`),
    replacing the Phase 2A `ComingSoon` placeholder. Everything else in
    the shell (`AppShell`, `Header`, `Sidebar`, `NavDrawer`, `BottomNav`,
    `PageContainer`, `PageHeader`) is untouched.
  - New reusable dashboard components under `components/operator/`:
    `CentreStatusCard`, `OperationalMetricCard`, `CurrentProcessingCard`,
    `WorkflowStepper`, `LiveQueue`, `QueueItemRow`, `CapacityCard`,
    `UpcomingBookings`, `AlertsPanel`, `DailySummary` — each renders
    props/data only, no business logic and no data fetching inside them
  - **Demo-data strategy**: all presentation data centralized in one
    clearly named, clearly documented module, `lib/demo/operatorDashboard.ts`
    (file-level comment block: "PRESENTATION-ONLY DEMO DATA — NOT BACKEND
    DATA"). Typed to match `docs/DATABASE.md`'s proposed entity shapes
    (`queue_entries`, `bookings`, `centre_status`) so a real Supabase query
    result of the same shape can replace it later without a component
    redesign. The page itself also carries a persistent, visible
    `"Demo data — not connected to a backend"` tag next to the title — not
    just a code comment
  - **Interactivity is real but local-only**: the page (`app/operator/page.tsx`)
    is a Client Component holding `useState` for centre status, delay
    reason, queue, current processing stage, and upcoming bookings.
    "Pause/Resume Centre", "Report Delay" (via a Modal + Textarea, reusing
    the Phase 1-verified Modal runtime pattern), "Call Next Farmer",
    "Complete Processing", and "Check In" all mutate this local state —
    nothing calls an API, nothing claims Supabase/Realtime/persistence.
    State resets on reload. No fake API calls, no fake auth, no fake
    realtime subscription anywhere in this phase's code
  - Centre status control models the full `OPEN | DELAYED | PAUSED | FULL
    | CLOSED` enum from `docs/BUSINESS_LOGIC.md`; "Report Delay" is the
    only path to `DELAYED` (with a reason), matching the doc's
    operator-provided/system-derived split — no automatic status changes
  - Workflow display uses the fuller 7-stage journey the phase instructions
    specified (Registration → Slot Booking → Check-in → Quality Check →
    Weighment → Procurement → Payment) via UX4G's Stepper component,
    reconciled with `docs/BUSINESS_LOGIC.md`'s narrower 5-stage
    operator-actionable subset — see the note added to that doc
  - **UX4G components used, each verified before use** (README text and/or
    grepped compiled CSS, not assumed): Card, Tag, List (queue and
    bookings — chosen over Table specifically to avoid the
    horizontal-overflow risk a wide table carries on a phone), Alert,
    Stepper, Progress Indicator (linear `ux4g-progress-bar`, not the
    circular variant — see below), Button, Modal, Textarea, plus the full
    typography scale and layout/flex/gap utilities already established in
    Phase 2A
  - **Identified UX4G gap/limitation**: `ux4g-progress-circle` (a
    candidate for the capacity utilisation indicator, and something
    `docs/UI_SPEC.md` had flagged `TODO — VERIFY`) exists, but its real
    DOM contract in the compiled CSS
    (`[data-ux-progress-circle]`/`-indicator`/`-ring`/`-value-wrap`, a
    conic-gradient mask driven by several CSS custom properties) is
    materially more complex than the two-line example the README shows.
    Rather than guess at an undocumented structure, `CapacityCard` uses
    the fully-documented linear `ux4g-progress-bar` instead — also a
    legitimate "Progress Indicator" per Design.md §12, just the safer of
    the two verified options
  - **Second finding**: the linear progress bar's fill width is actually
    driven by a `--ux4g-progress-value` CSS custom property in the
    compiled CSS (`inline-size: max(calc(var(--ux4g-progress-value)*1%),1px)`),
    not the plain `style="width:60%"` the README's simplified example
    shows. Confirmed by reading the compiled rule directly and used the
    custom-property form, not the README's literal sample
  - **Touch-target fix applied before commit**: initial action buttons used
    `ux4g-btn-sm`/`-xs` (32px/24px min-height, both under the 44px minimum
    — confirmed by reading the compiled CSS). All nine operator action/
    link buttons were upgraded to `ux4g-btn-md` (48px, confirmed via the
    `:where()`-wrapped base rule vs. `.ux4g-btn-md`'s own more specific
    `min-height:var(--ux4g-size-48)` rule) before validation passed
  - Non-colour-only status signalling carried through consistently: Tag
    text itself always spells out the state (OPEN/DELAYED/PROCESSING/etc,
    never colour alone); the active queue row also gets a font-weight
    change, matching the same pattern established for nav active-state in
    Phase 2A
  - Personal information: farmer phone numbers stay masked
    (`98XXXXXX21`-style) everywhere, including in the one locally-synthesized
    "checked in" queue entry the demo interaction creates
  - Validated: `tsc --noEmit` clean, `next lint` clean, `next build`
    succeeds — same 19 routes, all statically prerendered (this page is a
    Client Component but still prerenders; interactivity hydrates
    client-side)
  - Dev-server HTML inspection of `/operator`: exactly one `<h1>`;
    landmarks intact and unchanged from Phase 2A; the "Demo data" tag is
    present in the rendered HTML (not just in code); all card sections
    present; zero `<table>` elements; every `<button>` has an explicit
    `type`; the initial `Call Next Farmer` button renders `disabled`
    (correct — a farmer is already PROCESSING in the seed data); the
    linear progress bar's `--ux4g-progress-value:76` custom property is
    present and matches the seed data's 76% utilisation; all 7 workflow
    stage labels render twice each (the verified desktop-horizontal +
    mobile-vertical dual-render pattern)
  - Confirmed the Phase 1 UX4G smoke test at `/` and the Farmer/Admin
    shells still return HTTP 200 and were not modified
  - **Not literally screenshotted** at the requested 1440/1280/1024/390/430
    widths — no browser/screenshot tool is available in this environment.
    Verified instead via rendered-HTML inspection plus reasoning from the
    actual CSS rules used (flex-wrap everywhere, `grid-cols-*` only via
    the `lg:` breakpoint, no fixed pixel widths introduced anywhere in the
    new code) — the same substitute verification approach already used
    for responsive claims in Phase 2A. Flagged here rather than silently
    presented as visually confirmed.
- **Phase 2A — reusable application UI shell:**
  - Shell components (`components/shell/`): `AppShell`, `Header`, `Sidebar`
    (persistent desktop nav, Operator/Admin), `NavDrawer` (mobile nav, all
    three roles; also Farmer's only nav surface at every width),
    `NavList` (shared nav-item rendering, the one Client Component in the
    shell — needs `usePathname` for active-item state), `PageContainer`,
    `PageHeader`, `ComingSoon` (placeholder for unbuilt screen content)
  - `lib/navigation.ts` — per-role nav item arrays (data only, no auth
    implied); documents the role-hierarchy decision (Admin tree = future
    Master Admin; Operator tree = shared "centre operations" pages a
    future Centre Admin is expected to reuse)
  - Route trees created: `app/farmer/*` (5 routes, `variant="simple"` — no
    persistent sidebar, drawer-nav at every width), `app/operator/*` (6
    routes, `variant="sidebar"`), `app/admin/*` (4 routes,
    `variant="sidebar"`) — 15 routes total, each rendering
    `PageHeader` + `ComingSoon` only; no fabricated metrics or sample data
    shaped like the future schema anywhere
  - Every route/layout is UI/navigation only — no authentication, no role
    enforcement, no Supabase, no database, no allocation or booking logic
  - UX4G classes used, all verified against the installed package's own
    README/compiled CSS (not the CDN docs, not assumed): `ux4g-navbar`
    family, `ux4g-list`/`ux4g-list-item`/`ux4g-list-item-row` (incl. the
    verified `.active` state, confirmed in compiled CSS before use),
    `ux4g-drawer` family (reusing the Phase 1-verified runtime pattern),
    `ux4g-btn` family, `ux4g-tag-*`, `ux4g-badge-dot-primary`,
    `ux4g-empty-state`/`ux4g-empty-state-content`, `ux4g-heading-*`/
    `ux4g-title-*`/`ux4g-body-*`/`ux4g-label-*` typography scale,
    `ux4g-container`/`ux4g-p-*`/`ux4g-gap-*`/`ux4g-d-flex`/`ux4g-flex-*`
    layout utilities
  - **Identified gap, filled rather than worked around silently**: no
    dedicated vertical/sidebar-nav component exists in Design.md §12's
    parity table. `List` is the closest verified building block and is
    used for both Sidebar and NavDrawer content, applied to real
    `next/link` `Link` elements (not the README's `<div>`/`<span>`
    example) for correct link semantics — recorded in
    `components/shell/NavList.tsx` and here, not just left implicit
  - **Second identified gap**: UX4G ships `.ux4g-sr-only` (permanently
    hidden) but no focus-visible companion for the standard skip-link
    pattern. Filled with one narrowly-scoped custom CSS rule
    (`app/globals.css` `.skip-link:focus`), every value a UX4G token, no
    hard-coded colour/spacing — documented inline per the custom-CSS
    policy
  - Tailwind used for exactly three structural purposes:
    `min-h-screen flex flex-col` (outer shell), `hidden lg:block` /
    `lg:hidden` (Sidebar/menu-button breakpoint switch — `lg` = 1024px,
    matching UX4G's own Tablet/Desktop cutoff in Design.md §8, not an
    arbitrary Tailwind number), and `lg:flex`/`flex-1` (sidebar+main
    column split). Nothing else — no Tailwind colour, spacing, radius or
    typography anywhere a UX4G class/token already covers it
  - Fixed a real bug found during validation: the naive "does the current
    path start with this nav item's href" check made a role's root
    Dashboard item match every one of its own sub-routes (`/operator/queue`
    starts with `/operator/`), so Dashboard showed active on every
    Operator/Admin sub-page alongside the real current item. Replaced with
    a "longest matching href wins" rule in `NavList` — generic, not a
    special case for root paths (verified via rendered HTML before and
    after the fix, see Last Verified)
  - Validated: `tsc --noEmit` clean, `next lint` clean, `next build`
    succeeds — all 19 routes (Phase 1's smoke test + 15 Phase 2A routes +
    `/_not-found`) statically prerendered, no hydration/SSR errors
  - Dev-server checks: every new route returns HTTP 200; rendered HTML has
    exactly one `<h1>` per page, distinct landmarks
    (`<header>`, two `<nav>` with different `aria-label`s, `<aside>` on
    sidebar variant, `<main id="main-content">`), the skip-link's
    `href="#main-content"` target exists, and every `<button>` has an
    explicit `type="button"`
  - Confirmed the Phase 1 UX4G smoke test at `/` still renders correctly
    and was not modified or removed
- **Phase 2A extension — genuine mobile/desktop adaptation** (KisanSetu
  farmer-dashboard reference image supplied; used for information
  hierarchy and mobile nav pattern only, not copied pixel-for-pixel):
  - Replaced the binary `variant` prop with `mobileNav: "bottom" |
    "drawer"`. **Every** role now gets the same persistent Sidebar at
    `lg` and up (desktop no longer differs from before); below `lg`,
    Farmer gets a new fixed `BottomNav` (`components/shell/BottomNav.tsx`)
    while Operator/Admin keep the Header-triggered NavDrawer already
    verified in the base Phase 2A work — so the layout adapts by
    breakpoint *and* by role, not just by shrinking one layout
  - **Identified gap**: no "bottom navigation"/"tab bar" component exists
    anywhere in the installed package (checked README text and grepped
    compiled CSS for `bottom-nav`/`tab-bar` classes — none). BottomNav is
    composed entirely from existing verified primitives instead of an
    invented class: `ux4g-fixed`/`ux4g-bottom-0`/`ux4g-inset-x-0`/
    `ux4g-z-40` (positioning), `ux4g-bt-1` (top border, token-driven),
    `ux4g-jc-around`/`ux4g-ai-center`/`ux4g-gap-3xs` (layout), the
    typography scale, and `.ux4g-icon-outlined` icon glyphs
  - **Icon names verified by extracting the actual embedded font**, not
    assumed from naming convention: decoded the base64 `UX4G Material
    Icons Outlined` font out of the compiled CSS with a small script,
    loaded it with `fontTools`, and confirmed `home`, `event`,
    `receipt_long`, `queue`, `info` (the five used) all exist as real
    glyphs (2183 total) before writing any markup — the README alone only
    demonstrates 8 icon names, not enough to cover this need
  - `lib/navigation.ts`: added an optional `icon` field to `NavItem`
    (populated for `farmerNav` only) and extracted the "longest matching
    href wins" active-item rule into a shared `getActiveHref` helper, now
    used by both `NavList` and `BottomNav` instead of being duplicated
  - Active-state signalling in BottomNav follows the same non-color-only
    rule as NavList: `aria-current="page"` plus a font-weight change
    (`ux4g-label-s-strong` vs `-default`), colour via the verified
    `.ux4g-text-primary` utility class (not an inline hex/hard-coded
    style)
  - PWA: added `viewportFit: "cover"` to `app/layout.tsx`'s `viewport`
    export and one narrowly-scoped custom CSS rule
    (`app/globals.css` `.bottom-nav { padding-bottom:
    env(safe-area-inset-bottom) }`) so the bar clears the home
    indicator/gesture bar on notched Android/iOS devices — UX4G has no
    utility for device safe-area insets (a platform viewport concern, not
    a design token; the only existing `env(safe-area-inset-bottom)` in
    the compiled CSS is scoped to the Date Picker's own dropdown, not
    reusable)
  - `<main>` gets `pb-20 lg:pb-0` (Tailwind, structural clearance for the
    fixed bar — not a token concept) only when `mobileNav="bottom"`
  - Fixed a second landmark issue caught during validation: BottomNav
    initially reused the Sidebar's `aria-label="Primary"`, which meant two
    identically-labelled `<nav>` landmarks existed in the DOM at once
    (one hidden via `lg:hidden`/`display:none`, which removes it from
    modern browsers' accessibility trees, but duplicate labels are still
    worth avoiding). Relabelled to `"Primary (mobile)"`, matching how
    NavDrawer was already distinguished from Sidebar
  - Validated again after every change: `tsc --noEmit` clean, `next lint`
    clean, `next build` succeeds (same 19 routes, all statically
    prerendered); dev-server HTML inspection confirmed Farmer routes
    render both `<aside>` (desktop sidebar) and `.bottom-nav` with no
    "Menu" button, Operator/Admin routes render `<aside>` and "Menu" with
    no `.bottom-nav`, all 5 farmer icon ligatures (`home`, `event`,
    `receipt_long`, `queue`, `info`) appear in the rendered HTML, and
    active-state markers (`aria-current="page"`) appear exactly twice per
    page (Sidebar + the visible mobile nav) with no duplicate/incorrect
    active items
- **Phase 1 — Next.js + UX4G + Tailwind(layout-only) + PWA foundation:**
  - Next.js 16.3.4 App Router project scaffolded in place (React 19.2.8,
    TypeScript 5, ESLint 9, Tailwind CSS 4) via a scratch-directory
    `create-next-app` run merged in (couldn't run directly in this
    directory — npm rejects the uppercase-letter directory name `KS` as a
    package name)
  - `ux4g-web-components@2.0.1` installed via npm, version pinned exactly,
    matching the version Design.md §0 records as current (confirms that
    line of the doc is still accurate)
  - npm-only delivery — no CDN assets used, nothing mixed
  - CSS imported once at app root (`app/layout.tsx`), after Tailwind's
    import, so UX4G component styles are never lost to a Tailwind reset
    conflict
  - Runtime initialized via a dedicated Client Component
    (`components/Ux4gRuntime.tsx`) — side-effect import of
    `ux4g-web-components/design-system`, mounted once in the root layout;
    confirmed present in the shipped client JS bundle (not stripped)
  - `data-theme="light"` set on `<html>` — default UX4G theme, no custom
    token overrides added (per standing decision)
  - Smoke-test page (`app/page.tsx`) renders Button (base+variant+size,
    multiple variants, disabled state), Input (labelled, default + error
    state), Card (header/body/footer), Tag (status, matching the
    `centre_status` enum), and an interactive Modal driven entirely by the
    UX4G runtime (no React state) — every class verified against the
    installed package's README and compiled CSS, not invented
  - Tailwind scoped to two structural uses only: outer page shell
    (`min-h-screen flex flex-col`) and responsive column count on a grid
    (`grid grid-cols-1 sm:grid-cols-2`) — the actual gap value comes from
    `ux4g-gap-l`, not Tailwind, keeping the boundary real rather than
    nominal
  - PWA foundation: `public/manifest.webmanifest` + generated placeholder
    icons (192/512/512-maskable/apple-touch, using UX4G's own default
    `--ux4g-color-primary-600` primitive, not an invented brand colour) +
    metadata/viewport wiring in `app/layout.tsx`. No service worker, no
    offline sync, no push — deliberately out of scope for this phase
  - `.env.example` placeholder committed; no real credentials anywhere
  - Validated: `tsc --noEmit` clean, `next lint` clean, `next build`
    succeeds (both routes statically prerendered, no hydration/SSR
    errors), dev server smoke test returns HTTP 200 with `data-theme`
    present and no console errors
  - Confirmed and measured Design.md's flagged 8 MB CSS concern (§10, §14
    debt #7) directly in this project's own build: the compiled
    `ux4g.css` is 7.9 MB (3.83 MB gzip) — see Known Issues
  - Partially resolved a standing open question: the installed package's
    compiled CSS does wrap button base+variant selectors in `:where()` for
    `min-height`/`padding` (confirms that specific claim in the SKILL.md
    "v2.0.1 button theming note"). The note's broader claim — that
    `!important` is never needed for *colour* theming via the semantic
    token cascade — was not tested, since no custom theme was applied this
    phase. Still `TODO — VERIFY` before relying on it for colour overrides.
- Cross-document consistency audit performed (Phase 0.5, see below)

## CURRENT REPOSITORY STATE

- Application: **scaffolded**, reusable UI shell **plus two real screen
  groups** (`/operator`, all of `/farmer/*`) — Next.js App Router,
  TypeScript, same 19 routes (2 farmer route paths renamed this phase),
  builds and lints clean
- Backend: **not configured** (no Supabase project connected — correctly
  out of scope through Phase 2C)
- Database: **not created** (no tables, no migrations)
- UI: `/operator` (Phase 2B) and all 5 `/farmer/*` routes (Phase 2C) are
  real, UI-only screens backed by local demo state
  (`lib/demo/operatorDashboard.ts`, `lib/demo/farmerDashboard.ts`). Every
  Admin screen and every `/operator` sub-route (e.g. `/operator/queue`,
  distinct from the `/operator` dashboard itself) is still `ComingSoon`
- Auth: **not implemented** — role trees are separate route namespaces
  reached by URL, not gated by any login
- New repository content since Phase 2B: `components/farmer/*` (10
  files), `components/shared/*` (`WorkflowStepper`, `MetricCard` — both
  moved out of `components/operator/`), `lib/demo/farmerDashboard.ts`,
  rewritten `app/farmer/*` (route paths changed, see Phase 2C completed
  work above), one import-path edit in `app/operator/page.tsx`

## DECISIONS

- UX4G default theme used initially — no custom brand tokens invented
  (`docs/UX4G.md`)
- Supplied operator-dashboard screenshot is a visual/product reference only;
  UX4G is the implementation authority; UX4G wins on conflict
  (`docs/UX4G.md`)
- Deterministic, explainable Smart Allocation Engine — no ML/scoring black
  box (`docs/BUSINESS_LOGIC.md`)
- Supabase (Postgres + Auth + RLS + Realtime) as sole backend
  (`docs/ARCHITECTURE.md`)
- Payment = status tracking only, no real processing (`docs/PROJECT.md`,
  `docs/BUSINESS_LOGIC.md`)
- SMS notification starts as a mock adapter behind an abstraction; real
  integration optional/later (`docs/PROJECT.md`, `docs/ARCHITECTURE.md`)
- Next.js route grouping is not a security boundary; Supabase RLS is
  (`docs/ARCHITECTURE.md`, `docs/SECURITY.md`)
- Centre statuses: `OPEN`, `DELAYED`, `PAUSED`, `FULL`, `CLOSED`
  (`docs/PROJECT.md`, `docs/BUSINESS_LOGIC.md`)
- No automatic machine/equipment failure detection — operator-reported only
  (`docs/PROJECT.md`, `docs/BUSINESS_LOGIC.md`)
- Pre-arrival quality readiness is advisory-only, never shown as official
  acceptance (`docs/BUSINESS_LOGIC.md`, `docs/UI_SPEC.md`)
- UX4G runtime initialization lives in one dedicated Client Component
  (`components/Ux4gRuntime.tsx`), mounted once in the root layout — Phase 1
- Tailwind scoped to exactly two structural uses (outer shell flex,
  responsive grid column count); no Tailwind color/spacing/radius value
  anywhere UX4G already tokenizes it — Phase 1, see `docs/UX4G.md`
- PWA foundation is manifest + icons + metadata only; explicitly no service
  worker, no offline sync, no push notifications this phase — Phase 1
- Role hierarchy: `admin` route tree is the future **Master Admin** /
  system-wide interface, not a generic single Admin role. A future
  **Centre Admin** is expected to reuse the `operator` tree's operational
  pages under a wider permission set, not a separate nav structure. No
  user is modelled as tied to one physical PC — Phase 2A, per explicit
  user instruction; recorded in `lib/navigation.ts` and `app/admin/layout.tsx`
- **Superseded**: Farmer's mobile nav was originally the same NavDrawer
  pattern as Operator/Admin at every width. Replaced in the Phase 2A
  mobile/desktop-adaptation extension with a fixed BottomNav below `lg`
  (matching the supplied KisanSetu reference), while Farmer gained the
  same persistent desktop Sidebar every other role has at `lg`+. "Farmer
  stays simpler than Operator" is now expressed as fewer nav items (5 vs
  6) and a lighter Header, not as "no sidebar ever" — see `mobileNav` prop
  in `components/shell/AppShell.tsx`
- No dedicated vertical/sidebar-nav component exists in UX4G; `List` is
  reused for that purpose, applied to real `Link` elements — Phase 2A, see
  `components/shell/NavList.tsx`
- No "bottom navigation" component exists in UX4G either (checked README
  and grepped compiled CSS — confirmed absent); BottomNav composes one
  from verified layout utilities + icon glyphs instead of inventing a
  class — Phase 2A, see `components/shell/BottomNav.tsx`
- Icon ligature names for BottomNav were verified by extracting and
  inspecting the installed package's actual embedded icon font with
  fontTools, not assumed from Material Icons naming convention — Phase 2A
- Skip-link visible-on-focus behaviour needed one narrowly-scoped custom
  CSS rule (UX4G ships `.ux4g-sr-only` but no focus-visible companion) —
  Phase 2A, see `app/globals.css`
- Device safe-area inset (notch/gesture bar) for BottomNav needed one
  narrowly-scoped custom CSS rule and `viewportFit: "cover"` — UX4G has no
  utility for this platform concern — Phase 2A
- `/operator` dashboard demo data centralized in one file
  (`lib/demo/operatorDashboard.ts`), typed to match `docs/DATABASE.md`'s
  proposed schema shapes, with a persistent visible "Demo data" tag on the
  page itself — not just a code comment — Phase 2B
- Dashboard interactions (Call Next, Complete Processing, Check In, Pause/
  Resume Centre, Report Delay) are real local React state changes, not
  fake API calls — chosen over static/non-interactive mockup so the
  intended UX is actually demonstrable, while staying honest that none of
  it persists — Phase 2B
- `CapacityCard` uses the linear Progress Indicator, not the circular one
  — the circular variant's real compiled-CSS structure is materially more
  complex than its README example, and guessing at it risked a broken
  render — Phase 2B
- All operator dashboard action/link buttons use `ux4g-btn-md` (48px),
  not `-sm`/`-xs` (32px/24px, both under the 44px touch-target minimum) —
  Phase 2B, applies to every future dashboard's tap targets too
- Live Queue and Upcoming Bookings use List, not Table — avoids the
  horizontal-overflow risk a wide table carries on a phone, same reasoning
  already applied to nav in Phase 2A — Phase 2B
- Current Processing's workflow display uses the fuller 7-stage journey
  (Registration → Slot Booking → Check-in → Quality Check → Weighment →
  Procurement → Payment) rather than `docs/BUSINESS_LOGIC.md`'s original
  5-stage operator-actionable subset — the two are reconciled, not
  contradictory: the 7-stage view is display/context, the 5-stage subset
  remains what an operator can actually act on — Phase 2B, doc updated in
  the same change
- Farmer route rename: `/farmer/new-booking` → `/farmer/bookings/new`,
  `/farmer/status` → `/farmer/centre` — Phase 2C, per explicit
  instruction; `lib/navigation.ts` and `docs/UI_SPEC.md` updated in the
  same change, whole repo grepped afterward for stale references
- `WorkflowStepper` and `MetricCard` (renamed from `OperationalMetricCard`)
  promoted from `components/operator/` to `components/shared/` — Phase 2C,
  once a second role (Farmer) needed the same generic components; neither
  changed behaviour, only location/import path (and, for `MetricCard`,
  name)
- BookingForm's New Booking submit shows an explicit "demo, no booking
  created" message rather than a fake success screen — Phase 2C, Data
  Honesty
- Booking form uses native `<select>`/`<input type="date">` instead of
  UX4G's `ux4g-select`/Dropdown/Date Picker components — those exist but
  are undocumented-in-README custom widgets (search/filter logic, `data-
  ux-*` attributes) or, for Date Picker, not in the runtime's documented
  Behaviors Provided list; native controls are fully functional and
  accessible with zero guessed markup — Phase 2C
- **UX4G Input structure gap found**: the documented README Input example
  omits a `.ux4g-input`/`ux4g-input-input` wrapper the compiled CSS
  actually requires for correct border/height/focus styling. All Phase 2C
  form fields use the corrected structure; Phase 1/2A's existing inputs do
  not (not retroactively touched this phase, since Phase 2C's scope was
  Farmer-only) — flagged as a known limitation, recommended for a later
  cleanup pass

## OPEN QUESTIONS

- Allocation-engine ranking/scoring formula when multiple centres are
  eligible — not designed yet (`docs/BUSINESS_LOGIC.md`)
- Whether `FULL` centre status is operator-set, system-suggested, or both —
  not decided (`docs/BUSINESS_LOGIC.md`)
- Whether `CHECKED_IN` and `WAITING` are distinct queue states or collapsed
  into one (`docs/BUSINESS_LOGIC.md`)
- Whether an operator can be assigned to more than one centre — currently
  assumed one operator → one centre for MVP; unconfirmed
  (`docs/SECURITY.md`)
- The "v2.0.1 button theming note" in `SKILL.md`: the `:where()`-wrapper
  claim is now confirmed true for button sizing (see Phase 1 completed
  work above); the claim that colour theming needs no `!important` is
  still unverified — no custom theme has been applied yet (`docs/UX4G.md`)
- Exact Next.js client/server component boundary convention for UX4G runtime
  init — **resolved in Phase 1**: a single dedicated Client Component
  (`components/Ux4gRuntime.tsx`) mounted once in the root layout
  (`docs/UX4G.md`)
- No screenshot image has actually been inspected pixel-by-pixel by Claude in
  this conversation — the visual reference has been used only via the user's
  written description of it plus the attached image in the Phase 0.5
  message. If further screens need to match it closely, re-confirm details
  against the image directly during UI implementation.

## KNOWN ISSUES

- **8 MB CSS bundle is real and measured, not just documented risk.** The
  installed `ux4g-web-components@2.0.1` ships a 7.9 MB `styles/ux4g.css`
  (3.83 MB gzip) — confirms Design.md §10/§14 debt #7 directly against this
  project's own production build. For a PWA prototype whose target users
  may be on constrained mobile connections, this is a real first-load cost.
  No fix applied — out of scope for "minimum correct integration"; Design.md
  attributes this to the upstream package, not something introduced here.
  If it becomes a problem before demo day, options to revisit: font
  self-hosting as separate `woff2` (Design.md's own suggested fix, requires
  patching the installed package — not attempted), or accepting it as a
  known prototype-scope tradeoff.
- `create-next-app` cannot run directly inside this directory because npm
  rejects the uppercase directory name `KS` as a package name — worked
  around by scaffolding in a scratch directory and merging the generated
  files in, then confirming `package.json`'s `name` field independently.
  Documented here so the workaround isn't rediscovered as a surprise later.
- `next dev` auto-appended a `<!-- BEGIN:nextjs-agent-rules -->` block to
  `CLAUDE.md` (a documented Next.js 16 behavior, regenerated automatically
  unless disabled via `agentRules: false` in `next.config.ts`). Left in
  place — it's framework-standard, not a stray edit, and Next.js recommends
  committing it.
- **UX4G's Drawer runtime does not trap focus or return focus to the
  trigger button on close** (verified by reading
  `dist/runtime/design-system.mjs` directly — it removes the open class on
  Escape/overlay-click/close-button but does nothing with `document
  .activeElement`). Not patched — that would mean overriding component
  internals, which the UX4G contract disallows. Keyboard users can still
  reach and activate every drawer control via Tab (verified: `visibility:
  hidden` on the closed overlay correctly removes it from the tab order),
  they just aren't auto-returned to the menu button afterward. Acceptable
  for a 3-day prototype; flagged rather than silently left unmentioned.
- The bug described above (Dashboard nav item wrongly active on every
  sub-page) was caught by actually reading the rendered HTML, not assumed
  fixed — a reminder that shell code needs the same verification rigor as
  everything else, not just "the build succeeded."
- **Phase 2B**: `ux4g-progress-circle`'s real DOM contract (compiled CSS)
  is more complex than its README sample — not used, linear bar used
  instead; see Phase 2B completed work above.
- **Phase 2B**: no browser/screenshot tool is available in this
  environment, so the requested 1440/1280/1024/390/430px checks were done
  by rendered-HTML inspection and CSS-rule reasoning, not literal
  screenshots. Worth a real visual pass (browser devtools or the `run`
  skill, if it supports viewport resizing) before this is called
  demo-ready, not just build-clean.
- **Phase 2C**: same no-screenshot-tool limitation applies to the Farmer
  routes — see Phase 2C completed work above. This is now a
  cross-cutting gap (Phase 2B and 2C both), not a one-off, and should be
  resolved (real browser check) before any of this is called demo-ready.
- **Phase 2C**: the Input structure gap (missing `.ux4g-input`/
  `ux4g-input-input` wrapper) affects every input built before this
  phase's discovery — the Phase 1 smoke test's two inputs, and nothing
  else, since Phase 2B's operator dashboard used Textarea (a different,
  correctly-simple component) rather than Input. Worth a small follow-up
  pass to add the wrapper there too, though it's cosmetic (likely
  under-styled height/border, not a functional break) rather than urgent.
- **Phase 2C**: `ux4g-select` and Date Picker's real interactive contracts
  were not implemented (native controls used instead — see Decisions
  above) — if a future phase wants the UX4G-branded versions specifically,
  their actual DOM/JS contract still needs to be reverse-engineered from
  the compiled CSS and runtime source, the README does not cover it.

## NEXT PHASE

Phase 2D — remaining scope, in whatever order is approved next: Master
Admin dashboard real content, and/or Supabase backend setup (auth, RLS,
schema) per the Recommended Build Order (Phase 0 report). Also worth
considering before further UI phases: a real browser/visual check of
Phase 2B and 2C's responsive claims (see Known Issues), and the small
Input-wrapper fix for the Phase 1 smoke test. Phase 2C's instructions were
explicit that Master Admin/Supabase/auth/RLS/allocation/Realtime/SMS/
payment don't start without separate approval — none started.

## LAST VERIFIED

- `.claude/skills/ux4g-design/SKILL.md` and `Design.md`: read in full six
  times (Phase 0, 0.5, 1, 2A, 2B, 2C); content unchanged between reads.
- Phase 1: `npm view ux4g-web-components version` → `2.0.1`, matching
  Design.md §0's recorded npm version at time of writing.
- Phase 1: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean (see Phase 1 completed work above for details).
- Phase 1: dev server smoke test (`curl` against `http://localhost:3000/`)
  returned HTTP 200 with `data-theme="light"` present in the rendered HTML;
  manifest and favicon both returned HTTP 200; dev server log showed no
  compile or runtime errors.
- Phase 1: shipped client JS bundle grepped directly for
  `__UX4G_RUNTIME_INITIALIZED__` and `data-modal-target` — both present,
  confirming the runtime actually reaches the browser rather than being
  silently stripped as server-only code.
- Phase 2A: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean, all 19 routes statically prerendered.
- Phase 2A: every new route checked directly via `curl` — all return HTTP
  200. Rendered HTML for `/operator` and `/operator/queue` inspected
  directly: exactly one `<h1>`; landmarks present and distinctly labelled
  (`<header>`, two `<nav>`, `<aside>` on sidebar variant, `<main
  id="main-content">`); skip-link target exists; every `<button>` carries
  an explicit `type="button"`; before the NavList fix, 4
  `aria-current="page"` occurrences appeared on `/operator/queue` (bug);
  after the fix, exactly 2 (sidebar + drawer copies of the one correct
  item).
- Phase 2A: confirmed the Phase 1 smoke test at `/` still returns HTTP 200
  and still contains its Modal/Button markup — not modified.
- Phase 2A mobile/desktop-adaptation extension: `tsc --noEmit`, `next
  lint`, `next build` all re-run and passed clean after every change
  (three full passes total this extension), same 19 routes.
- Phase 2A extension: font glyph verification was not assumed — the
  embedded `UX4G Material Icons Outlined` font was base64-decoded out of
  the compiled CSS, loaded with fontTools, and its glyph order (2183
  names) checked directly for `home`, `event`, `receipt_long`, `queue`,
  `info` before any was used in markup.
- Phase 2A extension: rendered HTML checked directly for both roles —
  `/farmer/queue` contains `<aside>`, `.bottom-nav`, all 5 icon ligatures,
  and no `>Menu<` button; `/operator/queue` contains `<aside>` and
  `>Menu<` but no `.bottom-nav`; both show exactly 2
  `aria-current="page"` occurrences (Sidebar + the one visible mobile nav
  for that role) with the correct item active, not the root Dashboard
  item.
- Phase 2A extension: after relabelling BottomNav's landmark, confirmed
  by direct grep that `/farmer/queue` contains two `<nav
  aria-label="Primary">`-family landmarks with distinct label text
  (`"Primary"` on Sidebar, `"Primary (mobile)"` on BottomNav), not
  duplicates.
- `.ux4g-ai-center`'s apparent second, `!important`-qualified definition
  in the compiled CSS was checked in full selector context (not just
  matched in isolation) before trusting it in BottomNav — confirmed scoped
  to an unrelated `.ux4g-identity-access-layout-card .ux4g-form-box`
  compound selector, so it does not affect BottomNav's plain
  `ux4g-ai-center` usage.
- Compiled CSS grepped directly (not assumed) before use, twice this
  phase: `.ux4g-list-item-row.active` (confirmed real, bound to
  `--ux4g-bg-primary`/`--ux4g-text-brand-primary-default`) and
  `.ux4g-navbar-desktop`/`-mobile`'s `@media (max-width:768px)` toggle
  (informed the decision to use Tailwind's 1024px `lg:` breakpoint for the
  sidebar instead, matching Design.md §8 rather than UX4G's own 768px
  navbar-links breakpoint, since the sidebar and the navbar-links pattern
  are different components with no obligation to share a cutoff).
- No Supabase project, no auth, no database migration has been created —
  confirmed by absence of any Supabase-related file or dependency in
  `package.json` at time of writing (still true after Phase 2B).
- Phase 2B: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean, twice (once before the touch-target fix, once after) — same 19
  routes, all statically prerendered.
- Phase 2B: rendered `/operator` HTML inspected directly — one `<h1>`;
  unchanged Phase 2A landmarks; `"Demo data"` tag present; zero
  `<table>` elements; every `<button>` carries an explicit `type`; the
  seeded `Call Next Farmer` button renders `disabled` (correct, given a
  farmer is already PROCESSING in the seed data); `--ux4g-progress-value:76`
  present on the capacity bar (matches 76/100 booked in the seed data);
  all 7 workflow stage labels appear exactly twice each (desktop +
  mobile dual-render).
- Phase 2B: button min-height claims verified by reading the compiled CSS
  directly, not assumed — `.ux4g-btn-sm` 2rem (32px), `.ux4g-btn-xs`
  1.5rem (24px), `.ux4g-btn-md` `var(--ux4g-size-48)` (48px, more specific
  than the zero-specificity `:where()` base rule's 2.5rem). All nine
  operator buttons confirmed as `ux4g-btn-md` in rendered HTML after the
  fix (`grep -o ux4g-btn-md | wc -l` → 9).
- Phase 2B: confirmed the Phase 1 smoke test (`/`) and the Farmer
  (`/farmer`) and Admin (`/admin`) shells still return HTTP 200 and were
  not modified by this phase's changes.
- Phase 2C: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean after deleting a stale `.next/` cache (git-ignored build output
  referencing the pre-rename route paths — not a code defect); all 19
  routes still statically prerender, now listing `/farmer/bookings/new`
  and `/farmer/centre`.
- Phase 2C: all 5 Farmer routes checked directly via `curl` — all return
  HTTP 200. Rendered HTML for every one inspected directly: exactly one
  `<h1>` each; zero `<table>` elements across all 5; every `<button>`
  carries an explicit `type`; all 5 New Booking form fields have correct
  `label`/`for` pairs; the corrected `.ux4g-input`/`ux4g-input-input`
  structure renders as written (`grep` confirmed on both a `<select>` and
  an `<input type="date">` field); `/farmer/bookings/new` shows "New
  Booking" active in nav, not "My Bookings" (confirms the shared
  `getActiveHref` rule needed no changes for the new nested route);
  BottomNav's `aria-label="Primary (mobile)"` stays distinct from
  Sidebar's `"Primary"`; all 7 workflow stage labels appear twice on the
  dashboard (desktop + mobile dual-render).
- Phase 2C: confirmed the Phase 1 smoke test (`/`), the Operator dashboard
  (`/operator`), and the Admin shell (`/admin`) all still return HTTP 200
  and render their expected content — the one intentional touch to a
  Phase 2B file (`app/operator/page.tsx`'s `MetricCard`/`WorkflowStepper`
  import paths) did not change its rendered output, confirmed by grepping
  for `"Centre Operations Dashboard"` in the response.
