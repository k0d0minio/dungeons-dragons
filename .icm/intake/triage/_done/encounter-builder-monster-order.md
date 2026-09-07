# Stub: The encounter builder's monster list opens on Aboleth and twenty dragons

- lane: tweak
- found-by: first-timer audit, 2026-09-05 (`.icm/docs/2026-09-05-first-timer-audit.md` §C)
- priority: P2
- size: S

`/dm/campaigns/[id]/encounters/new` lists monsters alphabetically before a search is
typed: Aboleth, then every adult and ancient dragon, CR 10–24, for a DM whose party is
level 1. Sort the unsearched list by CR ascending (goblins first), or lead with the
rows inside the party's current budget and fold the rest. The search box stays where it
is. `first-table/level-one-rails` adds the level-1 warnings to the readout; this is only
the order of the list.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/encounter-builder-monster-order.md`. Fix it on a `claude/` branch
and open a PR; CI is the only evidence. `git mv` the stub into
`.icm/intake/triage/_done/` in the same PR.
