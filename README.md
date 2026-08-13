# D&D 5e Companion PWA

A mobile-first Progressive Web App meant to be a digital toolbox for **Dungeons &
Dragons 5th Edition** players and Dungeon Masters — reference lookup, character
management, and DM prep that works at the table, including offline.

It is a personal project (friends-and-family scale), not a product. The full intent is
written up in
[`.cursor/requirements/processed/business-requirements.mdx`](.cursor/requirements/processed/business-requirements.mdx);
this README describes what is actually in the repo.

## Current state

Honest snapshot — the ambition above is larger than the code:

- **Working**: a single-page tabbed reference browser (`src/app/page.tsx`) over spells,
  classes, races, equipment and monsters, with client-side search, backed by API routes
  that proxy [dnd5eapi.co](https://www.dnd5eapi.co).
- **Wired but thin**: Clerk sign-in/sign-up in the header, PWA shell (manifest, service
  worker, install prompt, offline indicator).
- **Built but unwired**: the profile stack (`src/lib/supabase/`, `src/hooks/useProfile.ts`,
  `/api/profile`) and the offline-first data layer (`src/lib/pwa/`, `src/lib/stores/`) are
  implemented and unit-tested but nothing in the UI uses them. Clerk middleware protects
  `/dashboard` and `/profile`, which don't exist yet.
- **Not started**: character creation, campaign management, dice rolling — everything in
  the requirements doc beyond reference browsing.

Whether the offline/profile stack gets wired up or deleted is an open scope decision —
see `DND-004` in the backlog.

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| Auth | Clerk (`@clerk/nextjs`, `src/middleware.ts`) |
| Database | Supabase — profiles table, RLS keyed to the Clerk JWT (`supabase/migrations/`) |
| UI | shadcn/ui on Radix primitives, Tailwind CSS v4, lucide icons |
| Data fetching | SWR against `/api/dnd5e/*` |
| Offline | Service worker (`public/sw.js`), IndexedDB via `idb`, Zustand stores |
| Tests | Jest + Testing Library |

## Reference data

The app does not ship a rules database. `src/app/api/dnd5e/*` are thin server-side
proxies to `https://www.dnd5eapi.co/api` — list and detail routes for spells, classes
(including class spell lists), races, equipment and monsters. The client talks only to
the local routes, which keeps the upstream base URL in one place and leaves room to add
caching later.

## Running it

Requires Node 20+ and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Create `.env.local` (git-ignored) with:

```bash
# Clerk — https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase — project settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only, used by src/lib/supabase/admin.ts

# Optional branding overrides
NEXT_PUBLIC_APP_NAME="D&D 5e Companion"
NEXT_PUBLIC_APP_DESCRIPTION=
```

The reference browser works without any of these; auth and profiles do not. Never commit
a `.env` file or paste a key into `supabase/config.toml` — that file uses `env()`
references on purpose.

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm test`.

Database schema lives in `supabase/migrations/` and is applied with the Supabase CLI
(`npx supabase db push`).

## Layout

```
src/app/            pages, layout, and API routes
  api/dnd5e/        proxy routes to dnd5eapi.co
  api/profile/      Clerk-authenticated profile read/create
src/components/     app components + shadcn/ui primitives
src/lib/dnd-api/    typed client and SWR hooks
src/lib/pwa/        service worker hooks, IndexedDB layer (unwired)
src/lib/stores/     Zustand stores for characters and reference data (unwired)
src/lib/supabase/   browser, server and admin clients + profile queries
supabase/           config and SQL migrations
public/             manifest, service worker, icons, offline fallback
```

## Backlog

Work is tracked as tickets in [`.icm/intake/`](.icm/intake/) — one `DND-NNN-slug.md` file
per piece of work, format described in
[`.icm/intake/README.md`](.icm/intake/README.md). Finished tickets move to
`.icm/intake/_done/`. There is no issue tracker; the tickets are the plan.

[`CLAUDE.md`](CLAUDE.md) is the entry point for AI sessions and carries the repo's
working conventions.
