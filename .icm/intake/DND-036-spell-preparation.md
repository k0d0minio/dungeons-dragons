# DND-036 · Spell preparation — and fix the 105-checkbox creation form

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | M |
| Sources | product lens · data lens · market lens · `src/components/characters/spell-picker.tsx:63` · `src/lib/db/schema.ts:86` · `src/lib/characters/schema.ts:77-79` |

## Problem

**Read this first: there is an open question in the register that may kill this ticket.** Does
anyone at Jamie's table actually play a prepared caster — cleric, druid, wizard, paladin? The
market lens rated spell preparation binary: table stakes if someone plays one, dead weight if
nobody does. If the answer is nobody, move this to `_done/` with a `> Dropped:` line rather than
building it.

If someone does, there are two connected problems.

**The creation form is unusable for a prepared caster.** The spell picker loads the entire class
spell list and renders one checkbox per spell (`spell-picker.tsx:63`), and the form's only
concept is "known". For a cleric or druid — whose *known* list **is** the whole class list —
that is roughly 105 checkboxes on a phone. The alternatives are ticking all of them or ticking
none and getting an empty Spells card. The picker treats all twelve classes identically, when
5e's classes split cleanly into known-casters (sorcerer, bard, ranger, warlock) and
prepared-casters (cleric, druid, wizard, paladin). `src/lib/characters/schema.ts:77-79` allows up
to 400 known spells, which is the shape of a system that has not made this distinction.

**The column already exists and nothing uses it.** `prepared_spell_indexes`
(`src/lib/db/schema.ts:86`) ships in the migration, is documented as "a subset of `known` for
prepared casters", and is written by nothing and read by nothing —
`spell-list-card.tsx` uses `knownSpellIndexes` only. It is a schema-only column waiting for this
ticket.

The market lens notes preparation sits one level down in comparable tools (Spells tab → prepare
toggle) and changes only at a long rest, so it does not need the sheet's front page.

## Acceptance

- [ ] Prepared casters do not tick every spell in their class list at creation
- [ ] `prepared_spell_indexes` is written and read, or deleted from the schema
- [ ] The sheet distinguishes prepared from known for classes where the distinction exists
- [ ] Preparation can be changed without re-creating the character
- [ ] Known-casters (sorcerer, bard, ranger, warlock) are not made more complicated by this
- [ ] CI green

## Prompt

**Before building anything, check with Jamie whether anyone at his table plays a prepared caster
— cleric, druid, wizard or paladin.** It is an open question in `.icm/project.md`. If nobody
does, this ticket is dead weight: `git mv` it to `.icm/intake/_done/` with a
`> Dropped: <reason, date>` line prepended, update the register's Features table, and stop. That
is a valid and useful outcome.

If someone does play one, add spell preparation to the D&D 5e Companion.

Two connected problems. First, the creation form is unusable for these classes: the spell picker
at `src/components/characters/spell-picker.tsx:63` loads the whole class spell list and renders
one checkbox each, and the form's only concept is "known". A cleric's known list *is* the class
list — about 105 checkboxes on a phone. 5e splits cleanly into known-casters (sorcerer, bard,
ranger, warlock — pick a limited list, it rarely changes) and prepared-casters (cleric, druid,
wizard, paladin — access the whole list, choose a subset each long rest). The picker treats all
twelve identically. `src/lib/characters/schema.ts:77-79` permitting 400 known spells is a symptom
of the same gap.

Second, `prepared_spell_indexes` already exists at `src/lib/db/schema.ts:86`, documented as "a
subset of `known` for prepared casters", written by nothing and read by nothing. This ticket
either makes it real or deletes it — do not leave it a third time.

Wizards are the awkward case worth deciding explicitly: their spellbook is a genuine third
category, neither the full class list nor the prepared subset. Handle it or scope it out and say
which.

Preparation belongs one level down, not on the sheet's front page — it changes at a long rest,
not mid-turn. If DND-033 (rests) has landed, the long rest is the natural place to prompt for it.

Read `.icm/intake/DND-036-spell-preparation.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
