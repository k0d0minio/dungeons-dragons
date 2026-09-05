# Stub: Two questions at the end of the night

- feature-slug: between-sessions-questions
- sequence: 16 of 17
- depends-on: dm-character-notes
- priority: P2
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §7 (Five Sided Die's two
  questions — "What was your favorite moment?", "What does your character want next?";
  "a five-bullet summary beats a five-page session log"; a highlight per player), §3
  (one question per character per session; "write down the answers… add them to your
  game notes")

The close-session step (`close-session-card.tsx`, the session-log page) gains, above the
recap draft, one row per player character: the two questions as two short optional
fields, and a one-line *highlight*. The answers land in that character's DM note under
*Threads*, dated; the highlights are offered to the recap draft as lines the DM can
keep. The DM asks at the table and types; the app remembers where the next prep reads
it.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/between-sessions-questions.md` and the epic's `breakdown.md`.
Build it on a `claude/` branch and open a PR; CI is the only evidence. When it ships,
`git mv` the stub into `.icm/intake/first-table/_done/` in the same PR.
