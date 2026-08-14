# DND-015 · Skill proficiencies — the one number the sheet cannot compute

| | |
|---|---|
| Type | feature |
| Priority | P2 |
| Size | S |

## Problem
DND-009 shipped the combat-core sheet with every derived value computed rather than
stored — ability modifiers, proficiency bonus by level, and saving throws, which 5e fixes
by class and so *are* derivable from a row holding `classIndex` and `level`.

Skills are the exception, and it is a rules fact rather than an oversight: a character
**chooses** two skills from their class list (four for a rogue), and nothing records
which. The DND-008 creation form does not ask, and `characters` has no column for it. So
`SkillsCard` (`src/components/characters/sheet/stats-cards.tsx`) shows each skill at its
ability modifier, badges the ones the class could have taken, and tells the player to add
their proficiency bonus themselves. That is honest, but it is the one place on the sheet
where a player still does mental arithmetic mid-session — exactly what the sheet exists
to remove.

Also missing for the same reason: expertise (rogue/bard double proficiency) and the
Jack of All Trades half bonus. Worth deciding whether those are in or out at the same
time, rather than a third pass over the same card.

## Acceptance
- [ ] A character's chosen skill proficiencies are stored and owner-scoped
- [ ] The sheet's skill list shows the real bonus, proficiency included, and drops the "add it yourself" note
- [ ] Choices are settable without re-creating the character (on the sheet, or in the creation form, or both — whichever is fewer taps)
- [ ] Migration applies cleanly to a database that already has DND-009's characters in it
- [ ] CI green

## Prompt

Make skill proficiencies real in the D&D 5e Companion. Today the character sheet
(`src/components/characters/sheet/stats-cards.tsx`) shows every skill at its bare ability
modifier because which skills a character is proficient in is not stored anywhere —
`CLASS_SKILL_OPTIONS` in `src/lib/characters/rules.ts` knows only what a class *may*
choose. Add storage for the player's actual picks (a `skill_proficiencies` text[] on
`characters` alongside the existing arrays, plus a Drizzle migration), a way to set them
that is not "delete and re-create the character", and fold the proficiency bonus into
`skillChecks`. Decide explicitly whether expertise and Jack of All Trades are in scope or
a later ticket. Read `.icm/intake/DND-015-skill-proficiency-selection.md` and
`.icm/docs/scope-decisions-2026-08-13.md` for full context. Open a PR on a `claude/`
branch; do not run local checks — CI is the source of truth.
