# AGENTS.md — Layer 0: Repository Identity & Routing

> First file any agent session reads. What this repo is, where to go. Detail lives in
> the routed files, not here.

## What this repo is

The **D&D 5e Companion** — a personal project of Jamie Nisbet. A mobile-first web app for
D&D 5th Edition players: reference lookup plus a character sheet, used on a phone at a
physical table.

**Stack:** Next.js 16 (App Router, Turbopack) · Neon Postgres + Drizzle · Neon Auth
(Managed Better Auth, `@neondatabase/auth`) · shadcn/Radix + Tailwind v4 · Jest.
Deployed on Vercel. SRD 5.2.1 game data ships locally in `src/lib/srd/`; the long-tail
reference browser is still proxied from the public `dnd5eapi.co` API via `/api/dnd5e/*`.

**What exists in `src/`:** a public reference browser (`src/app/page.tsx`) — six types
(spells, classes, races, equipment, magic items, monsters) plus in-app rules chapters at
`/rules/*`; invite-gated sign-up (`SIGNUP_INVITE_CODE`, fail-closed) with global
`dm`/`player` roles; character creation and editing with a skills + expertise picker; a
full combat sheet (HP and typed temp HP, attacks, death saves, spell slots and
preparation, rests and hit dice, class resources, conditions and exhaustion, inventory
with currency and derived AC) plus level-up; campaigns with join links, the DM party
glance, encounters with initiative and per-instance monster HP, and a public shared
table screen at `/table/[token]`; a 409 optimistic-concurrency guard with ~15 s polling;
Sentry as the error sink. CI runs lint, typecheck, format and jest with coverage floors;
migrations run on deploy via GitHub Actions.

## Routing — "if the task is… → go to…"

| The task                                                                 | Go to                                                                                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| What this project is for — intent, business logic, features, decisions   | [`.icm/project.md`](.icm/project.md) — the register; source of truth for what shipped                       |
| Plan or track any work (tickets ARE the plan)                            | [`.icm/intake/`](.icm/intake/) — `DND-NNN-slug.md`, contract in its README                                  |
| Ad hoc reports, audits, runbooks                                         | [`.icm/docs/`](.icm/docs/)                                                                                  |
| Pages & UI                                                               | [`src/app/`](src/app/) + [`src/components/`](src/components/)                                               |
| SRD 5.2.1 game data — species, backgrounds, classes, conditions, weapons | [`src/lib/srd/`](src/lib/srd/); regenerate with [`scripts/srd/`](scripts/srd/)                              |
| D&D reference data proxy (SRD 5.1, being retired)                        | [`src/app/api/dnd5e/`](src/app/api/dnd5e/) + [`src/lib/dnd-api/`](src/lib/dnd-api/)                         |
| Auth, invite gate & protected routes                                     | [`src/lib/auth/`](src/lib/auth/) + [`src/proxy.ts`](src/proxy.ts)                                           |
| Database schema, migrations & data access                                | [`src/lib/db/`](src/lib/db/) + [`drizzle/`](drizzle/)                                                       |
| CI, deploy & migration workflows                                         | [`.github/workflows/`](.github/workflows/)                                                                  |
| D&D 5e rules knowledge (SRD 5.2.1 reference for building game logic)     | [`docs/rules/`](docs/rules/) — start at its README; the in-app player-facing chapters are `src/app/rules/*` |

## Standing rules

- **Tickets are the plan.** Any plan, backlog, or TODO becomes a `DND-NNN` ticket in
  `.icm/intake/` — never a loose `TODO.md`. Finished _and abandoned_ tickets are
  `git mv`'d to `_done/`; numbers are never reused.
- **CI is the source of truth.** Local `jest`/`eslint`/`tsc` runs are allowed as a
  development aid (Jamie, 2026-08-15 — the old outright ban predates having a CI that
  runs them at all), but nothing counts as passing until the CI check is green, and CI
  is the only evidence ever cited.
- **Ticket-only commits go straight to `main`; code goes through a PR** on a `claude/`
  branch.
- **Decisions are Jamie's.** Produce evidence, not verdicts; never tick a human checkbox.
- **No secrets in git.** Env vars only — `DATABASE_URL` and the Neon Auth pair come from
  `.env.local` locally and Vercel project settings on deploy; `.gitignore` covers `.env*`
  (with `.env.example` opted back in — names and comments only, never values).
  Flag any plaintext credential found.
- The Cursor/Linear era is over — its tooling was deleted 2026-08-14. Work is tracked as
  markdown tickets in `.icm/intake/`, not in an issue tracker.
