# UX4G Implementation Contract (project-specific)

This is a concise, project-scoped extract of confirmed findings from
`.claude/skills/ux4g-design/SKILL.md` and
`.claude/skills/ux4g-design/Design.md`. It does not duplicate the full
872-line `Design.md` — that file remains authoritative; this file is a
pointer plus the decisions specific to this project. On any conflict,
`Design.md` wins.

## Screenshot role vs. UX4G role

- **SCREENSHOT ROLE**: visual/product reference only. The supplied operator
  dashboard screenshot informs information hierarchy, dashboard composition,
  content grouping, navigation concept, and density. It is not an
  implementation spec and its CSS is never copied.
- **UX4G ROLE**: implementation/design-system authority. Actual components,
  tokens, typography, spacing, states, interaction patterns, accessibility,
  and responsive behaviour all come from UX4G. Where the screenshot and UX4G
  conflict, UX4G wins (per user decision, Phase 0.5 §4).

## Package selection — `VERIFIED` (Design.md §10)

- Package: **`ux4g-web-components`** (npm). Exact name only — other
  similarly-named packages exist and are not this one.
- Install: `npm i ux4g-web-components`.
- CSS: `import 'ux4g-web-components/styles.css'` once at app entry.
- JS runtime: `import 'ux4g-web-components/design-system'` (auto-init,
  event-delegated). Powers Dropdown, Modal, Tooltip, Popover, Accordion, Tab,
  Carousel, Drawer, Mega Menu, Alert. Components not on that list are
  CSS-only.
- No separate React/Angular component library exists. One CSS+JS artifact,
  consumed by applying `ux4g-*` classes directly to `className` (React) or
  `class` (HTML/Angular). No props API, no hooks (Design.md §12).
- `Class_Builder` types are available at `ux4g-web-components/types` for
  partial type safety on class name strings.

## Next.js client/server considerations — `VERIFIED` reasoning, `TODO — VERIFY DURING PHASE 1` exact file boundaries

- The JS runtime binds via DOM event delegation and requires a browser
  environment, so its init must run inside a Client Component
  (`'use client'`).
- Any screen using interactive UX4G behaviours (Modal, Dropdown, Tab,
  Accordion, etc.) must be, or contain, a Client Component.
- Static markup-only UX4G usage (Card, Badge, non-interactive Button) can
  stay in Server Components.
- Exact project convention (e.g. a single root `Ux4gRuntimeInit` client
  component vs. per-page) is not yet decided — `TODO — VERIFY DURING PHASE 1`.

## Theme requirement — `DECISION`

- `DECISION` (Phase 0.5): use the **default UX4G theme** initially. No
  custom purple/brand tokens, no hard-coded brand colours.
- `data-theme="light"|"dark"` on `<html>` is required regardless — components
  have no fallback theme (Design.md §10).
- If branding closer to the reference screenshot is wanted later, it must go
  through the documented override mechanism only: map approved colours to
  confirmed UX4G tokens, override once at `:root` with `!important`
  (Design.md §0.6, SKILL.md). Never invent a token name. Not needed for the
  current decision.
- The "v2.0.1 button theming note" in `SKILL.md` (claiming `!important` is no
  longer required on button root overrides due to a `:where()` specificity
  wrapper) is **not corroborated by `Design.md`** and is not sourced from an
  authoritative UX4G doc path. `TODO — VERIFY DURING PHASE 1` against the
  actual shipped CSS before relying on it. Until verified, follow
  `Design.md`'s explicit `!important` rule if/when theming is implemented.

## Component class composition rules — `VERIFIED` (Design.md §2, §12)

- Always write full composition: base + variant + size, e.g.
  `ux4g-btn ux4g-btn-primary ux4g-btn-md`.
- Base class requirement is inconsistent across components (required for
  `input`/`card`/`alert`/`icon-btn`; optional for `btn`/`spinner`;
  nonexistent for `chip`/`badge`). Writing base + variant is safe under all
  three models — always do it.
- Known trap: `.ux4g-btn` alone (no variant) matters inside Time Slot
  component subtrees (`ux4g-time-slot-weekly-actions`,
  `ux4g-time-slot-compact-actions`) — omitting the base class there silently
  breaks layout. Not directly relevant to this project's screens today, but
  noted in case Time Slot components are used later.

## Token rules — `VERIFIED` (Design.md §1, §3, §5, §13)

- Never reference tier-1 primitives directly (`Colors/Primary/600`,
  `space-4`). Use tier 2 (semantic) or tier 3 (role) tokens.
- Pick spacing by axis/role — `Inline`, `Stack`, `Section`, `Padding` — not
  by matching pixel value. The same t-shirt size means a different value per
  axis.
- No raw hex/rgb/px in application code. If a needed value has no token,
  that gap must be named explicitly before writing custom CSS.

## Accessibility requirements — `VERIFIED` (Design.md §9)

- Baseline: WCAG 2.1 AA. 4.5:1 body text, 3:1 large text/non-text UI
  boundaries, 44×44px minimum target, visible focus via `Focus/Outline`.
- **Known contrast failures relevant to this project's dashboards:**
  - `Control/Border/Default` fails non-text contrast (1.21:1 light / 1.73:1
    dark). Relevant to every form Input/Checkbox/Radio in Farmer and
    Operator flows — do not rely on this token alone as a control's only
    visible boundary; treat as a release blocker per Design.md, not
    backlog.
  - `Text/Neutral/Tertiary` on `Background/Neutral/Soft` fails at 4.35:1
    light. Relevant to any muted/secondary label text on a soft-background
    card (e.g. KPI card subtext).
  - `Background/Neutral/Soft` and `Background/Neutral/Subtle` are the same
    value in Dark mode — use `Background/Neutral/Elevated` for real layer
    separation in dashboard cards (Operator dashboard has many stacked
    surfaces per the reference screenshot).
- `Text/Neutral/Disabled` at 25% alpha is exempt under 1.4.3 but disabled
  state must not be the only signal — pair with `aria-disabled` and
  supporting text (relevant to e.g. a `CLOSED` centre's disabled booking
  action).

## Tailwind boundary — `DECISION`

- Tailwind may be used **only** as layout glue: page grid/flex composition,
  responsive containers, positioning between UX4G components.
- Tailwind must **not** control colour, spacing values, radius, typography,
  borders, shadows, focus treatment, or component states anywhere a
  `ux4g-*` class or `--ux4g-*` token already exists.
- Do not duplicate UX4G's own utility classes (`ux4g-p-l`, `ux4g-gap-m`,
  `ux4g-radius-md`) with Tailwind equivalents inside a UX4G component
  subtree.

## Custom CSS policy — `VERIFIED` (Design.md §13, SKILL.md)

- Allowed only for application-specific layout/behaviour UX4G doesn't
  provide. Keep minimal, document why inline at the point of use.
- Never override component internals via descendant selectors or
  `!important` — the only sanctioned `!important` usage is the documented
  root token override pattern above, and only if/when custom theming is
  adopted.
- Do not rebuild an existing UX4G component with custom markup.

## Authoritative UX4G documentation sources — `VERIFIED` (Design.md §0.5)

- Web docs: `https://doc.ux4g.gov.in/web/` and `/web/*`, entered via that
  path's `ai.txt` → `llms.txt` / `llms-full.txt`.
- npm package: `ux4g-web-components` (current version per Design.md §0:
  package version 2.0.1 as of 2026-08-26; CDN line is at 3.1.0 — Design.md
  itself flags these as unaligned; treat the installed npm package's own
  shipped CSS/README as ground truth once installed).
- **Do not use**: `doc.ux4g.gov.in/category/*`, `/components/*.php`,
  `docux4g.dl6.in`, `ux4g-design.netlify.app`. These are explicitly
  legacy/mirror/stale per Design.md §0.5 and §12, and document ~16
  components (Offcanvas, Toasts, Button Group, etc.) that do not exist in
  the shipped package.

## Component names used in `docs/UI_SPEC.md`

Every UX4G component name referenced in `docs/UI_SPEC.md` traces to
Design.md §12's parity table (✅ in the Web/CSS column) unless explicitly
marked `TODO — VERIFY DURING PHASE 1` at the point of use. No variant class
name is treated as confirmed until checked against the installed package or
`doc.ux4g.gov.in/web/ai.txt` in Phase 1.
