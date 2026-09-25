# Stub: Heroic Inspiration says what it is

- feature-slug: heroic-inspiration-line
- sequence: 17 of 17
- depends-on: none
- priority: P2
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §5 (the starter box keeps it,
  as tokens: handing one over "feels more momentous (and is easier to remember)");
  Q&A: keep it, ungated, one line clearer

The card (`heroic-inspiration-card.tsx`) says "Expend it to reroll any die immediately
after rolling it. You keep the new roll." above a button reading "You have it" when the
flag is off and "Spend it" when it is on — the idle label reads as a statement of fact.
One line above it in the app's own words, for someone who has never heard the term
("Your DM hands this out for a good idea or a great moment. Hold one at a time; spend it
to reroll any die."), and the idle button reads "Mark it received". The DM's grant on
the profile page (`dm-character-profile`) is the usual way it arrives. Not gated — Jamie.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/heroic-inspiration-line.md` and the epic's `breakdown.md`.
Build it on a `claude/` branch and open a PR; CI is the only evidence. When it ships,
`git mv` the stub into `.icm/intake/first-table/_done/` in the same PR.
