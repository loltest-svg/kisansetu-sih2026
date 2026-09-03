# Project State

## CURRENT PHASE

Phase 2A — Application UI Shell (extended: genuine mobile/desktop
adaptation, per-breakpoint, not a scaled-down desktop layout)

## COMPLETED

- Phase 0 reconnaissance (repository inspection, UX4G findings, architecture
  proposal, screen map, entity map, allocation-engine input/output sketch,
  MVP scope, risks)
- Phase 0.5 project constitution (`CLAUDE.md` + 9 files under `/docs`, git
  initialized, checkpoint committed)
- Phase 1 Next.js + UX4G + Tailwind(layout-only) + PWA foundation (see
  below for full detail; unchanged this phase, still verified working)
- UX4G `SKILL.md` read completely (four times — Phase 0, 0.5, 1, and 2A)
- UX4G `Design.md` read completely (four times — Phase 0, 0.5, 1, and 2A)
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

- Application: **scaffolded**, now with a **reusable UI shell** — Next.js App
  Router, TypeScript, 19 routes total (1 smoke test + 15 role screens +
  `/_not-found` + implicit), builds and lints clean
- Backend: **not configured** (no Supabase project connected — correctly out
  of scope through Phase 2A)
- Database: **not created** (no tables, no migrations)
- UI: **shell only** — Header/Sidebar/NavDrawer/PageContainer/PageHeader
  built and reused across all three role trees; every individual screen's
  real content is still `ComingSoon` (Phase 2B)
- Auth: **not implemented** — role trees are separate route namespaces
  reached by URL, not gated by any login
- New repository content since Phase 1: `components/shell/*` (7 files),
  `lib/navigation.ts`, `app/farmer/*`, `app/operator/*`, `app/admin/*` (15
  route files + 3 layouts)

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

## NEXT PHASE

Phase 2B — Real screen content (Farmer/Operator/Admin, per
`docs/UI_SPEC.md`, replacing each `ComingSoon`) and/or Supabase backend
setup, per the Recommended Build Order (Phase 0 report) — not started;
awaiting explicit approval.

## LAST VERIFIED

- `.claude/skills/ux4g-design/SKILL.md` and `Design.md`: read in full four
  times (Phase 0, 0.5, 1, 2A); content unchanged between reads.
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
  `package.json` at time of writing.
