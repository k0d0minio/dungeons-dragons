# DND-001 · Restore a real README

| | |
|---|---|
| Type | chore |
| Priority | P2 |
| Size | S |

## Problem
`README.md` is the Supabase CLI's README verbatim — clobbered in commit `4eb7413`
("Fix all linting errors and implement missing utility functions"). The repo no longer
describes itself: nothing states it is the **D&D 5e Companion PWA** (a "mobile-first
Progressive Web Application designed to serve as a comprehensive digital toolbox for
Dungeons & Dragons 5th Edition players and Dungeon Masters" —
`.cursor/requirements/processed/business-requirements.mdx` §1.1).

## Acceptance
- [ ] `README.md` describes this app (identity, stack: Next.js 15 / Clerk / Supabase / PWA, how to run it)
- [ ] No Supabase CLI boilerplate remains
- [ ] Points to `.icm/intake/` for the backlog

## Prompt

Replace the repo's `README.md` — it is currently the Supabase CLI's README, accidentally
committed in `4eb7413`. Write a short honest README for what this repo actually is: the
D&D 5e Companion PWA (Next.js 15, Clerk auth, Supabase, PWA shell, reference data proxied
from dnd5eapi.co via `/api/dnd5e/*`). Source the description from
`.cursor/requirements/processed/business-requirements.mdx` and the code in `src/app/`.
Read `.icm/intake/DND-001-restore-readme.md` for full context. Ticket-only/docs-only
commits may go straight to `main`; do not run local checks — CI is the source of truth.
