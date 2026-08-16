# DND-050 · Cast flow — spend a slot from the spell, not next to it

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
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
- [ ] **Both** — search is a subtask of the cast flow anyway.
- [ ] **Kill.** Two taps on two cards is fine at a real table. `> Dropped:` and done.

## Acceptance

- [ ] (Cast flow) casting a leveled spell from its row spends the right slot in one flow,
      never lets you pick a level you have no slot for, and shows upcast scaling
- [ ] (Cast flow) nothing rolls dice — damage is displayed, not rolled (D8)
- [ ] (Search) a long spell list is filterable without leaving the sheet
- [ ] Known-casters, prepared-casters and wizards all behave; pact-magic slots still work
- [ ] CI green

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
