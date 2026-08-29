# Stub: Stale docs sweep — README, CLAUDE.md, intake micro-copy

- lane: chore
- found-by: 2026-08-29 first-campaign planning session (repo map)
- priority: P2
- size: S

Three documents contradict reality: (1) `README.md` claims "two rules chapters
live in-app" (all eleven shipped) and "no service worker and no PWA install
step" (both shipped — this was already flagged in the 2026-08-16 value audit and
never fixed). (2) `CLAUDE.md`'s ticket row and `.icm/intake/README.md` still
describe the retired flat `DND-NNN` format — the estate standard since
2026-08-28 is epics + stubs with path identity, as `.icm/CONTEXT.md` correctly
states. (3) `CLAUDE.md`'s "what exists" paragraph will drift further as the
first-campaign epics land — align it while in there.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/stale-docs-sweep.md`. Fix the three staleness clusters it
lists: correct `README.md`'s rules-chapters and PWA claims; rewrite
`CLAUDE.md`'s ticket-routing row and `.icm/intake/README.md` to describe the
epics + stubs standard exactly as `.icm/CONTEXT.md` defines it (path identity,
positional status, no numbers); refresh `CLAUDE.md`'s "what exists" summary
against `src/` reality. Docs-only change. PR on a `claude/` branch; CI green
only.
