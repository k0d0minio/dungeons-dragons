# DND-029 · Bottom tab navigation — stop the sheet being a dead end

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | M |
| Sources | ux lens · `src/app/layout.tsx:42-62` · `src/components/characters/sheet/character-sheet.tsx:86-94` · `src/app/characters/[id]/page.tsx:62-67` · register D16 |

## Problem

The entire navigation of this app is a logo and a "Characters" button in the header
(`src/app/layout.tsx:42-62`). From an open character sheet, looking up a monster or a piece of
equipment costs: header logo → home → scroll past the hero → search → type → scroll → tap →
read → back → tap the character again. Your place on the sheet is gone.

That is the app's two halves — reference and sheet — failing to be one app, in the exact
situation it was built for: mid-session, one-handed.

The sheet does one thing right and it should be preserved: known spells open **in place** via
a bottom sheet (`character-sheet.tsx:86-94`), no navigation at all. Everything else requires
leaving.

Per register decision D16, the answer is a **bottom tab bar** — thumb-reachable, built once,
serving both this round trip and the DM screen that DND-030 and DND-031 need a home for.
Building it once is the entire point: the DM work and the sheet's navigation gap land on the
same header, and there is no sense doing it twice.

## Acceptance

- [ ] A persistent, thumb-reachable bottom navigation exists across the app's signed-in surfaces
- [ ] Reference lookup is reachable from an open sheet without losing the sheet's scroll position
- [ ] There is a home for the DM surface that DND-030 and DND-031 can mount into, even if empty
- [ ] It does not appear where it makes no sense (auth pages)
- [ ] It survives the 320px floor and does not collide with the creation form's pinned submit
      button (`character-form.tsx:355-364`, which relies on `pb-24` clearance)
- [ ] The sheet's in-place spell detail behaviour is unchanged
- [ ] CI green

## Prompt

Build bottom tab navigation for the D&D 5e Companion, replacing a header that currently offers
a logo and one button.

The problem it solves: from an open character sheet, looking up a monster costs nine steps and
loses your scroll position (`src/app/layout.tsx:42-62` is the whole of navigation;
`src/app/characters/[id]/page.tsx:62-67` is a text back-link). This app exists to be used
one-handed mid-session, and its two halves currently do not connect.

Jamie has decided on a bottom tab bar (register decision D16) rather than a header switcher,
specifically so it is built once and also gives the DM surface a home — DND-030 (party glance)
and DND-031 (encounters) both need somewhere to live. Include a DM destination even if it is
empty or hidden behind a flag for now; the point is not to rebuild navigation again in three
tickets' time.

Requirements that come from the project's constraints rather than from taste:

- Thumb-reachable, and at least 44px targets. The app is used one-handed in dim light.
- Must not break at 320px.
- Must not collide with the creation form's pinned submit button, which relies on `pb-24`
  clearance at `src/components/characters/character-form.tsx:355-364`. Check the sheet's
  bottom cards too.
- Should not render on the auth pages.
- **Preserve the sheet's in-place spell detail** (`character-sheet.tsx:86-94`) — opening a
  known spell in a bottom sheet without navigating is the one thing that already works
  correctly, and the pattern is worth extending rather than replacing.

Consider whether reference lookup can open as an overlay from the sheet rather than as a
navigation, which would preserve scroll position by construction. That would serve the actual
need better than a tab that unmounts the sheet — argue it either way in the PR.

Coordinate with DND-019, which may have added a theme toggle needing header space, and with
DND-022, which is reworking the reference browser's own tab bar — two tab bars on one screen
needs a deliberate answer.

Read `.icm/intake/DND-029-bottom-tab-navigation.md` and `.icm/project.md` for context. Open a
PR on a `claude/` branch; do not run local checks — CI is the source of truth.
