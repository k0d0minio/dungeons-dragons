# Stub: Stat blocks inside the initiative tracker

- feature-slug: tracker-stat-blocks
- sequence: 3 of 8
- depends-on: none
- priority: P1
- size: S
- sources: .icm/docs/2026-08-29-first-campaign-research.md §4

Mid-fight, the DM should never leave the tracker: tapping any monster row opens
its full SRD 5.2.1 stat block (AC, speeds, abilities, attacks with to-hit and
damage, traits, saves) in a bottom sheet over the encounter. DM-gated by
nature of the screen; players never see monster stats (register D24 spirit —
they don't even see monster HP).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/tracker-stat-blocks.md` and the epic's
`breakdown.md`. Confirm `srd-2024-migration/srd-data-layer` is done — stat
blocks come from the 2024 monster data; flag and stop if not. In the DM
encounter tracker (`src/app/dm/encounters/[id]/`), make each monster row open
a bottom-sheet stat block rendered from the monster data, readable one-handed
on a phone (clear hierarchy: AC/HP-formula/speed, then attacks, then traits).
No change to the public table screen. PR on a `claude/` branch; CI green only.
