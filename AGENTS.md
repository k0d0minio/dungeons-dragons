# AGENTS.md — Layer 0: Repository Identity & Routing

> First file any agent session reads. What this repo is, where to go. Detail lives in
> the routed files, not here.

## What this repo is

The **D&D 5e Companion** — a personal project of Jamie Nisbet. A mobile-first web app for
D&D 5th Edition players: reference lookup plus a character sheet, used on a phone at a
physical table.

**Stack:** Next.js 16 (App Router, Turbopack) · Neon Postgres + Drizzle · Neon Auth
(Managed Better Auth, `@neondatabase/auth`) · shadcn/Radix + Tailwind v4 · Jest.
Deployed on Vercel. All SRD 5.2.1 game data ships locally in `src/lib/srd/`; the long tail
(spells, monsters, magic items, equipment) is served from it over the app's own public,
CDN-cached `/api/srd/*` routes. The `dnd5eapi.co` proxy is retired.

**What exists in `src/`:** everything behind a session bar the front door (D34) — a
reference browser at `/library` over six types (spells, classes, species, equipment,
magic items, monsters), eleven in-app rules chapters indexed at `/rules`, and six
plain-language `/learn` pages for players who have never rolled a die; invite-gated
sign-up (`SIGNUP_INVITE_CODE`, fail-closed) with global `dm`/`player` roles; character
creation and editing with a skills + expertise picker; a full combat sheet (HP and typed
temp HP, attacks, death saves, spell slots and preparation, rests and hit dice, class
resources, conditions and exhaustion, inventory with currency and derived AC) plus
level-up; campaigns with join links, the DM party glance, prep the DM reveals a piece at
a time (locations, handouts, NPCs) with the players' discovered view at
`/campaigns/[id]`, encounters with initiative and per-instance monster HP, and a
token-gated shared table screen at `/table/[token]`; a 409 optimistic-concurrency guard
with ~15 s polling; an installable PWA whose service worker caches only `/offline`, never
app data (D28); Sentry as the error sink. CI runs lint, typecheck, format and jest with
coverage floors; migrations run on deploy via GitHub Actions.

## Routing — "if the task is… → go to…"

| The task                                                                 | Go to                                                                                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| What this project is for — intent, business logic, features, decisions   | [`.icm/project.md`](.icm/project.md) — the register; source of truth for what shipped                       |
| Plan or track any work (tickets ARE the plan)                            | [`.icm/intake/`](.icm/intake/) — epics of stubs at `<epic-slug>/<feature-slug>.md`, contract in its README  |
| Ad hoc reports, audits, runbooks                                         | [`.icm/docs/`](.icm/docs/)                                                                                  |
| Pages & UI                                                               | [`src/app/`](src/app/) + [`src/components/`](src/components/)                                               |
| SRD 5.2.1 game data — species, backgrounds, classes, conditions, weapons | [`src/lib/srd/`](src/lib/srd/); regenerate with [`scripts/srd/`](scripts/srd/)                              |
| SRD reference endpoints over the local data (public, cached)             | [`src/app/api/srd/`](src/app/api/srd/) + [`src/lib/srd/serve.ts`](src/lib/srd/serve.ts)                     |
| Auth, invite gate & protected routes                                     | [`src/lib/auth/`](src/lib/auth/) + [`src/proxy.ts`](src/proxy.ts)                                           |
| Database schema, migrations & data access                                | [`src/lib/db/`](src/lib/db/) + [`drizzle/`](drizzle/)                                                       |
| CI, deploy & migration workflows                                         | [`.github/workflows/`](.github/workflows/)                                                                  |
| D&D 5e rules knowledge (SRD 5.2.1 reference for building game logic)     | [`docs/rules/`](docs/rules/) — start at its README; the in-app player-facing chapters are `src/app/rules/*` |

## Standing rules

- **Tickets are the plan.** Any plan, backlog, or TODO becomes a stub in `.icm/intake/` —
  never a loose `TODO.md`. Related work is an epic folder (`<epic-slug>/breakdown.md` plus
  one stub per unit of work); one-off findings park in `triage/`. **Identity is the path**
  — `<epic-slug>/<feature-slug>`, no ticket numbers. **Status is positional** — finished
  _and abandoned_ stubs are `git mv`'d to `_done/`, and nothing is ever deleted.
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
