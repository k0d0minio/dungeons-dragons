# CLAUDE.md — Layer 0: Repository Identity & Routing

> First file any Claude session reads. What this repo is, where to go. Detail lives in
> the routed files, not here.

## What this repo is

The **D&D 5e Companion PWA** — a personal project of Jamie Nisbet ("Personal use only…
Friends and family user base only" — the BRD's own words). A mobile-first, installable
PWA meant to be a D&D 5th Edition toolbox for players and DMs: reference browsing today,
character creation and offline play as the ambition.

**Stack**: Next.js 15 (App Router, Turbopack) · Clerk auth · Supabase (profiles, RLS via
Clerk JWT) · shadcn/Radix + Tailwind · PWA shell (service worker, manifest, IndexedDB).
Reference data is proxied from the public `dnd5eapi.co` API via `/api/dnd5e/*`.

**Honest current state** (2026-08): a single-page tabbed reference browser
(`src/app/page.tsx`) plus API routes. Several subsystems are built and tested but wired
to nothing — profile stack, offline-first data layer — and auth middleware protects
pages that don't exist. The backlog in `.icm/intake/` is the map of that gap; DND-004
is the scope decision (offline-first companion vs. slim reference browser).

## Routing — "if the task is… → go to…"

| The task | Go to |
|---|---|
| Plan or track any work (tickets ARE the plan) | [`.icm/intake/`](.icm/intake/) — `DND-NNN-slug.md`, spec in its README |
| Product requirements, user stories, MVP scope | [`.cursor/requirements/processed/`](.cursor/requirements/processed/) |
| Ad hoc reports, audits, decisions | [`.icm/docs/`](.icm/docs/) |
| Pages & UI | [`src/app/`](src/app/) + [`src/components/`](src/components/) |
| D&D data proxy | [`src/app/api/dnd5e/`](src/app/api/dnd5e/) |
| Auth & protected routes | [`src/middleware.ts`](src/middleware.ts) (Clerk) |
| Database schema & migrations | [`supabase/migrations/`](supabase/migrations/) |
| Offline/PWA layer (currently unwired — see DND-004) | [`src/lib/pwa/`](src/lib/pwa/) + [`src/lib/stores/`](src/lib/stores/) |

## Standing rules

- **Tickets are the plan.** Any plan, backlog, or TODO becomes a `DND-NNN` ticket in
  `.icm/intake/` — never a loose `TODO.md`. Finished tickets are `git mv`'d to `_done/`.
- **CI is the source of truth.** Never run `build`/`lint`/`typecheck`/`test` locally;
  push and read the checks.
- **Ticket-only commits go straight to `main`; code goes through a PR** on a `claude/`
  branch.
- **Decision tickets are Jamie's to decide** (e.g. DND-004). Produce evidence, not
  verdicts; never tick a human checkbox.
- **No secrets in git.** Env vars only (`supabase/config.toml` uses `env()` — keep it
  that way); flag any plaintext credential found.
- The `.cursor/`/Linear era is retired — requirements docs remain as the spec of record,
  but work is tracked here, not in Linear.
