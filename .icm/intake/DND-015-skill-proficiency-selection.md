# DND-015 · Skill proficiencies — the one number the sheet cannot compute

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | S |
| Sources | copy lens · `src/components/characters/sheet/stats-cards.tsx:190-192,206-210` · `src/lib/characters/rules.ts` (`CLASS_SKILL_OPTIONS`) |

> **Amended 2026-08-15 by `/project`.** Two changes, no re-scoping. The Prompt cited
> `.icm/docs/scope-decisions-2026-08-13.md`, which commit `1b151fa` deleted — that reference is
> replaced with `.icm/project.md`, which now carries those decisions. And the copy half of this
> problem is folded in below rather than left to a separate pass. Prerequisite noted: **DND-018**
> (edit a character) supplies the editing surface this ticket's third acceptance box needs.

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

**The copy is a second defect, folded in here rather than left to a separate pass.** The note at
`stats-cards.tsx:206-210` reads *"Add your proficiency bonus of +2 to the two (or more) skills you
chose at character creation — which ones you picked is not stored yet (DND-015)."* It shows a
player an internal ticket ID, and "the two (or more)" is vague when the exact number is knowable —
`CLASS_SKILL_OPTIONS` in `src/lib/characters/rules.ts` holds the per-class count. The "Class skill"
badges above it at `:190-192` compound it: they look like proficiency markers when they only mean
"your class could have picked this". All of it disappears when the data gap closes, but if any
interim state ships it should not be written this way.

## Acceptance
- [ ] A character's chosen skill proficiencies are stored and owner-scoped
- [ ] The sheet's skill list shows the real bonus, proficiency included, and drops the "add it yourself" note
- [ ] Choices are settable without re-creating the character (on the sheet, or in the creation form, or both — whichever is fewer taps)
- [ ] No internal ticket ID is rendered to a player, and the "Class skill" badges no longer read as proficiency markers
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
a later ticket.

**DND-018 is the prerequisite** — it builds the general edit path this ticket's "settable without
re-creating the character" requirement depends on. Check whether it has landed; if it has, extend
it rather than building a second editing surface.

While you are in `stats-cards.tsx`, fix the copy at `:206-210`: it currently shows a player the
internal string "DND-015" and says "the two (or more) skills", when `CLASS_SKILL_OPTIONS` in
`src/lib/characters/rules.ts` knows the exact per-class number. The "Class skill" badges at
`:190-192` also read as proficiency markers when they only mean the class *could* pick that skill.

Note DND-030 (the DM party glance) needs passive Perception, which is `10 + WIS modifier` plus
proficiency if the character is proficient in Perception — so it is blocked on this ticket for a
correct number. If DND-030 shipped first with a caveat on screen, remove the caveat here.

Read `.icm/intake/DND-015-skill-proficiency-selection.md` and `.icm/project.md` for full context —
the 2026-08-13 scope decisions this ticket was originally written against now live in the register,
after commit `1b151fa` deleted the standalone document. Open a PR on a `claude/`
branch; do not run local checks — CI is the source of truth.
