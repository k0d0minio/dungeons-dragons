# Stub: The player's campaign view

- feature-slug: player-campaign-view
- sequence: 1 of 8
- depends-on: none
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Players have no campaign surface today. Add a modest one at
`/campaigns/[id]` for members: the party (names, classes, portraits), the
**discovered** lists — NPCs met, places found, handouts received (revealed
entities only, public layers only, never DM fields) — and the latest recap once
`session-log-recap` exists. Reachable from the character sheet ("your
campaign"), not a new tab and not the home screen (Jamie chose
character-first). Read-only for players.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/player-campaign-view.md` and the epic's
`breakdown.md`. Confirm the `dm-prep-suite` epic's `npc-roster` and
`locations-handouts` stubs are done (its `_done/`); flag and stop if not. Build
the member-only campaign page described in the stub: party section from
existing membership data, discovered sections querying only entities with
`revealed_at` set and selecting only public-layer columns (never DM-only
fields — enforce at the query level, and test that DM fields cannot leak).
Link from the character sheet for characters attached to a campaign. PR on a
`claude/` branch; CI green only.
