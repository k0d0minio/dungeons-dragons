# CLAUDE.md — Layer 0: Repository Identity & Routing

> First file any Claude session reads. What this repo is, where to go. Detail lives in
> the routed files, not here.

## What this repo is

The **D&D 5e Companion** — a personal project of Jamie Nisbet. A mobile-first web app for
D&D 5th Edition players: reference lookup plus a character sheet, used on a phone at a
physical table.

**Stack:** Next.js 16 (App Router, Turbopack) · Neon Postgres + Drizzle · Neon Auth
(Managed Better Auth, `@neondatabase/auth`) · shadcn/Radix + Tailwind v4 · Jest.
Deployed on Vercel. Reference data is proxied from the public `dnd5eapi.co` API via
`/api/dnd5e/*`.

**What exists in `src/`:** a tabbed reference browser (`src/app/page.tsx`) with detail
views, auth on real routes, a `characters` table with an owner-scoped data layer, and a
character creation form at `/characters/new`. Database migrations run on deploy via
GitHub Actions. There is no CI job running `jest`, `eslint` or `tsc` — a green PR check
means the Vercel build compiled, nothing more.

> **Intent is not yet established.** `.icm/project.md` does not exist — `/project` has
> never run here. What this app is _for_, its business logic, its feature set and its
> constraints are undecided and must not be assumed. Run `/project dungeons-dragons` from
> the Apps root to establish them.

## Routing — "if the task is… → go to…"

| The task                                                               | Go to                                                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| What this project is for — intent, business logic, features, decisions | `.icm/project.md` — **not yet written**                                             |
| Plan or track any work (tickets ARE the plan)                          | [`.icm/intake/`](.icm/intake/) — `DND-NNN-slug.md`, contract in its README          |
| Ad hoc reports, audits, runbooks                                       | [`.icm/docs/`](.icm/docs/)                                                          |
| Pages & UI                                                             | [`src/app/`](src/app/) + [`src/components/`](src/components/)                       |
| D&D reference data proxy                                               | [`src/app/api/dnd5e/`](src/app/api/dnd5e/) + [`src/lib/dnd-api/`](src/lib/dnd-api/) |
| Auth & protected routes                                                | [`src/lib/auth/`](src/lib/auth/) + [`src/proxy.ts`](src/proxy.ts)                   |
| Database schema, migrations & data access                              | [`src/lib/db/`](src/lib/db/) + [`drizzle/`](drizzle/)                               |
| Deploy & migration workflows                                           | [`.github/workflows/`](.github/workflows/)                                          |
| D&D 5e rules knowledge (SRD 5.1 reference for building game logic)     | [`docs/rules/`](docs/rules/) — start at its README                                  |

## Standing rules

- **Tickets are the plan.** Any plan, backlog, or TODO becomes a `DND-NNN` ticket in
  `.icm/intake/` — never a loose `TODO.md`. Finished _and abandoned_ tickets are
  `git mv`'d to `_done/`; numbers are never reused.
- **CI is the source of truth.** Never run `build`/`lint`/`typecheck`/`test` locally;
  push and read the checks.
- **Ticket-only commits go straight to `main`; code goes through a PR** on a `claude/`
  branch.
- **Decisions are Jamie's.** Produce evidence, not verdicts; never tick a human checkbox.
- **No secrets in git.** Env vars only — `DATABASE_URL` and the Neon Auth pair come from
  `.env.local` locally and Vercel project settings on deploy; `.gitignore` covers `.env*`.
  Flag any plaintext credential found.
- The Cursor/Linear era is over — its tooling was deleted 2026-08-14. Work is tracked as
  markdown tickets in `.icm/intake/`, not in an issue tracker.
