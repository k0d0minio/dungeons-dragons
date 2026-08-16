# DND-050 · Cast flow — spend a slot from the spell, not next to it

| | |
|---|---|
| Status | done — **Both** picked (Jamie, 2026-08-16) |
| Type | improvement |
| Priority | P2 |
| Size | M |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/components/characters/sheet/spell-slots-card.tsx` · `src/components/characters/sheet/spell-list-card.tsx` · `docs/rules/06-spellcasting.md` |

## Problem

The sheet knows your spells and it knows your slots, but the two never touch. Casting
*Fireball* at 5th level today is: scroll to the spell list, open the detail sheet, read
the at-higher-levels table, close it, scroll to the slots card, tap a 5th-level pip. The
app holds every fact needed to make that one gesture — spell level, slot levels, the
damage-by-slot table, whether it's concentration or a ritual — and instead makes the
player do the join by hand mid-turn.

A second, related paper cut: the sheet's spell list has no search or filter
(`spell-list-card.tsx`). For a cleric or druid the list is the *whole class list* with
prepare checkboxes — a level-9 cleric scrolls ~80 rows to find Guiding Bolt. The
reference browser got search in DND-021; the sheet's own list never did.

## Decision — Jamie

- [ ] **Full cast flow.** A "Cast" action on each leveled spell row: pick a slot level
      (≥ spell level, only levels with slots remaining), the pip is spent, upcast
      scaling for the chosen level is shown, concentration is set if DND-049 landed, and
      a ritual-capable spell offers "cast as ritual — no slot". Cantrips get no flow —
      they're free.
- [ ] **Search only.** Just the filter box on the sheet's spell list (name substring,
      same behaviour as the reference search). Smallest real win; slots stay manual.
- [x] **Both** — search is a subtask of the cast flow anyway.
- [ ] **Kill.** Two taps on two cards is fine at a real table. `> Dropped:` and done.

> Picked: **Both** (Jamie, 2026-08-16).

## Acceptance

- [ ] (Cast flow) casting a leveled spell from its row spends the right slot in one flow,
      never lets you pick a level you have no slot for, and shows upcast scaling
- [ ] (Cast flow) nothing rolls dice — damage is displayed, not rolled (D8)
- [ ] (Search) a long spell list is filterable without leaving the sheet
- [ ] Known-casters, prepared-casters and wizards all behave; pact-magic slots still work
- [ ] CI green

## What shipped

- `castableSlotLevels(spellSlots, spellLevel)` in `src/lib/characters/combat.ts` — the
  pure join the flow turns on: at or above the spell's level, and only pools with a slot
  left. A level with none is *absent* from the picker, not disabled, so the acceptance
  bar ("never lets you pick a level you have no slot for") holds structurally.
- `src/components/characters/sheet/cast-spell-sheet.tsx` — a bottom sheet, the same
  one-handed shape as the DND-003 reference sheet. Level buttons with what is left in
  each pool, the damage for the chosen level, the at-higher-levels prose, and one
  full-width confirm. A ritual spell also offers "cast as ritual — no slot". Because it
  is a layer rather than a card, the DND-023 order is untouched and hit points stay put.
- Filter box on `spell-list-card.tsx`, over `searchByName` — literally the DND-021
  predicate, so the sheet and the reference browser filter identically. It appears at
  eight rows and up, so the level-9 cleric gets it and the sorcerer's five-spell list
  stays a plain list.
- Cast buttons are gated on the character having any slots at all, and never appear on a
  cantrip. Pact magic works because nothing here assumes the standard table — a warlock's
  lone 5th-level pool casts every spell they know, upcast.

**Deliberately not done:** the concentration flag. DND-049 has not landed, so per the
prompt this did not grow a private half-version of it. A concentration spell is badged
and captioned in the cast sheet — information only, nothing tracked. When DND-049 lands,
setting the flag is one line in the confirm handler.

## Prompt

Jamie has picked a scope in the Decision section of
`.icm/intake/DND-050-cast-flow-and-sheet-spell-search.md` — read it, and `.icm/project.md`
for context. If killed, `git mv` to `_done/` with a `> Dropped:` line and stop.

The spell list card is `src/components/characters/sheet/spell-list-card.tsx`, the slots
card `spell-slots-card.tsx`, both writing through `use-combat-state.ts`'s optimistic
pattern. Spell metadata (level, at-higher-levels, concentration, ritual) comes from the
existing `/api/dnd5e/spells` proxy and SWR hooks. Keep the one-handed bar: the cast flow
must work with a thumb, and must not push the HP card further from the top. If DND-049
(concentration) has landed, a concentration cast sets the flag; if not, don't build a
private version of it here. Open a PR on a `claude/` branch; CI is the source of truth.
