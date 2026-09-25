# Stub: The one page the table agreed on

- feature-slug: session-zero-one-pager
- sequence: 12 of 17
- depends-on: none
- priority: P2
- size: M
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §2 (MakeMythic: "one page is
  plenty", "the mistake that wastes a good session 0 is not writing anything down",
  ten minutes on party connections, lethality decided out loud, the phone rule; Sly
  Flourish's session-zero contents), §1 (the ten-minute talk: "describe your action and
  we'll see what happens")

Two halves, both small.

**The players' page.** A campaign gets one player-readable page: the pitch in a
paragraph, the tone, the party's connection ("you all owe the same person"), the
lethality setting in one line, the table's phone rule, the schedule. The DM writes it on
the campaign page; it is the first card on the player campaign view. Prefer a shared
campaign note with a kind over a new column (D41's shape — one player-facing record);
a nullable text column if the note does not fit.

**The DM's crib stop.** A new stop in `src/lib/dm/crib.ts`, "Before the first roll":
the ten-minute talk in rows (describe what you do; the d20 plus one number against a
target; hit points; move and one action — the rest arrives when it comes up), and the
session-zero checklist (names round the table, one tie between every pair, the
lethality line, phones, "sixty seconds to make your case"). Rows held to the crib's own
tests — 160 characters, never opening with the label.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/session-zero-one-pager.md` and the epic's `breakdown.md`. Build
it on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv`
the stub into `.icm/intake/first-table/_done/` in the same PR.
