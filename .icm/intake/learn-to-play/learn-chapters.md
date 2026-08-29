# Stub: The learn-to-play section

- feature-slug: learn-chapters
- sequence: 2 of 3
- depends-on: glossary-popovers
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-research.md §3

A short friendly tier above the reference chapters — five or six pages a friend
reads on their phone at home before session 1: what the game actually is; your
turn (action, bonus action, movement, one reaction — and that bonus actions
aren't spare actions); rolling the d20 (checks vs attacks vs saves, which
modifier, when proficiency applies); spellcasting basics (cantrips are free,
slots, prepared, concentration); reading your sheet (where AC/DC/initiative come
from); how a session works at the table. Linked from the welcome screen and from
the wizard's completion screen ("your character is ready — here's how to play
them"). Terms use the glossary component throughout.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/learn-to-play/learn-chapters.md` and the epic's `breakdown.md`.
Write the learn-to-play pages listed in the stub as content following the
existing rules-chapter loading pattern (`src/lib/rules/`) under a distinct
`/learn` route group, on the 2024 rules baseline, in plain warm language with
glossary popovers on every term of art. Link them from the welcome screen and
the creation-completion screen if those exist yet (skip gracefully if not).
Original wording only. PR on a `claude/` branch; CI green only.
