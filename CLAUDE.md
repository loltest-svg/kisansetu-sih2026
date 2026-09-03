# CLAUDE.md — Operating Manual

Permanent operating rules for Claude Code on this repository. Read this before
making any change.

## Project identity

- **Project:** Smart MSP Procurement Coordination Platform
- **Competition:** Smart India Hackathon 2026 (SIH 2026)
- **Problem statement:** SIH26032 — Delay in Providing Farmers Information
  Regarding Procurement Schedules and Status
- **Constraint:** 3-day working PWA prototype. Every decision is filtered
  through this constraint — see `docs/PROJECT.md` §MVP scope before adding
  anything not already listed there.

## Authoritative documents (in priority order)

1. Explicit product/project decisions the user gives directly in conversation
2. `.claude/skills/ux4g-design/SKILL.md`
3. `.claude/skills/ux4g-design/Design.md`
4. `/docs/*.md` (this repository's own governance docs)
5. Actual repository/source-code state
6. Assumptions — always labelled `ASSUMPTION`, never treated as fact

If any of these disagree, resolve upward through this list and record the
resolution in `docs/PROJECT_STATE.md`.

## Mandatory pre-coding behaviour

- Inspect relevant existing code before editing it.
- Read the relevant `/docs/*.md` file(s) for the area being touched.
- For any UI work: read/refer to `.claude/skills/ux4g-design/SKILL.md` and
  `Design.md` before writing markup. Follow the skill's mandatory preflight
  (theme confirmation, component plan) before generating UX4G interface code.
- Do not guess at unsupported UX4G components, variants, classes, or tokens.
  If something is not confirmed in `Design.md` or the installed package, say
  so explicitly and treat it as `TODO — VERIFY`.
- Identify conflicts (with UX4G, with existing docs, with prior decisions)
  before implementing — do not implement past a conflict silently.

## Architectural rules

- Frontend: Next.js (App Router) + React + TypeScript + PWA.
- Backend: Supabase — PostgreSQL, Supabase Auth, Row Level Security,
  Supabase Realtime.
- Business logic (allocation, ETA, centre status derivation) is deterministic
  and explainable — no ML, no opaque scoring.
- See `docs/ARCHITECTURE.md` for the full picture and responsibility split.

## UX rules

- UX4G (`ux4g-web-components`) is the design-system authority for all
  components, tokens, typography, spacing, and interaction patterns. See
  `docs/UX4G.md` for the project-specific contract.
- Any supplied visual reference (screenshots, mockups) informs information
  hierarchy and layout only — never copy its raw CSS or invent matching
  custom classes/tokens.
- No duplicate/parallel component system. Do not hand-roll a component UX4G
  already provides.
- No unnecessary custom CSS. Custom CSS is allowed only for
  application-specific layout/behaviour UX4G doesn't cover, and must be
  documented inline with why.
- No arbitrary design tokens. Only tokens confirmed in `Design.md` or the
  installed package may be referenced or overridden.
- Accessibility baseline: WCAG 2.1 AA, per `Design.md` §9.
- Farmer experience: mobile-first. Operator/Admin experience: responsive,
  desktop-first.

## Security rules

- Never expose secrets (env values, keys, tokens) in code, docs, commits, or
  chat output.
- Next.js route grouping/role-based routing is a UX convenience, **never** a
  security boundary.
- Supabase Row Level Security is mandatory and is the actual access-control
  boundary — every table holding role-scoped data needs an explicit policy.
- Role access must be verified against RLS policy, not assumed from UI state.
- See `docs/SECURITY.md`.

## MVP rules — explicitly out of scope

No machine learning, no blockchain, no chatbot, no facial recognition, no
microservices split, no native Android app, no real payment/banking
integration. Payment is status-tracking only. SMS notification starts as a
mockable abstraction; real gateway integration is optional/later, never
assumed functional.

## Implementation discipline

- Make small changes; avoid large speculative diffs.
- Verify behaviour after any major change before moving on.
- Do not silently change architecture — if a decision in `docs/` needs to
  change, say so and update the doc in the same change.
- Document architectural changes where they happen (`docs/ARCHITECTURE.md`,
  `docs/DATABASE.md`, etc.) — don't let docs drift from reality.
- Update `docs/PROJECT_STATE.md` after each completed phase.
