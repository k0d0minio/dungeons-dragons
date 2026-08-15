# DND-023 · Sheet: show a failed save where the thumb is, and stop conditions burying spell slots

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P1 |
| Size | M |
| Sources | ux lens · `src/components/characters/sheet/character-sheet.tsx:45-66,68-80` · `use-combat-state.ts:105-112` · `conditions-card.tsx:54-70` · `src/components/ui/sonner.tsx` |

## Problem

Two defects in an otherwise well-built sheet. Both are about distance, not about taps — the
in-session tap counts are already correct and must not be changed.

**A failed save is invisible.** `useCombatState` correctly rolls the sheet back when a PATCH
fails (`use-combat-state.ts:105-112`) and renders an error banner as the sheet's first child
(`character-sheet.tsx:45-66`). But spell slots and conditions sit roughly 1000px down the
page. Tap a slot, lose the connection, and the pip silently pops back with the explanation
off-screen. The card's own comment says "A save that failed has to be visible without hunting
for it" — the intent is right and the implementation does not meet it. The number on screen
then silently disagrees with the number in the database, which is the one failure a sheet
being used as the session's source of truth cannot have.

`sonner` is already a dependency and `src/components/ui/sonner.tsx` already exists — it is
simply never mounted. (Note it calls `useTheme`, so it needs the provider DND-019 adds.)

**Conditions bury the thing used every turn.** Card order is HP → death saves → conditions →
spell slots (`character-sheet.tsx:68-80`). All 15 SRD conditions render as always-expanded
`h-11` chips (`conditions-card.tsx:54-70`); at 320px the card content is ~240px wide, fitting
about two chips per row, so the grid alone is ~8 rows ≈ 400px and the card ~500px. Spell slots
therefore start ~1100px down — ~1300px if the character is at 0 HP and the death-save card is
inserted. Taking damage and spending a slot happen in the same turn and are two full screens
of one-handed scrolling apart, separated by a control used twice a session.

## Acceptance

- [ ] A failed save is visible without scrolling, wherever on the sheet the tap happened
- [ ] The rolled-back value and the message appear together — a player never sees a pip
      revert with no explanation
- [ ] Taking damage and spending a spell slot are reachable without crossing the full
      condition grid
- [ ] Active conditions remain visible at a glance; it is the 15-chip picker that should not
      be permanently expanded
- [ ] The one-tap-per-action behaviour of HP, slots, conditions and death saves is unchanged
- [ ] CI green

## Prompt

Fix two distance problems on the D&D 5e Companion's character sheet. Read this carefully
first: **the sheet's tap counts are already correct and are not the problem.** Damage,
healing, spending or regaining a slot, toggling a condition and marking a death save are each
exactly one tap at 44px, persisted optimistically, with no modal. `use-combat-state.ts`
coalesces rapid taps and sends absolute values so out-of-order responses cannot corrupt an HP
total. Do not redesign any of that.

**1 — Make a failed save visible where the tap happened.** `useCombatState` rolls back on a
failed PATCH (`src/components/characters/sheet/use-combat-state.ts:105-112`) and renders an
error banner as the sheet's first child (`character-sheet.tsx:45-66`), but slots and
conditions are ~1000px below it. A player taps a slot, the request fails, the pip reverts, and
the explanation is off-screen — so the sheet silently stops matching the database. `sonner` is
already installed and `src/components/ui/sonner.tsx` already exists but is never mounted;
mounting `<Toaster />` is the obvious fix. Note it calls `useTheme`, so it depends on the
`ThemeProvider` that DND-019 adds — check whether that has landed. Keep the existing
error-message mapping at `use-combat-state.ts:20-24`, which is good copy.

**2 — Stop the condition grid burying spell slots.** Card order at `character-sheet.tsx:68-80`
is HP → death saves → conditions → spell slots, and `conditions-card.tsx:54-70` renders all 15
SRD conditions as always-expanded `h-11` chips — about 500px of card at 320px. So HP and spell
slots, used in the same turn, are two screens apart, separated by a control used twice a
session. Collapse the chip picker behind an active-condition summary that expands on tap,
and/or move spell slots above conditions. Active conditions must stay visible without a tap;
it is the full 15-chip picker that should not be permanently open.

Read `.icm/intake/DND-023-sheet-save-visibility-and-order.md` and `.icm/project.md` for
context. Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
