# DND-034 · Put attacks on the sheet — what do I roll to hit?

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | M |
| Sources | market lens · product lens · `src/components/characters/sheet/character-sheet.tsx:68-92` · `src/lib/db/schema.ts:50-94` · `src/lib/dnd-api/swr-hooks.ts:607` |

## Problem

The sheet tracks everything that happens *to* a character and nothing they *do*.

The complete card list at `character-sheet.tsx:68-92` is hit points, death saves, conditions,
spell slots, vitals, abilities, saving throws, spell list and skills. There is no attack, no
damage die, and no class feature. A level-5 fighter's sheet shows HP, AC, saves and skills —
and every action they take in a fight still comes off paper.

The market lens found this is the single most-consulted play surface in every comparable tool:
D&D Beyond's Actions section is "your list of available Actions, Bonus Actions, Reactions...
including equipped weapons and any spell attacks". It is the thing a player looks at on their
turn, every turn.

It is also what makes inventory worth building. An equipped weapon is only interesting because
it produces an attack bonus and a damage die — which is why DND-035 builds the equipped-weapon
slice first and this ticket is its natural pair.

There is evidence the app was heading here already: `useFeatures()` at
`src/lib/dnd-api/swr-hooks.ts:607` was written to fetch class features and points at
`/api/dnd5e/features`, a route that does not exist.

## Acceptance

- [ ] The sheet shows what a character can do on their turn — at minimum weapon attacks with
      attack bonus and damage
- [ ] Attack bonus and damage are computed from ability modifiers, proficiency and the weapon,
      not typed in by hand
- [ ] Spell attacks and save DCs are shown for casters
- [ ] It is glanceable mid-turn without scrolling past the whole sheet
- [ ] Nothing derived is stored beyond what the schema already justifies
- [ ] CI green

## Prompt

Add an actions surface to the D&D 5e Companion's character sheet: what this character can do on
their turn, and what they roll.

Today `src/components/characters/sheet/character-sheet.tsx:68-92` renders HP, death saves,
conditions, spell slots, vitals, abilities, saving throws, spells and skills — everything that
happens *to* a character and nothing they *do*. There is no attack anywhere, so a fighter's
whole turn is still on paper. Every comparable tool makes this its most prominent play surface.

Minimum useful version: weapon attacks with a computed attack bonus and damage expression, plus
spell attack bonus and spell save DC for casters. Compute from ability modifiers, proficiency
bonus and the weapon rather than storing them — the project's standing rule is that derived
values are derived, and `src/lib/characters/rules.ts` already holds the derivation helpers.

**Pairs with DND-035** (equipped weapons and currency). An equipped weapon is what makes an
attack row real. If DND-035 has landed, read equipped weapons from it; if not, decide whether to
ship with a simpler weapon-entry path and say so, rather than blocking.

**Note the proficiency dependency.** Attack bonus includes proficiency when the character is
proficient with the weapon — and weapon proficiency, like skill proficiency (DND-015), is not
stored. Do not quietly assume proficiency with everything; either handle it from the class's
weapon proficiencies in the reference data or state the assumption on screen.

`useFeatures()` at `src/lib/dnd-api/swr-hooks.ts:607` was written for class features and points
at `/api/dnd5e/features`, which does not exist. DND-039 is scheduled to delete that hook as dead
code — if you need class features, build the route instead and coordinate, following the caching
pattern DND-020 established.

**Placement matters.** This is looked at every turn, so it belongs near the top of the sheet with
HP, not below the skills list. DND-023 is already reordering those cards — check whether it has
landed.

Read `.icm/intake/DND-034-attacks-on-the-sheet.md` and `.icm/project.md` for context. Open a PR
on a `claude/` branch; do not run local checks — CI is the source of truth.

## Amendment — 2026-08-15

Shipped in the `claude/dnd-sheet-features` PR. Two calls to record:

- **Proficiency is assumed** for equipped weapons. Weapon proficiency by class
  is not stored (the same gap skills had before DND-015), so every attack row
  includes the proficiency bonus and the card footnotes the assumption on
  screen — "Assumes proficiency with equipped weapons" — rather than quietly
  guessing per class.
- **No `/api/dnd5e/features` route was needed.** The actions surface is weapon
  attacks (from DND-035's equipped items), the caster row (spell attack bonus
  and save DC), and the unarmed strike — none of which read class features.
  `useFeatures()` stays DND-039's dead code to delete.
