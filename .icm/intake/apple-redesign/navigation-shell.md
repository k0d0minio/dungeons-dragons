# Stub: iOS-pattern navigation shell

- feature-slug: navigation-shell
- sequence: 2 of 4
- depends-on: design-tokens
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Bring the shell onto Apple HIG patterns: large-title headers on top-level screens
that collapse on scroll, grouped-list styling for settings-like screens, detail
views presented as bottom sheets, and the tab bar renamed to the new mental model
— **Character · Library · DM** (was Reference / Characters / DM). The bar keeps
its fixed 3-tab shape signed-in and signed-out (existing doctrine), the
reference-overlay-from-deep-screens behaviour stays (it protects your place on
the sheet), and 44px targets and `--bottom-nav-height` clearance are preserved.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/apple-redesign/navigation-shell.md` and the epic's `breakdown.md`.
The subtle-fantasy tokens from the `design-tokens` stub are in place. Rework the
app shell — `src/app/layout.tsx`, `src/components/navigation/bottom-nav.tsx`, and
shared page-header patterns — to Apple HIG norms: large-title headers, grouped
lists, bottom-sheet detail presentation (the existing Radix primitives restyled,
not a new library), tab bar renamed Character · Library · DM with matching icons.
Keep the fixed 3-tab shape in all auth states, the reference overlay behaviour,
44px touch targets, and the `--bottom-nav-height` token. PR on a `claude/`
branch; CI green only.
