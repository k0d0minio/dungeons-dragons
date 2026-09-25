# Stub: The encounter builder knows level 1 is the danger zone

- feature-slug: level-one-rails
- sequence: 13 of 17
- depends-on: none
- priority: P2
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §2 (Sly Flourish: "No level
  is more dangerous in Dungeons & Dragons than 1st level" — fewer monsters than
  characters, CR ≤ 1/4, average damage ≤ 5, level 2 within four hours), §1 (first
  fights: goblins, no resistances, immunities or conditions)

The builder prices a fight by the 2024 XP budget and warns past High, never blocks. At
level 1 the budget is not what kills a party; three things the budget does not see are.
When every attending character is level 1 or 2, the difficulty readout
(`difficulty-readout.tsx`, `src/lib/encounters/budget.ts`) adds a line for each that
applies: more monsters than characters; any monster above CR 1/4; any monster whose
listed attack averages more than 5 damage — read through `monsterActionNumbers` in
`src/lib/srd/format.ts`, which already parses every attack line in the shipped data.
Words, never a block. One line more in the crib's "0 HP" stop: get them to level 2
inside four hours of play.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/level-one-rails.md` and the epic's `breakdown.md`. Build it on
a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the
stub into `.icm/intake/first-table/_done/` in the same PR.
