# DND-038 · Temp HP typed, and exhaustion tracked by level

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P2 |
| Size | S |
| Sources | product lens · `src/components/characters/sheet/hit-points-card.tsx:159-192` · `src/lib/characters/combat.ts:101` · `src/lib/characters/rules.ts:255-259` · `conditions-card.tsx:55-70` |

## Problem

Two small correctness gaps on an otherwise good sheet. Both are cheap and both bite mid-session.

**Temporary hit points can only be nudged one at a time.** Temp HP arrives in chunks — False
Life gives `1d4+4`, Armor of Agathys `2d8`. The card exposes only +1/−1 buttons
(`hit-points-card.tsx:159-192`), so recording one casting is up to eight taps. The underlying
function already takes an absolute value: `setTemporaryHitPoints` at
`src/lib/characters/combat.ts:101` sets outright. Only the UI is missing.

**Exhaustion is a boolean, and it is not one.** `ConditionsCard` renders all 15 SRD conditions as
on/off chips (`conditions-card.tsx:55-70`), but exhaustion has six levels with cumulative
penalties, and the app's own summary says so — `src/lib/characters/rules.ts:255-259` describes
penalties that stack by level and kill at six. So the card cannot answer the question it exists
to answer, and exhaustion is the one condition where the level *is* the information.

## Acceptance

- [ ] Temp HP can be set to a value directly, not only incremented
- [ ] The ±1 controls remain for small adjustments
- [ ] Exhaustion is tracked by level (0–6), not as a boolean
- [ ] The current exhaustion level's penalties are visible without leaving the sheet
- [ ] Level 6 is distinguishable — it kills the character
- [ ] Existing characters with exhaustion toggled on migrate to a sensible level
- [ ] One tap per action is preserved for the common cases
- [ ] CI green

## Prompt

Fix two small correctness gaps on the D&D 5e Companion's character sheet.

**1 — Let temp HP be typed.** Temporary hit points arrive in chunks (`1d4+4`, `2d8`), but
`src/components/characters/sheet/hit-points-card.tsx:159-192` offers only +1/−1 buttons, so
recording one casting of False Life is up to eight taps mid-combat. The data layer is already
right — `setTemporaryHitPoints` at `src/lib/characters/combat.ts:101` takes an absolute value.
Add direct entry and keep the ± controls for small adjustments. Note 5e's rule that temp HP does
not stack — the higher value replaces the lower rather than adding — so check whether the current
implementation gets that right while you are in there.

**2 — Track exhaustion by level.** `src/components/characters/sheet/conditions-card.tsx:55-70`
renders every condition as a boolean toggle, but exhaustion has six cumulative levels and the
app's own summary at `src/lib/characters/rules.ts:255-259` describes them. A boolean cannot
answer what the card exists to answer. Make exhaustion a 0–6 level with its current penalties
visible, and make level 6 clearly distinguishable, because it kills the character. Existing rows
with exhaustion toggled on need a sensible migration — level 1 is the obvious choice.

**Preserve the sheet's ergonomics.** Every in-session action on this sheet is currently one tap at
44px with an optimistic write and no modal, and that is deliberate and correct. Direct entry and a
level selector must not turn the common case into a modal stack. Note DND-023 is reworking the
conditions card's layout — check whether it has landed and rebase rather than fighting it.

Read `.icm/intake/DND-038-temp-hp-and-exhaustion.md` and `.icm/project.md` for context. Open a PR
on a `claude/` branch; do not run local checks — CI is the source of truth.
