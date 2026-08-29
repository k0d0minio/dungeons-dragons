# Stub: Milestone leveling; XP bookkeeping retires

- feature-slug: milestone-leveling
- sequence: 6 of 6
- depends-on: none
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md (resolves the register's open XP-vs-milestone question)

Jamie decided: **milestone**. One DM control on the campaign — "the party
reaches level N" — which flags every member's character as having a level-up
waiting; each player walks the existing level-up planner at their own pace
(subclass choice at 3 arrives with the 2024 rules engine). The encounter XP
award step and the sheet's XP bar are retired from the default experience —
hidden, not deleted (the campaign-feature-gates pattern; a future table might
want XP back).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/milestone-leveling.md` and the epic's `breakdown.md`.
Add a milestone control to the DM campaign screen setting the party's level;
members' characters below it show a prominent "level up waiting" prompt
opening the existing planner (`/characters/[id]/level`). Hide the encounter
XP-award step and the sheet's XP display behind an off-by-default gate
(reusing the campaign-feature-gates mechanism if landed; otherwise a simple
campaign flag it can absorb later). Keep `experience.ts` intact underneath.
PR on a `claude/` branch; CI green only.
