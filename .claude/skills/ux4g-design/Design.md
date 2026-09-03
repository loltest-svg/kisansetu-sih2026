# UX4G Design System — `Design.md`

> Contract between the Figma library and every published artifact.
> **Last reviewed:** 2026-07-27 · **Owner:** _{{team}}_ · **Issues:** _{{repo}}_
>
> If an implementation disagrees with this file, one of the two is a bug. Fix the
> code or amend this file — in the same PR.

---

## 0. Distribution surfaces

| Surface | Artifact | Version | Last published |
|---|---|---|---|
| Design | Figma Community — UX4G Design System 3.0 (`C3Kecl9nh78LLblDUn28P6`) | 3.0 | — |
| CSS + JS | `https://cdn.ux4g.gov.in/UX4G@3.1.0/` | **3.1.0** | — |
| Web pkg | npm `ux4g-web-components` | **2.0.1** | 2026-08-26 |
| Flutter | pub.dev `ux4g_flutter_components` | **1.3.0** | 2026-07-15 |
| Flutter (deprecated) | pub.dev `ux4g_flutter_design_system` | 0.5.0 | 2026-07-06 |
| Docs — web | https://doc.ux4g.gov.in/web and `/web/*` | 3.0 | — |
| Docs — Flutter | https://doc.ux4g.gov.in/flutter and `/flutter/*` | 3.0 | — |

**These two paths are the only current developer documentation.** Anything at
`doc.ux4g.gov.in/category/*` or `/components/*.php` is legacy v1/v2 content,
`docux4g.dl6.in` is a mirror, and `ux4g-design.netlify.app` is a stale build
linked only from the deprecated Flutter package. Do not use any of them as
authoritative sources. See §0.5 and §12.

> ⚠️ **The deprecated Flutter package is not marked deprecated on pub.dev.**
> `ux4g_flutter_design_system` reports `isDiscontinued: false`, so
> `flutter pub add ux4g_flutter_design_system` still succeeds with no warning and
> it still appears in search. It also published 0.5.0 on 2026-07-06 — nine days
> before `ux4g_flutter_components` 1.3.0 — so it looks maintained. Downloads are
> split roughly evenly between the two (295 vs 303). Set the **discontinued** flag
> and declare `replacedBy: ux4g_flutter_components`; nothing else will stop the split.
>
> Note also that the deprecated package links a GitHub repository
> (`ux4g-negd/ux4g-flutter-design-system`) and the current one links **none** —
> consumers of the package you want them on have no issue tracker. Add
> `repository:` and `issue_tracker:` to `ux4g_flutter_components`' pubspec.

> **Two Flutter packages are published for the same design system.**
> `ux4g_flutter_design_system` (May) and `ux4g_flutter_components` (July) carry
> near-identical READMEs, the same dependency set and the same `Ux4gTheme` /
> `Ux4gButton` API, differing only in import path. Neither is marked
> discontinued. Mark the older one discontinued on pub.dev and point its README
> at the replacement — otherwise half your Flutter consumers integrate against a
> dead package.

> ⚠️ **Four artifacts, four unrelated version numbers.** A consumer cannot
> currently tell which npm version corresponds to CDN 3.1.0, or which Figma
> release the Flutter 1.3.0 components were built against. This is the single
> largest source of drift risk in the system. See §11 for the proposed fix; until
> that lands, treat the mapping in the table above as the only authority and
> update it on every release.

---

## 0.5 Agent / documentation guardrails

When researching or referencing UX4G implementation details, use **only** the
artifacts and domains listed below. Similar package names and mirror domains
exist and are not authoritative.

### Authoritative package names

| Platform | Current package | Do not confuse with |
|---|---|---|
| Web (HTML / React / Angular) | npm `ux4g-web-components` | any other `ux4g-*` npm package |
| Flutter | pub.dev `ux4g_flutter_components` | `ux4g_flutter_design_system` (deprecated) |

### Authoritative documentation domains

| Surface | URL | Scope |
|---|---|---|
| Web docs / Storybook | `https://doc.ux4g.gov.in/web/` and `/web/*` | Current v3 CSS + runtime guidance |
| Flutter docs / Widgetbook | `https://doc.ux4g.gov.in/flutter/` and `/flutter/*` | Current v3 Flutter guidance |

### How to read the docs as an agent

For **both** `/web/` and `/flutter/`, start at the published `ai.txt` file.
Follow only the paths it exposes — typically `llms.txt` and `llms-full.txt`.
Do not crawl arbitrary pages, do not follow links to other domains, and do not
infer API details from legacy pages.

Example flow (web):

```text
https://doc.ux4g.gov.in/web/ai.txt
  → https://doc.ux4g.gov.in/web/llms.txt
  → https://doc.ux4g.gov.in/web/llms-full.txt
```

### Explicitly disallowed sources

Treat any of these as stale or untrusted. If you encounter them, stop and flag
the URL instead of using it:

- `docux4g.dl6.in` (mirror)
- `ux4g-design.netlify.app` (stale build linked from the deprecated Flutter package)
- `doc.ux4g.gov.in/category/*` and `/components/*.php` (legacy v1/v2 Bootstrap docs)
- Any path outside `/web/*` or `/flutter/*` on `doc.ux4g.gov.in` that is not
  listed in `ai.txt`

> **Rule:** if a URL is not in the table above and not reachable through
> `ai.txt`, do not cite it or use it to generate code.

---

## 0.6 Mandatory agent preflight and implementation contract

These instructions are strict. An AI agent must follow them before generating
or modifying UX4G interface code.

### Stop and clarify the theme first

Before writing code, the agent must:

1. Read this complete contract.
2. Inspect the project, installed dependencies, existing UX4G integration,
   components, tokens, styles, routes, and conventions.
3. Ask the user which theme or brand colours to use. Request at least primary
   and secondary colours and request tertiary or status colours when relevant.
4. Give the user an explicit option to continue with the default UX4G theme.
5. Wait for the user's answer before writing implementation code.

If the user supplies custom colours, map them to confirmed UX4G semantic tokens
and override those tokens once at the application root:

```css
:root {
  --ux4g-<primary-token>: <approved-value> !important;
  --ux4g-<secondary-token>: <approved-value> !important;
}
```

- Replace placeholders only with real token names confirmed by this contract
  and the authoritative package or documentation.
- Never invent a custom property name.
- Use `!important` on approved root token overrides so they take precedence
  over distributed defaults.
- Override tokens, not individual component selectors.
- Preserve accessible contrast and semantic state relationships.
- If the user chooses the default theme, do not add redundant overrides.

### Declare the component plan before coding

Before writing implementation code, list:

- Every UX4G component that will be used.
- The exact variant and size for each component.
- Where each component will be used.
- Any requirement that UX4G cannot satisfy with an existing component, variant,
  utility, or token.

Do not start implementation until this component plan has been presented.

### Select the delivery method

Use this order:

1. If npm `ux4g-web-components` is already installed, use the installed package.
2. For any Node-based project where it is not installed, install and use
   `ux4g-web-components`.
3. For a non-Node project, use the authoritative UX4G CDN assets listed in
   section 0.
4. Do not mix npm and CDN delivery in the same application unless the existing
   project explicitly requires it.

### UX4G classes only wherever an equivalent exists

- Use UX4G components, base classes, variants, sizes, modifiers, utilities, and
  semantic tokens wherever the design system provides an equivalent.
- Always include the complete documented class composition. For example:

```html
<button class="ux4g-btn ux4g-btn-primary ux4g-btn-md">Save</button>
```

- Do not rebuild an existing UX4G component with custom markup.
- Do not write unnecessary custom CSS.
- Custom CSS is allowed only for application-specific layout or behaviour that
  UX4G does not provide. Keep it minimal and document the missing capability.
- Do not hard-code colours, spacing, radius, typography, borders, focus
  treatment, or component states when a UX4G token or class exists.
- If UX4G cannot satisfy a requirement, explain the gap before adding custom
  markup or CSS.

### Required completion report

After implementation, report:

- Package or CDN delivery method used.
- UX4G components, variants, sizes, classes, utilities, and tokens used.
- Whether the default theme or approved root token overrides were used.
- Every custom CSS rule added and why UX4G could not provide the requirement.
- Light and dark theme verification.
- Responsive mode verification.
- Keyboard, focus, target-size, semantic, and contrast verification.
- Unresolved exceptions and known contract debt.

Do not claim UX4G compliance without this verification.

---

## 1. Token architecture

Three tiers. Consumers touch tier 2 and tier 3 only.

```
Tier 1 — PRIMITIVE      Base collection. Raw values.
                        Colors/Primary/600 = #4A2BC2 · Spacing/space-4 (8) = 8
                            │
Tier 2 — SEMANTIC       Light + Dark collections. Meaning, theme-aware.
                        Background/Brand/Primary/Strong → Colors/Primary/600
                            │
Tier 3 — ROLE           Control/* and Action/*. Component-facing, aliases tier 2.
                        Control/Track/On → {Background.Brand.Primary.Strong}
```

Of the 256 tokens in each theme collection, **90 are tier-3 aliases** pointing at
tier-2 semantics. Light and Dark expose an identical key set — verified, no
missing keys in either direction. Any new token must be added to both.

### Collections as exported

| Collection | Modes | Contains |
|---|---|---|
| Base | Base | Font family/weights/size, line height, 15 colour ramps, spacing, radius, border width, shadow parts |
| Base (typography) | Base | Display, Heading, Title, Body, Label composites |
| Theme | **Light**, **Dark** | 256 semantic + role tokens each |
| Spacing (semantic) | Mode 1 | Inline, Stack, Section, Padding |
| Radius (semantic) | Mode 1 | None, Small, Medium, Large, Full |
| Border width (semantic) | Mode 1 | Default, Strong |
| Elevation | Mode 1 | Level 0–4 (key + ambient shadow) |
| Screen Mode | Mobile, Tablet, Desktop, Desktop XL | Breakpoint ranges + grid |

---

## 2. Naming parity

| Concept | Figma variable | CSS class / custom property | Dart |
|---|---|---|---|
| Component | `Button` | `.ux4g-btn-primary`, `.ux4g-btn-md` | `Ux4gButton` |
| Theme root | Light/Dark mode | `data-theme="light" \| "dark"` on `<html>` | `Ux4gTheme` |
| Enum | variant property | modifier class | `Ux4gCardFooterType` |
| Colour token | `Background/Brand/Primary/Strong` | `--ux4g-bg-*` | _{{confirm}}_ |
| Spacing token | `Padding/M` | `--ux4g-space-*`, `--ux4g-padding-*` | _{{confirm}}_ |
| Utility class | — | `ux4g-p-l`, `ux4g-gap-m`, `ux4g-radius-md` | — |

**Confirmed:** every class and custom property is `ux4g-` / `--ux4g-` prefixed,
lowercase, hyphenated. The stylesheet defines **886 custom properties**, of which
869 follow the convention. Dart uses `Ux4g` PascalCase on every public symbol.
Figma uses slash-nested Title Case groups.

**Two convention breaks found in the shipped CSS:**

- `--ux4x-icon-border-desabled` — wrong prefix (`ux4x`) and a misspelling
  (`desabled`). Defined once, referenced once, so it works today, but it sits
  outside the documented `--ux4g-` namespace and cannot be overridden by anyone
  following the docs.
- 16 properties named `--Spinner-{variant}-Color-{1,2}` — capitalised, unprefixed,
  and using a different word order from every other token.

Both are cosmetic today and breaking to fix later. Fix them now, while the web
package is at 2.0.1 and has a small installed base.

### Class composition — always include the base class

```html
<button class="ux4g-btn ux4g-btn-primary ux4g-btn-md">Save</button>
```

Base class first, then variant, then size. This is what the developer
documentation at `/web/*` specifies, and it is the correct rule.

The base class looks redundant, because it is — for styling. `.ux4g-btn` is
simply the first selector in a group shared with every variant:

```css
.ux4g-btn, .ux4g-btn-danger, .ux4g-btn-outline-primary,
.ux4g-btn-primary, .ux4g-btn-text-primary, … { … }
```

so `.ux4g-btn-primary` already carries the base styling alone. **But three
descendant rules target the bare base class and nothing else:**

```css
.ux4g-time-slot-weekly-actions  .ux4g-btn { min-width: 140px }
.ux4g-time-slot-weekly-actions  .ux4g-btn { min-width: 0; width: 100% }
.ux4g-time-slot-compact-actions .ux4g-btn { display: flex; justify-content: center }
```

A button written without the base class inside a Time Slot silently loses its
width and centering — no error, just wrong layout in one component. Omitting the
base class is safe until it isn't, which is the worst kind of rule.

The package README is inconsistent here: its Icon Button examples include the
base class, its Button examples don't. Align the README with `/web/*`, or make
those three Time Slot rules target the variant classes as well. Do one; the
current state teaches developers a habit that breaks in exactly one place.

> Dart token naming is still unconfirmed — resolve from the foundations file and
> add a CI check asserting the Figma → CSS → Dart transform holds.

---

## 3. Primitives (tier 1)

**Spacing** — 15 steps, non-linear. **The number in the name is an index, not the
value.** `space-4` is 8px.

| Token | px | | Token | px | | Token | px |
|---|---|---|---|---|---|---|---|
| `space-none` | 0 | | `space-5` | 12 | | `space-10` | 40 |
| `space-1` | 2 | | `space-6` | 16 | | `space-11` | 48 |
| `space-2` | 4 | | `space-7` | 20 | | `space-12` | 56 |
| `space-3` | 6 | | `space-8` | 24 | | `space-13` | 64 |
| `space-4` | 8 | | `space-9` | 32 | | `space-14` | 80 |

**Radius** — `none 0` · `1: 2` · `2: 4` · `3: 8` · `4: 12` · `5: 16` · `6: 24` ·
`circular: 999`

**Border width** — `None 0` · `Thin 1` · `Thick 2` · `Thicker 3` · `Thickest 4`

**Font** — Noto Sans, single family. Weights: Regular, Medium, SemiBold, Bold,
plus Display SemiBold and Display Bold (optical display cuts, used only by the
`Display/*` scale).

**Sizes** 11 · 12 · 14 · 16 · 18 · 20 · 24 · 28 · 32 · 36 · 40 · 52 · 60
**Line heights** 14 · 16 · 18 · 20 · 24 · 28 · 32 · 36 · 44 · 52 · 72 · 80

**Colour ramps** — 15 families. Primary, Secondary, Tertiary and Neutral carry
alpha variants (`600A`) alongside solid steps; Neutral additionally carries
`0-White`, `0A`, `0B`, and Transparent.

| Family | Steps |
|---|---|
| Primary, Secondary, Tertiary | 50–950 solid + 50A–950A alpha (22 each) |
| Neutral | 50–950 + White/0A/0B + alpha set (29) |
| Red, Blue, Sky Blue, Cyan, Green, Lime, Yellow, Gold, Orange, Purple, Pink | 50–950 (11 each) |

---

## 4. Typography scale (tier 2)

Every style is Noto Sans. 44 named text styles live in Figma; bind by style, never
by raw size. Each entry carries a Default and a Strong weight.

| Scale | Size / Line height | Default → Strong |
|---|---|---|
| `Display/L` | 60 / 80 | Display SemiBold → Display Bold |
| `Display/M` | 52 / 72 | Display SemiBold → Display Bold |
| `Display/S` | 40 / 52 | Display SemiBold → Display Bold |
| `Display/XS` | 36 / 44 | Display SemiBold → Display Bold |
| `Heading/XXL` | 40 / 44 | SemiBold → Bold |
| `Heading/XL` | 32 / 36 | SemiBold → Bold |
| `Heading/L` | 28 / 32 | SemiBold → Bold |
| `Heading/M` | 24 / 28 | SemiBold → Bold |
| `Heading/S` | 20 / 24 | SemiBold → Bold |
| `Heading/XS` | 16 / 20 | SemiBold → Bold |
| `Heading/XXS` | 14 / 16 | SemiBold → Bold |
| `Title/L` | 24 / 28 | SemiBold → Bold |
| `Title/M` | 20 / 24 | SemiBold → Bold |
| `Title/S` | 16 / 20 | SemiBold → Bold |
| `Body/L` | 18 / 24 | Regular → SemiBold |
| `Body/M` | 16 / 24 | Regular → SemiBold |
| `Body/S` | 14 / 20 | Regular → SemiBold |
| `Body/XS` | 12 / 16 | Regular → SemiBold |
| `Label/XL` | 16 / 20 | Regular → SemiBold |
| `Label/L` | 14 / 18 | Regular → SemiBold |
| `Label/M` | 12 / 16 | Regular → SemiBold |
| `Label/S` | 11 / 14 | Regular → SemiBold |

`Heading` and `Title` overlap at 24/20/16. Rule: **Heading** for document
structure that maps to `h1`–`h6`; **Title** for the heading of a bounded surface
(card, modal, panel) that is not part of the page outline.

---

## 5. Semantic spacing — read this before using it

Four axes. **The same t-shirt size means a different value on each axis.** This
is intentional and it is the most common source of implementation error.

| Size | `Inline/` | `Stack/` | `Section/` | `Padding/` |
|---|---|---|---|---|
| None | 0 | 0 | 0 | 0 |
| XXS | 2 | 4 | — | 4 |
| XS | 4 | 8 | 24 | 8 |
| S | 8 | 12 | 32 | 12 |
| M | 12 | 16 | 48 | 16 |
| L | 16 | 24 | — | 20 |
| XL | — | — | 64 | 24 |
| XXL | — | — | 80 | 32 |

- `Inline/*` — horizontal gap between siblings on one line.
- `Stack/*` — vertical gap between stacked blocks.
- `Section/*` — vertical rhythm between page sections.
- `Padding/*` — internal padding of a container.

Pick the axis by **role, not by value.** `Inline/L` and `Padding/M` are both
16px today; they are not interchangeable, and coupling to the number rather than
the role is what breaks the next time the scale is retuned.

**Semantic radius** — `None 0` · `Small 4` · `Medium 8` · `Large 12` · `Full 999`
**Semantic border width** — `Default 1` (Thin) · `Strong 2` (Thick)

---

## 6. Elevation

Five levels, each composed of **two** shadows — a key shadow and an ambient
shadow. Both must be applied; a single-shadow approximation is not the token.

| Level | Key (x y blur spread @ alpha) | Ambient |
|---|---|---|
| 0 | 0 0 0 0 @ 0 | 0 0 0 0 @ 0 |
| 1 | 0 1 2 0 @ 4% | 0 1 2 0 @ 4% |
| 2 | 0 4 8 0 @ 8% | 0 1 2 0 @ 4% |
| 3 | 0 8 16 0 @ 16% | 0 4 8 0 @ 8% |
| 4 | 0 16 32 0 @ 24% | 0 8 16 0 @ 16% |

Shadow colour is theme-bound: black in Light, white in Dark. Never hard-code
`rgba(0,0,0,…)` — in Dark mode that renders as an invisible shadow.

---

## 7. Semantic colour

Groups: `Text` · `Icon` · `Background` · `Border` · `Control` · `Action` ·
`Focus` · `Overlay` · `Shadow` · `Spinner`. Each splits into `Neutral`, `Brand`
(Primary/Secondary/Tertiary) and `Status` (Success/Error/Warning/Information)
where applicable.

### Core tokens

| Token | Light | Dark |
|---|---|---|
| `Text/Neutral/Primary` | `#171717` | `#FAFAFA` |
| `Text/Neutral/Secondary` | `#404040` | `#E5E5E5` |
| `Text/Neutral/Tertiary` | `#737373` | `#D9D9D9` |
| `Text/Neutral/Disabled` | `#171717` @ 25% | `#FAFAFA` @ 25% |
| `Text/Neutral/Inverse` | `#FAFAFA` | `#171717` |
| `Text/Brand/Primary/Default` | `#4A2BC2` | `#A391FF` |
| `Background/Neutral/Default` | `#FAFAFA` | `#171717` |
| `Background/Neutral/Elevated` | `#FFFFFF` | `#0A0A0A` |
| `Background/Neutral/Soft` | `#F5F5F5` | `#262626` |
| `Background/Neutral/Subtle` | `#E5E5E5` | `#262626` |
| `Background/Neutral/Emphasis` | `#D9D9D9` | `#404040` |
| `Background/Brand/Primary/Strong` | `#4A2BC2` | `#A391FF` |
| `Border/Neutral/Subtle` | `#E5E5E5` | `#404040` |
| `Border/Neutral/Default` | `#D9D9D9` | `#525252` |
| `Border/Neutral/Strong` | `#737373` | `#A1A1A1` |
| `Focus/Outline` | `#4A2BC2` | `#A391FF` |
| `Overlay/Default` | `#171717` @ 40% | `#FAFAFA` @ 40% |
| `Overlay/Strong` | `#171717` @ 70% | `#FAFAFA` @ 60% |

Status text: Success `#00522C`/`#80DA88` · Error `#8A1A16`/`#FFB3AE` ·
Warning `#AD4E00`/`#FFC973` · Information `#006D75`/`#91E8E0`.

`Background/Neutral/Soft` and `Subtle` resolve to the **same value** (`#262626`)
in Dark. Distinguishing surfaces by these two tokens will look correct in Light
and flat in Dark — use `Elevated` for a true dark-mode layer separation.

### Action state matrix

`Action/{Brand|Neutral|Destructive}/{variant}/{state}/{Background|Border|Text}`

- Brand variants: Primary, Secondary, Tertiary, Tonal
- Neutral variants: Secondary, Tertiary
- Destructive variants: Primary, Secondary, Tertiary
- States: **Default, Hover, Active, Disabled**

**There is no Focus state in the Action matrix by design.** Focus is a global
concern rendered with `Focus/Outline` on top of whatever the current state is.
Do not invent per-variant focus colours.

Filled variants use a transparent border (`#000000` @ 0%) so that filled and
outlined variants share one box model and swap only the border colour.

---

## 8. Breakpoints and grid

| Mode | Range (px) | Columns | Gutter | Page margin | Max content |
|---|---|---|---|---|---|
| Mobile | 0 – 1023 | 4 | 12 | 16 | 768 |
| Tablet | 1024 – 1439 | 8 | 16 | 24 | 960 |
| Desktop | 1440 – 1767 | 12 | 24 | 32 | 1200 |
| Desktop XL | 1768 – 9999 | 12 | 24 | 32 | 1320 |

> The mode names do not match device reality: a portrait iPad (768px) resolves to
> **Mobile** and gets a 4-column grid, while **Tablet** (1024–1439) is in practice
> landscape tablets and small laptops. This is a defensible layout decision but a
> misleading label. Either rename the modes to `sm/md/lg/xl` or document the
> intent prominently — do not leave developers to infer it.

---

## 9. Accessibility

Baseline: **WCAG 2.1 AA.** 4.5:1 for body text, 3:1 for large text and non-text
UI boundaries, 44×44px minimum target, visible focus on every interactive
element using `Focus/Outline`.

### Measured contrast (computed from the exported tokens)

| Pair | Light | Dark |
|---|---|---|
| `Text/Neutral/Primary` on `Background/Neutral/Default` | 17.18 ✅ | 17.18 ✅ |
| `Text/Neutral/Secondary` on `Background/Neutral/Default` | 9.93 ✅ | 14.23 ✅ |
| `Text/Neutral/Tertiary` on `Background/Neutral/Default` | 4.54 ✅ | 12.70 ✅ |
| `Text/Neutral/Tertiary` on `Background/Neutral/Soft` | **4.35 ❌** | 10.72 ✅ |
| `Text/Brand/Primary/Default` on `Background/Neutral/Default` | 8.33 ✅ | 6.87 ✅ |
| `Text/Status/Warning` on `Background/Neutral/Default` | 5.20 ✅ | 11.83 ✅ |
| `Text/Neutral/Inverse` on `Background/Brand/Primary/Strong` | 8.33 ✅ | 6.87 ✅ |
| `Focus/Outline` on `Background/Neutral/Default` | 8.33 ✅ | 6.87 ✅ |

### Known failures — non-text contrast (3:1 required)

| Token | Light | Dark |
|---|---|---|
| `Control/Border/Default` (→ `Border/Neutral/Subtle`) | **1.21 ❌** | **1.73 ❌** |
| `Control/Border/Hover` (→ `Border/Neutral/Default`) | **1.35 ❌** | **2.29 ❌** |
| `Control/Track/Off` | **1.35 ❌** | **1.73 ❌** |
| `Border/Neutral/Default` | **1.35 ❌** | **2.29 ❌** |

`Control/Border/*` is the resting border of inputs, checkboxes and radios.
Under WCAG 1.4.11 the boundary of an input **is** a required non-text contrast
target when it is the only thing indicating the control's extent. At 1.21:1 it is
effectively invisible to low-vision users. `Border/Neutral/Strong` (4.54:1) and
`Control/Border/Error` (4.38:1) both pass — the fix is to repoint
`Control/Border/Default` at a darker step, not to add a new colour.

For a system carrying a government accessibility mandate this should be treated
as a release blocker, not backlog. `Border/Neutral/Default` failing is acceptable
where it is purely decorative (dividers between rows in an already-bounded
table); it is not acceptable as a control boundary.

`Text/Neutral/Disabled` at 25% alpha is exempt under 1.4.3 (inactive controls),
but disabled state must not be the *only* signal — pair with `aria-disabled` and
supporting text.

---

## 10. Consumption

**CDN**

```html
<html lang="en" data-theme="light">
<link rel="stylesheet" href="https://cdn.ux4g.gov.in/UX4G@3.1.0/index.css" />
<script src="https://cdn.ux4g.gov.in/UX4G@3.1.0/ux4g.js"></script>
<script src="https://cdn.ux4g.gov.in/UX4G@3.1.0/ux4g-custom.js"></script>

<button class="ux4g-btn-primary ux4g-btn-md" type="button">Get Started</button>
```

Pin the exact version. `data-theme` on `<html>` is the theme switch and is
required — components have no fallback theme.

**npm — one package serves HTML, Angular and React**

```bash
npm i ux4g-web-components
```

> Use **exactly** `ux4g-web-components`. Other similarly-named npm packages
> exist; installing the wrong one is the most common setup failure.

| Target | Setup |
|---|---|
| Plain HTML | link `styles/ux4g.css`, script `dist/runtime/design-system.js` |
| React | in `src/main.jsx`: `import 'ux4g-web-components/styles.css'` then `import 'ux4g-web-components/design-system'` |
| Angular (A, recommended) | add `node_modules/ux4g-web-components/styles/ux4g.css` to `styles[]` and `node_modules/ux4g-web-components/dist/runtime/design-system.js` to `scripts[]` in `angular.json` — no TS import needed |
| Angular (B) | `@import 'ux4g-web-components/styles.css';` in `src/styles.css` + `import 'ux4g-web-components/design-system';` in `src/main.ts` |

React applies classes directly to JSX (`className`); Angular applies them
directly to templates (`class`). No wrappers, no directives, no hooks.

Exports: `./styles.css` · `./design-system` (auto-init side-effect import) ·
`./runtime` (`initRuntime()` / `destroyRuntime()`) · `./types`
(`Class_Builder` types). Zero runtime dependencies.

The runtime uses **event delegation** — no per-element binding — and provides
behaviours for Dropdown, Modal, Tooltip, Popover, Accordion, Tab, Carousel,
Drawer, Mega Menu and Alert. Components not on that list are CSS-only.

> ⚠️ **`styles/ux4g.css` is 8.0 MB** because fonts are base64-embedded. For a
> government service where users are frequently on constrained mobile
> connections, that is a serious accessibility-of-access problem in its own
> right. Ship fonts as separate `woff2` files with `font-display: swap`, and
> offer a components-only build without the utility layer. This is likely the
> single highest-impact fix available on the web side.

**Flutter**

```bash
flutter pub add ux4g_flutter_components
```

> Use **exactly** `ux4g_flutter_components`. `ux4g_flutter_design_system` is
> deprecated and still appears in search results without a warning.

```dart
import 'package:ux4g_flutter_components/ux4g_flutter_components.dart';

void main() => runApp(
  const Ux4gTheme(child: MaterialApp(home: DemoScreen())),
);
```

`Ux4gTheme` must wrap the app — components read foundations from it and will not
render correctly outside it. Note the package pulls in `camera`,
`google_mlkit_face_detection`, `permission_handler` and `file_picker` for the
Biometric Capture and File Upload components; apps that use neither still inherit
those permission declarations. Splitting biometrics into a companion package
should be on the roadmap.

**Figma**

Duplicate from Community. Never detach an instance. Icons come only from the
Material Design Icons file (`VqX1Ca9WKCDX3U20i5okBU`).

---

## 11. Versioning

**Current state is broken** — see §0. Proposed policy:

- **Align all artifacts on one version line at the next major.** Publish npm and
  pub.dev at matching versions from that point, even where a platform has no
  changes in a given release.
- Until alignment, every release **must** update the §0 table and record the
  corresponding Figma release, or consumers have no way to reason about parity.
- Semver against the public API of each package. Token *removal* or renamed
  props/classes are breaking. Token *value* changes are minor — **unless** they
  alter contrast compliance, which is breaking.
- Figma Community files carry no version history: put the version on the cover
  frame and bump it on every republish.

---

## 12. Component parity

### There is no separate React or Angular implementation — and that is correct

UX4G's web layer is **one CSS artifact consumed three ways.** The same
`ux4g-*` classes are used verbatim in HTML, Angular templates and JSX; the only
difference is `class` vs `className`. There are no React components, no Angular
modules, no framework wrappers.

```
ux4g-web-components  ──▶  styles/ux4g.css  ──▶  HTML  ·  Angular  ·  React
                     └──▶  runtime (event-delegated behaviours)
```

**Splitting CDN / React / Angular into three columns was a modelling error on my
part.** They cannot drift from each other — there is nothing to drift. One
column, below.

The trade-off worth stating in the doc: consumers get zero framework lock-in and
one artifact to version, but no type safety on class names, no props API, and no
compiler error when a class is misspelled. The `Class_Builder` types shipped at
`ux4g-web-components/types` exist to partially close that gap and should be
documented and promoted — most consumers will not discover them.

### Class composition — three models, no stated rule

Whether a component needs a base class alongside its variant class is
**inconsistent**, and nothing in the docs says which applies where:

| Model | Components (verified) | Correct usage |
|---|---|---|
| Base **required** | `input`, `card`, `alert`, `icon-btn` | `ux4g-input ux4g-input-md` |
| Base **optional** — shared selector list | `btn`, `spinner` | either form works |
| Variant **only** — no base rule exists | `chip`, `badge` | `ux4g-chip-primary` |

This is why the Storybook and the package README disagree on Button: the
Storybook shows `ux4g-btn ux4g-btn-primary ux4g-btn-md`, the README shows
`ux4g-btn-primary ux4g-btn-md`. Both render correctly, because `.ux4g-btn` sits
in a shared selector list with every variant:

```css
.ux4g-btn, .ux4g-btn-primary, .ux4g-btn-danger, .ux4g-btn-outline-primary,
.ux4g-btn-text-primary, .ux4g-btn-tonal-primary, … { display:inline-flex; … }
```

But `ux4g-icon-btn-primary` **without** `ux4g-icon-btn` does not render
correctly, because `.ux4g-icon-btn` is a standalone rule. A developer who
generalises from the Button example to Icon Button gets a broken control and no
error.

**Pick one model and normalise to it.** Base-plus-variant is the more
predictable choice and the one already used by the majority of components; add
the missing base rules for `chip` and `badge`, keep `btn`'s shared selector for
backwards compatibility, and state the rule in the docs. Until that lands,
always write base + variant — it is correct under all three models.

### Parity — verified

Status: ✅ available · ❌ absent (grep-verified) · ❓ unverified

| Component | Figma | Web (CSS) | Flutter |
|---|---|---|---|
| Button, Icon Button | ✅ | ✅ | ✅ |
| Link | ✅ | ✅ | ❓ |
| Input, Textarea | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ |
| Checkbox, Radio, Switch | ✅ | ✅ | ✅ |
| Dropdown, Combobox | ✅ | ✅ | ✅ |
| Slider | ✅ | ✅ | ✅ |
| Form Field | ✅ | ✅ | ❓ |
| OTP | ✅ | ✅ | ❓ |
| Date Picker | ✅ | ✅ | ❓ |
| Input Aadhaar | ❓ | ✅ | ❓ |
| Input PAN Card | ❓ | ✅ | ❓ |
| File Upload | ✅ | ✅ | ❓ |
| Card | ✅ | ✅ | ✅ |
| Badge, Tag, Chip, Chips Group | ✅ | ✅ | ✅ |
| Avatar, Image, Divider | ✅ | ✅ | ✅ |
| Table, List, Result List | ✅ | ✅ | ❓ |
| Empty State | ✅ | ✅ | ❓ |
| Carousel | ✅ | ✅ | ❓ |
| Accordion, Tab | ❓ | ✅ | ❓ |
| Modal, Drawer | ✅ | ✅ | ✅ |
| Tooltip, Popover | ✅ | ✅ | ✅ |
| Alert | ✅ | ✅ | ❓ |
| Spinner, Progress Indicator | ✅ | ✅ | ✅ |
| Stepper, Pagination | ✅ | ✅ | ✅ |
| Status Pipeline | ✅ | ✅ | ❓ |
| Journey Timeline | ✅ | ✅ | ❓ |
| SLA Progress Indicator | ✅ | ✅ | ❓ |
| Draft Status | ✅ | ✅ | ❓ |
| Navbar, Footer, Breadcrumb, Mega Menu | ✅ | ✅ | ❓ |
| Accessibility Bar | ❓ | ✅ | ❓ |
| Feedback | ✅ | ✅ | ❓ |
| Social Link | ✅ | ✅ | ❓ |
| Time Slot | ✅ | ✅ | ❓ |
| Bottom Sheet | ✅ | ❌ | ✅ |
| Toast | ❓ | ❌ | ✅ |
| Mobile App Header | ✅ | ❌ | ❓ |
| Receipt Card | ✅ | ❌ | ❓ |
| Escalation Tree | ✅ | ❌ | ❓ |
| Checklist | ✅ | ❌ | ❓ |
| Biometric Capture | ✅ | ❌ | ❓ |
| Add to DigiLocker | ✅ | ❌ | ❓ |

**Web column: 54 components, verified** against the README and class definitions
in `ux4g-web-components@2.0.1`. ❌ entries were confirmed absent by grepping the
compiled stylesheet, not inferred from the README.

**Flutter column remains a README summary**, not an API dump. Resolve it by
running `dart doc` or reading the exported barrel file — it is the last
unverified column and worth an hour.

**Figma ❓ entries** mean "not in the catalogue I have", not "absent". Several
(Accordion, Tab, Toast, Accessibility Bar, Input Aadhaar/PAN) almost certainly
exist in the file and simply aren't in the advanced-component catalogue.

### ⚠️ Legacy documentation is still served, and labels itself 3.0

Current documentation lives **only** at `doc.ux4g.gov.in/web/*` and
`/flutter/*`. When verifying components, start from the paths exposed by each
surface's `ai.txt` (`/web/ai.txt`, `/flutter/ai.txt`) — typically `llms.txt`
and `llms-full.txt`. Do not use legacy or mirror domains as evidence that a
component exists or behaves a certain way.

The root of the same domain still serves the old Bootstrap-derived catalogue
at `/category/components.php` and `/components/*.php`
— Offcanvas, Scrollspy, Collapse, Close Button, Button Group, Toasts,
Placeholders, `data-bs-` attributes — none of which exist in
`ux4g-web-components@2.0.1`.

The problem is not that legacy docs exist. It is that **those pages present
themselves as current**: their version switcher shows "v3.0 (Latest)" selected,
they carry the MeitY masthead, and they are what a search engine surfaces for
"UX4G accordion". A developer who lands there writes markup the shipped package
does not style, and has no signal they are in the wrong place.

Components documented at the legacy path with **no equivalent** in the shipped
package: Button Group, Close Button, Collapse, List Groups, Navs and Tabs,
Offcanvas, Placeholders, Scrollspy, Toasts, Form Control, Floating Labels, Input
Group, Range, Select, Validation, UX4G Chart.

Fix by redirecting `/category/*` and `/components/*.php` to `/web/*`, or by
banner-marking every legacy page and correcting its version switcher. Until then
this file treats the npm package as authoritative, because it is the artifact
that ships.

Two further mirrors compound this: `docux4g.dl6.in` (canonical tag points back to
`doc.ux4g.gov.in`) and `ux4g-design.netlify.app` (linked from the deprecated
Flutter package). Neither should be reachable by a developer following a
published link.

A component is announced as available only once it is ✅ everywhere it is planned.
Partial availability ships 🟡 with the gap named.

---

## 13. Anti-patterns

**Tokens**

- No raw hex, rgb, or px in application code. Missing token → propose one.
- Never reference tier-1 primitives (`Colors/Primary/600`, `space-4`) directly.
  Use tier 2 or tier 3.
- Never pick a spacing axis by its value. `Inline/L` ≠ `Padding/L`.
- Never assume `space-N` equals N pixels.
- Never hard-code shadow colour — it inverts between themes.
- Never apply only the key shadow; elevation is always the pair.

**Figma**

- No detached instances, no copy-paste-and-edit of internals.
- Font is Noto Sans via UX4G text styles only — never set `fontName`,
  `fontSize`, `lineHeight` or `fontWeight` manually.
- Icons from the Material Design Icons file only; never as text glyphs.
- No bespoke atoms where a UX4G component exists. Custom banners → Status Banner
  or System Alert; custom progress bars → Linear Progress; custom step timelines
  → Stepper or Status Pipeline; custom empty illustrations → Empty State.
- Effect styles from the library only.

**Code**

- Do not hand-edit generated token files.
- Do not override component internals via descendant selectors or `!important`.
- Do not add dependencies to the web core package — it is dependency-free today
  and that is a feature.
- Do not ship `@latest` on the CDN in production.

---

## 14. Known debt

Ordered by cost of leaving it alone.

1. **Legacy v1/v2 docs still served and self-labelled "v3.0 (Latest)"** (§12) — `/category/*` and `/components/*.php` document ~16 components that don't exist in the shipped package. Redirect them to `/web/*`.
2. **Deprecated Flutter package not flagged on pub.dev** (§0) — `isDiscontinued: false`, released 0.5.0 three weeks ago, downloads split near-evenly with the replacement. Set the flag and `replacedBy`.
3. **`ux4g_flutter_components` has no repository or issue tracker** (§0) — the deprecated package has one, the current one doesn't. Consumers have nowhere to file bugs.
4. **Class composition is inconsistent across components** (§12) — base class required for `input`/`card`/`alert`/`icon-btn`, optional for `btn`/`spinner`, nonexistent for `chip`/`badge`, with no stated rule. A developer generalising from the Button example to Icon Button gets a silently broken control. Note one real edge case: three Time Slot rules key off the literal `.ux4g-btn`, so a button inside `.ux4g-time-slot-weekly-actions` that omits the base class loses its `min-width`.
5. **Developer docs promise framework APIs that don't exist** — React "components and hooks", Angular "modules and directives"; the package ships CSS classes, and all three framework links resolve to the same Storybook. Fix the copy or build the wrappers.
6. **`Control/Border/Default` fails non-text contrast** at 1.21:1 light / 1.73:1 dark (§9). Accessibility-mandated system; treat as a blocker.
7. **8 MB CSS bundle** with base64-embedded fonts (§10) — punitive on constrained connections, which is much of the actual user base.
8. **Three stray documentation domains reachable from published links** — `docux4g.dl6.in`, `ux4g-design.netlify.app`, and the legacy root path. Redirect or retire.
9. **Version drift across artifacts** (§0, §11) — CDN 3.1.0, npm 2.0.1, pub 1.3.0, Figma 3.0, no published mapping.
10. **`Text/Neutral/Tertiary` on `Soft` fails at 4.35:1** in light (§9) — marginal everywhere at 4.54:1 on the default background.
11. **Two CSS naming-convention breaks** (§2) — `--ux4x-icon-border-desabled` and 16 capitalised `--Spinner-*` properties. Cheap now, breaking later.
12. **Primitive names embed their values** — `Spacing/space-4 (8)`, `Radius/radius-3 (8)`. Parentheses and spaces are hostile to codegen, and retuning a value forces a rename that reads as breaking when it isn't.
13. **`Background/Neutral/Soft` and `Subtle` collide in Dark** (both `#262626`) — surface hierarchy flattens (§7).
14. **Breakpoint names don't match devices** — portrait tablets land in Mobile (§8).
15. **Flutter package carries camera/ML-Kit/permissions transitively** for two components (§10).
16. **Flutter component list still unverified** (§12) — the only remaining ❓ column.
17. **Dart token naming unconfirmed** against Figma and CSS (§2).

---

## 15. Contribution

1. Proposal issue with the use case and two real usages.
2. Design in Figma against existing tokens; new tokens need explicit approval and
   must be added to **both** Light and Dark.
3. Implement core CSS first, then React and Angular, then Flutter.
4. Update §12 parity, §0 versions, and the changelog in the same PR.
5. Contrast-check any new or repointed colour token before merge.

Deprecation: mark ⚠️ in §12 with the replacement and removal version, warn for at
least one minor cycle, remove only in a major.

Changes to this file go through PR review like code.
