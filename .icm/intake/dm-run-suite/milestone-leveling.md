# Stub: Milestone leveling; XP bookkeeping retires

- feature-slug: milestone-leveling
- sequence: 6 of 8
- depends-on: none
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md (resolves the register's open XP-vs-milestone question)

Jamie decided: **milestone** (D35). One DM control on the campaign — "the party
reaches level N" — stored as a single `campaigns.milestone_level` column;
"level-up waiting" is **derived** (`character.level < campaign.milestone_level`),
never fanned out as per-character writes (neon-http has no transactions — a
6-character loop can half-apply). Each player walks the existing planner at
their own pace
(subclass choice at 3 arrives with the 2024 rules engine). The encounter XP
award step and the sheet's XP bar are retired from the default experience —
hidden, not deleted (the campaign-feature-gates pattern; a future table might
want XP back).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/milestone-leveling.md` and the epic's `breakdown.md`.
Add a milestone control to the DM campaign screen setting a single
`campaigns.milestone_level` column (additive nullable migration — one write,
no per-character fan-out); characters below it derive a prominent "level up
waiting" prompt opening the existing planner (`/characters/[id]/level`). Hide the encounter
XP-award step and the sheet's XP display behind an off-by-default gate
(reusing the campaign-feature-gates mechanism if landed; otherwise a simple
campaign flag it can absorb later). Keep `experience.ts` intact underneath.
PR on a `claude/` branch; CI green only.
