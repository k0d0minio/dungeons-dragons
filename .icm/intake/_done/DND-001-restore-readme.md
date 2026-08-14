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
- [x] `README.md` describes this app (identity, stack: **Next.js 16** — DND-002 carried the upgrade, `@neondatabase/auth` requires it — / Neon + Drizzle / Neon Auth per the 2026-08-13 decisions, noting which parts are landed vs. planned, how to run it)
- [x] No Supabase CLI boilerplate remains
- [x] Points to `.icm/intake/` for the backlog

## Resolution notes (2026-08-14)

The README now says plainly what runs today (public reference browser, Neon Auth
sign-in, protected `/characters` placeholder), what does not (no database, no creation,
no sheet — DND-007/008/009), and that there is no offline mode or dice roller and won't
be. Run instructions cover the two `NEON_AUTH_*` vars and note that the app works
without them, auth degrading quietly.

**`LICENSE` was clobbered by `4eb7413` too**, and nobody had noticed: it still read
`Copyright (c) 2021 Supabase, Inc. and contributors`, putting Supabase's name on Jamie's
personal project. The MIT text itself is fine and stays; only the copyright holder line
changed, to `Copyright (c) 2026 Jamie Nisbet`. Flagged to Jamie rather than done
silently, since a copyright line is his to assert — revert it if the year or the
attribution should read differently.

Also recorded in the README, because it surprises people: there is no CI workflow in
this repo, so a green PR means the Vercel build compiled and nothing more. DND-010 fixes
that.

## Prompt

Replace the repo's `README.md` — it is currently the Supabase CLI's README, accidentally
committed in `4eb7413`. Write a short honest README for what this repo actually is: the
D&D 5e Companion (Next.js 15, reference data proxied from dnd5eapi.co via
`/api/dnd5e/*`; direction per `.icm/docs/scope-decisions-2026-08-13.md`: fully online,
Neon Postgres + Drizzle, Neon Auth — say what's landed vs. planned at time of writing).
Source the description from the code in `src/app/` and the decisions doc.
Read `.icm/intake/DND-001-restore-readme.md` for full context. Ticket-only/docs-only
commits may go straight to `main`; do not run local checks — CI is the source of truth.
