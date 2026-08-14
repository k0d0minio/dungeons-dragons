# CLAUDE.md — Layer 0: Repository Identity & Routing

> First file any Claude session reads. What this repo is, where to go. Detail lives in
> the routed files, not here.

## What this repo is

The **D&D 5e Companion** — a personal project of Jamie Nisbet ("Personal use only…
Friends and family user base only" — the BRD's own words). A mobile-first web app that
is a D&D 5th Edition toolbox for players: fast reference lookup plus a playable
character sheet. Players first, DM tools later; fully online — the PWA/offline ambition
was retired 2026-08-13 (see `.icm/docs/scope-decisions-2026-08-13.md`).

**Stack** (decided 2026-08-13): Next.js 16 (App Router, Turbopack) · Neon Postgres +
Drizzle (DND-007) · Neon Auth — Managed Better Auth, `@neondatabase/auth` (Clerk removed,
DND-002) · shadcn/Radix + Tailwind. Reference data is proxied from the public
`dnd5eapi.co` API via `/api/dnd5e/*`. Supabase, Clerk and the offline/IndexedDB layer are
gone (DND-002/006) — deleted, not integrated.

**Honest current state** (2026-08): a single-page tabbed reference browser
(`src/app/page.tsx`) with detail views, real auth on real routes, and a `characters`
table with an owner-scoped data layer that nothing writes to yet. The v1 bar: lookup
detail views (DND-003, done) **and** the combat-core character sheet (DND-009), both
mobile-first — which needs the creation form (DND-008) first. Migrations don't apply on
deploy yet (DND-013), and no CI job runs `jest` or `eslint` (DND-010/011/012): a green
PR check means the Vercel build compiled, nothing more. The backlog in `.icm/intake/` is
the plan; the decisions doc is the scope authority.

## Routing — "if the task is… → go to…"

| The task | Go to |
|---|---|
| Plan or track any work (tickets ARE the plan) | [`.icm/intake/`](.icm/intake/) — `DND-NNN-slug.md`, spec in its README |
| Product requirements, user stories, MVP scope | [`.cursor/requirements/processed/`](.cursor/requirements/processed/) |
| Ad hoc reports, audits, decisions | [`.icm/docs/`](.icm/docs/) |
| Pages & UI | [`src/app/`](src/app/) + [`src/components/`](src/components/) |
| D&D data proxy | [`src/app/api/dnd5e/`](src/app/api/dnd5e/) |
| Auth & protected routes | [`src/lib/auth/`](src/lib/auth/) + [`src/proxy.ts`](src/proxy.ts); setup runbook in [`.icm/docs/neon-auth-setup.md`](.icm/docs/neon-auth-setup.md) |
| Database schema, migrations & data access | [`src/lib/db/`](src/lib/db/) + [`drizzle/`](drizzle/); setup runbook in [`.icm/docs/neon-database-setup.md`](.icm/docs/neon-database-setup.md) |
| Scope authority (what's in, out, and killed) | [`.icm/docs/scope-decisions-2026-08-13.md`](.icm/docs/scope-decisions-2026-08-13.md) |

## Standing rules

- **Tickets are the plan.** Any plan, backlog, or TODO becomes a `DND-NNN` ticket in
  `.icm/intake/` — never a loose `TODO.md`. Finished tickets are `git mv`'d to `_done/`.
- **CI is the source of truth.** Never run `build`/`lint`/`typecheck`/`test` locally;
  push and read the checks.
- **Ticket-only commits go straight to `main`; code goes through a PR** on a `claude/`
  branch.
- **Decision tickets are Jamie's to decide** (e.g. DND-004). Produce evidence, not
  verdicts; never tick a human checkbox.
- **No secrets in git.** Env vars only — `DATABASE_URL` and the Neon Auth pair come from
  `.env.local` locally and Vercel project settings on deploy; `.gitignore` covers
  `.env*`. Flag any plaintext credential found.
- The `.cursor/`/Linear era is retired — requirements docs remain as the spec of record,
  but work is tracked here, not in Linear.
