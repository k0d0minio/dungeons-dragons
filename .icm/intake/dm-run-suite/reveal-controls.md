# Stub: Reveal controls — content appears when the DM says so

- feature-slug: reveal-controls
- sequence: 2 of 6
- depends-on: player-campaign-view
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

The reveal gate Jamie asked for: every NPC, location, and handout carries a
reveal switch in the DM's campaign screens. Revealing sets `revealed_at`; within
one poll the entity appears in the players' campaign view and the newest reveal
features prominently on the public table screen (5s poll — the "the DM slides a
letter across the table" moment). Un-reveal must exist for misclicks. The table
screen shows public layers only and must stay legible alongside initiative with
6 players.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/reveal-controls.md` and the epic's `breakdown.md`.
The player campaign view exists. Add reveal/un-reveal to the DM's NPC,
location, and handout screens (one tap, clearly stated consequence), and
surface reveals: newest-first in the player campaign view, and a featured
"just revealed" card on the table screen (`src/components/encounters/
table-screen.tsx`) that coexists with initiative at 6-player density. Public
layers only on every player-facing surface — extend the leak tests. PR on a
`claude/` branch; CI green only.
