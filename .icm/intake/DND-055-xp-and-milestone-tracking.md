# DND-055 · XP tracking — or confirm the table is milestone and kill this

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | feature |
| Priority | P2 |
| Size | M |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/lib/db/schema.ts` · `src/components/characters/level-up-planner.tsx` |

## Problem

The app has no concept of experience points. There is no `experience` column on
`characters`, no award step after an encounter, and nothing that tells a player they've
crossed a level threshold — the level-up planner assumes you already know you levelled.
If Jamie's table plays with XP, every fight ends with the DM doing division on a phone
calculator and five people writing a number on nothing, because the app — the thing
holding all their other state — has nowhere to put it.

**This ticket is decision-first because it might be dead on arrival.** Most home tables
(and most published adventures) level by milestone — "you level when the story says so" —
and under milestone this whole feature is zero-value: the existing level-up planner *is*
milestone support. Only build this if the table genuinely counts XP.

If they do, the pieces line up cheaply: the encounter already knows its monsters, each
monster's XP is in the reference data, and DND-054 (if built) computes the totals anyway.

## Decision — Jamie

- [ ] **The table uses XP — build it.** `experience` column (additive, nullable), an XP
      line on the sheet with the next-level threshold, an "award XP" step on the
      encounter (total ÷ party, editable before applying), and a "level available" nudge
      linking to the planner. Manual awards too, for non-combat XP.
- [ ] **Milestone — kill it.** The level-up planner already covers milestone.
      `git mv` to `_done/` with a `> Dropped: milestone table` line. This is the
      expected outcome unless Jamie says otherwise.

## Acceptance

- [ ] A character's XP and next threshold are visible on the sheet without crowding the
      combat cards (it's read-half content, not write-half)
- [ ] Ending/awarding from an encounter offers the split, editable, applied through the
      existing version-guarded character API
- [ ] Crossing a threshold nudges, never auto-levels — levelling stays the planner's job
- [ ] CI green

## Prompt

First check the Decision section of `.icm/intake/DND-055-xp-and-milestone-tracking.md` —
if Jamie ticked milestone, `git mv` this ticket to `_done/` with a `> Dropped:` line and
stop; that is the useful outcome, not a failure.

Otherwise read `.icm/project.md` for context and build XP tracking: an additive nullable
`experience` column, the SRD 5.1 level thresholds as a pure function
(`docs/rules/03-character-creation.md` has the table), an XP row in the sheet's read
half, and an award flow on the encounter tracker that sums monster XP (share the math
with DND-054 if it landed), divides by the PC count, lets the DM edit, and writes through
the version-guarded API. Open a PR on a `claude/` branch; CI is the source of truth.
