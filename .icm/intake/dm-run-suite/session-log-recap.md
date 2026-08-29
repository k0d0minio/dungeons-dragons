# Stub: Session log and the "previously on…" recap

- feature-slug: session-log-recap
- sequence: 5 of 6
- depends-on: reveal-controls
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

A lightweight running log per session, mostly automatic: encounters fought
(from the tracker), entities revealed (from reveal controls), secrets/clues
checked off (from session plans), plus one free-text line the DM can add at any
moment. Ending a session closes the log; the DM edits/trims it into a short
recap that becomes "previously on…" — the first thing players see in their
campaign view before the next session. Automatic capture, human words: the DM
writes the story, the app remembers the facts.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/session-log-recap.md` and the epic's `breakdown.md`.
Add per-campaign session logs: auto-append entries from encounter completion,
reveals, and session-plan checkoffs (hook the existing flows, additive
schema), a DM quick-note input, and a close-session step where the DM edits
the generated summary into a recap. Publish the recap to the top of the player
campaign view. DM-only until published; players see recaps only. PR on a
`claude/` branch; CI green only.
