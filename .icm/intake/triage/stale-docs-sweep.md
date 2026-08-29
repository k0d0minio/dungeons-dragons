# Stub: Stale docs sweep — README, CLAUDE.md, intake micro-copy

- lane: chore
- found-by: 2026-08-29 first-campaign planning session (repo map)
- priority: P2
- size: S

Stale docs AND stale user-visible copy (widened 2026-08-29 by the `/project`
re-run's lenses): (1) `README.md` claims "two rules chapters live in-app" (all
eleven shipped) and "no service worker and no PWA install step" (both shipped).
(2) `CLAUDE.md`'s ticket row and `.icm/intake/README.md` still describe the
retired flat `DND-NNN` format — the standard is epics + stubs per
`.icm/CONTEXT.md`; `CLAUDE.md`'s "what exists" paragraph needs a refresh too.
(3) `/rules` claims "still opens with no signal at the table" and "readable
offline once the page has loaded" (`src/app/rules/page.tsx`) — false: the
service worker caches only `/offline` (D28); a beginner who trusts it at a
no-signal table gets the fallback mid-session. (4) "This classs prepare…" —
fallback string + hardcoded plural in `src/components/characters/
character-form.tsx` (~line 426), which survives as the edit form. (5)
`NEXT_PUBLIC_APP_NAME`/`NEXT_PUBLIC_APP_DESCRIPTION` read in code but absent
from `.env.example`, with a comment claiming the name is hardcoded — finish the
removal or list them. (6) Stale comment in `src/app/api/dnd5e/spells/route.ts:2`
("handles URL parameters" — it takes none). (7) `public/eneko.jpeg` — a stray
personal photo, referenced nowhere, publicly served: delete it.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/stale-docs-sweep.md` and fix its seven numbered items:
README claims, CLAUDE.md + intake README ticket format (match `.icm/CONTEXT.md`
exactly), the false offline claims on `/rules` (page copy and metadata), the
pluralization fallback, the two half-removed env vars, the stale route comment,
and delete `public/eneko.jpeg`. Docs and string-level copy only — no behaviour
changes. PR on a `claude/` branch; CI green only.
