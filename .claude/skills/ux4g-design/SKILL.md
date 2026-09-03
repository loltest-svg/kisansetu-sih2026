---
name: ux4g-design
description: Apply the UX4G Design System contract when designing, implementing, reviewing, or fixing government digital interfaces. Use for UX4G components, classes, tokens, themes, responsive layouts, accessibility, Figma parity, and package or documentation decisions.
---

# UX4G design workflow

## Mandatory preflight — do not write code yet

Before creating or changing any UX4G interface:

1. Read `Design.md` completely.
2. Inspect the project, installed dependencies, existing UX4G setup,
   components, styles, tokens, routes, and conventions.
3. Ask the user which theme or brand colours to use. Request at least primary
   and secondary colours, plus tertiary or status colours when relevant.
4. In the same question, give the user an explicit option to continue with the
   default UX4G theme without providing custom colours.
5. Do not write implementation code until the user answers the theme question.
6. Before writing code, list every UX4G component that will be used, including
   its exact variant and size and where it will be used.
7. If UX4G cannot satisfy a requirement with an existing component, variant,
   utility, or token, identify the gap before writing custom markup or CSS.

## Package selection

Choose the UX4G delivery method in this order:

1. If `ux4g-web-components` is already installed, use the installed package.
2. If the project is Node-based and the package is not installed, install and
   use `ux4g-web-components`.
3. For a non-Node project, use the authoritative UX4G CDN assets listed in
   `Design.md`.
4. Do not mix npm and CDN delivery in the same application unless the existing
   project explicitly requires it.

## Theme token overrides

If the user supplies custom theme colours:

1. Map the approved colours to confirmed UX4G primary, secondary, tertiary, and
   relevant semantic tokens.
2. Override those token values once at the application root.
3. Put overrides in a dedicated root theme block and use `!important` so they
   take precedence over the distributed defaults.
4. Override tokens, not individual components.
5. Preserve accessible contrast and semantic state relationships.

```css
:root {
  --ux4g-<primary-token>: <approved-value> !important;
  --ux4g-<secondary-token>: <approved-value> !important;
}
```

Replace placeholders only with token names confirmed by `Design.md` and the
authoritative UX4G package or documentation. Never invent a token name.

If the user chooses the default theme, do not add a redundant override block.

### v2.0.1 button theming note

As of v2.0.1, button default dimensions use a `:where()` wrapper at zero
specificity. This eliminates cascade conflicts between variant and size classes
after minification. Consuming projects no longer need `!important` overrides on
button component selectors — overriding `--ux4g-color-primary-600/700/800` at
`:root` is sufficient to theme all button states (default, hover, active) via
the semantic token cascade.

## Strict implementation rules

1. Use UX4G design-system components, classes, modifiers, utilities, and
   semantic tokens wherever an equivalent exists.
2. Use the complete documented class composition, including required base,
   variant, and size classes.
3. Do not recreate a UX4G component with custom markup.
4. Do not write unnecessary custom CSS.
5. Custom CSS is allowed only for application-specific layout or behaviour that
   UX4G does not provide. Keep it minimal and document why it is required.
6. Do not hard-code colours, spacing, radius, typography, borders, focus
   treatment, or component states when a UX4G token or class exists.
7. Treat package names and documentation paths in `Design.md` as authoritative.
8. Follow the contract's responsive, theme, naming, and accessibility rules.
9. Do not use sources marked as legacy, stale, deprecated, or untrusted.
10. If the request conflicts with the contract, explain the conflict before
    implementing it.

## Completion report

After implementation, report:

- UX4G package or CDN delivery method and documentation sources used.
- UX4G components, variants, sizes, classes, utilities, and tokens used.
- Whether the default theme or approved custom root token overrides were used.
- Every custom CSS rule added and why UX4G could not provide the requirement.
- Light and dark theme checks.
- Responsive checks.
- Keyboard, focus, target-size, semantic, and contrast checks.
- Unresolved contract exceptions or known debt.

Do not claim UX4G compliance without verifying the changed interface.
