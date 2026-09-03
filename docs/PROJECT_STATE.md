# Project State

## CURRENT PHASE

Phase 0.5 — Project Constitution & Documentation

## COMPLETED

- Phase 0 reconnaissance (repository inspection, UX4G findings, architecture
  proposal, screen map, entity map, allocation-engine input/output sketch,
  MVP scope, risks)
- UX4G `SKILL.md` read completely (twice — Phase 0 and Phase 0.5)
- UX4G `Design.md` read completely (twice — Phase 0 and Phase 0.5)
- Architecture, UX4G contract, UI spec, database proposal, business logic,
  security model, and demo story documented under `/docs`
- `CLAUDE.md` operating manual created
- Cross-document consistency audit performed (see below)

## CURRENT REPOSITORY STATE

- Application: **not scaffolded** (no Next.js project yet)
- Backend: **not configured** (no Supabase project connected)
- Database: **not created** (no tables, no migrations)
- UI: **not implemented** (no components written)
- Only content in the repository: `.claude/skills/ux4g-design/*`,
  `/docs/*.md`, `CLAUDE.md`, `.gitignore`, and git history itself.

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
- The "v2.0.1 button theming note" in `SKILL.md` (claims `!important` no
  longer needed for button root token overrides) is uncorroborated by
  `Design.md` — needs verification against the installed package before any
  theming work relies on it (`docs/UX4G.md`)
- Exact Next.js client/server component boundary convention for UX4G runtime
  init — not yet decided (`docs/UX4G.md`)
- No screenshot image has actually been inspected pixel-by-pixel by Claude in
  this conversation — the visual reference has been used only via the user's
  written description of it plus the attached image in the Phase 0.5
  message. If further screens need to match it closely, re-confirm details
  against the image directly during UI implementation.

## NEXT PHASE

Phase 1 — Project Foundation (not started; awaiting explicit approval)

## LAST VERIFIED

- `.claude/skills/ux4g-design/SKILL.md` and `Design.md`: read in full this
  session (Phase 0 and re-confirmed Phase 0.5); content unchanged between
  reads.
- Repository file listing: confirmed empty of application code immediately
  before writing this document (`ls` on `/Users/tanshu/KS` and `/docs`).
- No Supabase project, no npm install, no Next.js scaffold has been run —
  confirmed by absence of `package.json`/`node_modules` in the repository
  listing.
