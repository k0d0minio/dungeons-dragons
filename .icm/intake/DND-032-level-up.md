# DND-032 · Level up a character

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | M |
| Sources | data lens · product lens · market lens · `src/lib/characters/rules.ts:423` · `src/lib/db/schema.ts:22-27,58` · register D15 |

## Problem

Levelling up is the thing a character does between sessions, and it is currently impossible —
`level` is write-once along with every other build field. DND-018 makes it an editable number;
this ticket makes it mean something.

Changing a level recomputes several things at once: proficiency bonus (already derived
correctly from level), hit points, spell slots, and the number of spells known or prepared.
`standardSpellSlots()` at `src/lib/characters/rules.ts:423` already holds the class slot tables
and is currently used only by the sheet's manual "Adjust" editor — the derivation exists and is
simply never applied on a level change.

Two constraints from the register that shape this:

- **D15 — multiclassing is out.** Build against the single `class_index` column. Do not
  introduce a class-levels table.
- **Nothing derived is stored**, except spell slot maxima — and `schema.ts:22-27` explains why:
  warlock pact magic breaks derivation. Respect that boundary rather than starting to persist
  computed values.

The market lens places level-up off the play surface everywhere it looked — D&D Beyond's
"Manage Levels" is a builder, not part of the sheet; Demiplane splits the Character Builder from
the Character Sheet entirely. So this is a between-sessions tool. It does not need the sheet's
one-handed polish, which is a real saving.

Note that `docs/rules/06-spellcasting.md:54` cites `/classes/{class}/levels` as a proxied
resource, and no such route exists — level-up is the first feature that will actually want it.

## Acceptance

- [ ] A character's level can be raised, with hit points, spell slots and spells known updated
      to match the class tables
- [ ] Hit point increase follows a stated rule (average or rolled) and says which it used
- [ ] Warlock pact magic produces the correct slots, not the standard table's
- [ ] Existing manually-adjusted spell slot maxima are not silently overwritten without warning
- [ ] Levelling down, or correcting a mistaken level-up, is possible
- [ ] CI green

## Prompt

Make levelling up work in the D&D 5e Companion.

**Depends on DND-018**, which makes build fields editable at all. This ticket is the rules layer
on top: when `level` changes, recompute what 5e says changes with it.

What moves: proficiency bonus (already derived from level — check it is, and leave it derived),
hit points, spell slots, and spells known or prepared. `standardSpellSlots()` at
`src/lib/characters/rules.ts:423` already encodes the class slot tables but is currently only
used by the sheet's manual "Adjust" control, so the derivation exists and simply is not applied
on a level change. Warlock pact magic does not follow that table — `src/lib/db/schema.ts:22-27`
explains why slot maxima are stored rather than derived, and that reasoning is exactly the
warlock case. Get it right.

Hit points need a decision: 5e lets you take the average or roll. Pick a default, make it
visible, and let it be overridden — do not silently pick one.

**Multiclassing is out** (register decision D15). Build against the single `class_index`
column; do not add a class-levels table.

**This is a between-sessions tool, not a play surface.** Every comparable product puts level-up
in a builder rather than on the sheet — D&D Beyond's is under "Manage Levels", Demiplane splits
builder from sheet entirely. It does not need the one-handed, dim-light polish the sheet is held
to, and saying so saves real work.

Two practical notes. If a player has manually adjusted their spell slot maxima on the sheet, a
level-up must not silently overwrite that — warn or merge. And levelling *down* must work,
because the first thing anyone does with a level-up button is press it by mistake.

`docs/rules/06-spellcasting.md:54` cites `/api/dnd5e/classes/{class}/levels` as if it were
proxied; it is not. If you need it, add the route — and note DND-020 is the ticket that
established the caching pattern for those handlers, so follow it.

Read `.icm/intake/DND-032-level-up.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
