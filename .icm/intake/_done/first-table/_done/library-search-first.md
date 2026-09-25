# Stub: The Library opens on a question

- feature-slug: library-search-first
- sequence: 15 of 17
- depends-on: none
- priority: P2
- size: M
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §C;
  `.icm/docs/2026-09-05-first-timer-research.md` §6 ("click on a spell and see
  immediately what it does" is where digital wins); D39 (the reference becomes the
  search-first Library); Q&A: both trims

Today `/library` opens on the Spells type — twelve cards from Acid Arrow, "Show 12
more" — with the search box above. A search for "gobl" on that tab answers "No spells
match" and offers "Found in: Monsters (5)" below it. A beginner opening the Library
mid-session has one question ("what does Prone do", "what is a Bugbear") and is met
with a browser.

## Build

The page opens on the search box and nothing else. Typing searches all six types at
once and lists results grouped by type — the lookup overlay the bar opens from other
pages (`reference-lookup-sheet.tsx`) may already do most of this; share the code rather
than write a second search. The type chips filter the results instead of choosing a
list; the rules chips stay. An empty box shows the six type chips as the way to browse,
for the player who wants the alphabet.

The stale footer line on the same page is `triage/library-footer-stale`.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/library-search-first.md` and the epic's `breakdown.md`. Build
it on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv`
the stub into `.icm/intake/first-table/_done/` in the same PR.
