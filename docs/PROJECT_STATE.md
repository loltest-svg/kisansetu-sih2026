# Project State

## CURRENT PHASE

Phase 1 — Project Foundation

## COMPLETED

- Phase 0 reconnaissance (repository inspection, UX4G findings, architecture
  proposal, screen map, entity map, allocation-engine input/output sketch,
  MVP scope, risks)
- Phase 0.5 project constitution (`CLAUDE.md` + 9 files under `/docs`, git
  initialized, checkpoint committed)
- UX4G `SKILL.md` read completely (three times — Phase 0, 0.5, and 1)
- UX4G `Design.md` read completely (three times — Phase 0, 0.5, and 1)
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

- Application: **scaffolded** — Next.js App Router, TypeScript, one smoke-test
  route (`/`), builds and lints clean
- Backend: **not configured** (no Supabase project connected — correctly out
  of scope for Phase 1)
- Database: **not created** (no tables, no migrations)
- UI: **foundation only** — no Farmer/Operator/Admin screens built; only the
  integration smoke test at `/`
- Auth: **not implemented**
- New repository content since Phase 0.5: `app/`, `components/`,
  `public/`, `node_modules/` (git-ignored), `package.json`,
  `package-lock.json`, `tsconfig.json`, `next.config.ts`,
  `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts`, `.env.example`

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

## NEXT PHASE

Phase 2 — Real UI implementation (Farmer/Operator/Admin screens per
`docs/UI_SPEC.md`) and/or Supabase backend setup, per `docs/PROJECT_STATE.md`
Recommended Build Order (Phase 0 report) — not started; awaiting explicit
approval.

## LAST VERIFIED

- `.claude/skills/ux4g-design/SKILL.md` and `Design.md`: read in full three
  times (Phase 0, 0.5, 1); content unchanged between reads.
- Phase 1: `npm view ux4g-web-components version` → `2.0.1`, matching
  Design.md §0's recorded npm version at time of writing.
- Phase 1: `tsc --noEmit`, `next lint`, `next build` all run and passed
  clean this session (see Phase 1 completed work above for details).
- Phase 1: dev server smoke test (`curl` against `http://localhost:3000/`)
  returned HTTP 200 with `data-theme="light"` present in the rendered HTML;
  manifest and favicon both returned HTTP 200; dev server log showed no
  compile or runtime errors.
- Phase 1: shipped client JS bundle grepped directly for
  `__UX4G_RUNTIME_INITIALIZED__` and `data-modal-target` — both present,
  confirming the runtime actually reaches the browser rather than being
  silently stripped as server-only code.
- No Supabase project, no auth, no database migration has been created —
  confirmed by absence of any Supabase-related file or dependency in
  `package.json` at time of writing.
