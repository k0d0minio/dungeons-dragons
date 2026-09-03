# Stub: Table screen — strip the chrome, keep the turn visible

- feature-slug: table-screen-legibility
- sequence: 7 of 8
- depends-on: none
- priority: P1
- size: S
- sources: ux lens 2026-08-29 (app-shell.tsx:13-15, table-screen.tsx:104-196)

The shared `/table/[token]` screen renders inside the full app shell — site header
with Sign in / Sign up buttons, the 3-tab bottom nav, the footer — stealing vertical
space six players' rows need and putting tappable app controls on a shared device
mid-fight. And the initiative list is static: with 6 PCs plus monsters it overflows,
the active turn can sit off-screen on a device nobody is driving, and condition
badges are `text-sm` — unreadable across a table. Open question in the register:
TV across the room vs propped tablet decides scroll-to-active vs fit-to-screen
density — implement scroll-to-active as the default, densify if Jamie says TV.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/table-screen-legibility.md` and the epic's `breakdown.md`.
Exempt `/table` from the app chrome (see `hidesNavigation` in
`src/components/navigation/app-shell.tsx` and the header in `src/app/layout.tsx`) so
the screen renders full-bleed. In `src/components/encounters/table-screen.tsx`:
scroll the active combatant into view when `activeTurn` advances, and raise
condition-badge and name legibility for across-the-table reading with ~10 rows.
Check the register's open question on TV vs tablet before choosing density. PR on a
`claude/` branch; CI green only.
