# D&D 5e Companion

A mobile-first D&D 5th Edition toolbox for players: fast reference lookup, and a
character sheet you can keep open on your phone for a whole session.

Personal project, personal scale — friends and family at one table, not a product.

## What works today

**Reference browser** (`/`, public, no sign-in). One page, five tabs — spells, classes,
races, equipment, monsters — with search and tap-through detail views for each. Data
comes from the public [dnd5eapi.co](https://www.dnd5eapi.co) API, proxied through this
app's own `/api/dnd5e/*` routes so the client never talks to it directly.

**Accounts** (`/auth/sign-in`, `/auth/sign-up`, `/account/*`). Email and password via
Neon Auth. Social sign-in is deliberately off until an OAuth provider is configured.

**Protected routes.** `/characters` and `/account/*` require a session; `/api/characters`
answers `401` rather than redirecting. Reference browsing stays public.

## What is not built yet

`/characters` is a placeholder page — there is no database behind it, no character
creation, and no sheet. Those are the next three tickets:

| | |
|---|---|
| DND-007 | Neon Postgres + Drizzle data layer |
| DND-008 | Simple character creation form |
| DND-009 | Character sheet — combat core (HP, spell slots, conditions, death saves) |

Landing all three is the v1 bar: a friend at the table can sign in, create a character,
and run it off their phone.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Neon Postgres + Drizzle** for character data — *planned, DND-007*
- **Neon Auth** (Managed Better Auth, `@neondatabase/auth`) — users live in the
  `neon_auth` schema of the app's own database
- **shadcn/ui + Radix + Tailwind CSS 4**, SWR for data fetching
- **Jest + Testing Library** — 10 test files

Fully online. There is no offline mode, no service worker and no PWA install step; that
ambition was retired on 2026-08-13. There is no dice roller either, and there won't be —
physical dice are the point of a physical table.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

The reference browser works with no configuration at all. For sign-in to work, put these
in `.env.local`:

| Variable | Where it comes from |
|---|---|
| `NEON_AUTH_BASE_URL` | Neon Console, after enabling Auth on the project |
| `NEON_AUTH_COOKIE_SECRET` | You generate it — `openssl rand -base64 32`, 32+ chars |

Full setup runbook: [`.icm/docs/neon-auth-setup.md`](.icm/docs/neon-auth-setup.md).
Without them the app still builds and runs; auth degrades quietly and the protected
pages simply have no session to find. No secret is ever sent to the browser — the client
talks only to this app's `/api/auth/*` proxy.

Optional: `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_DESCRIPTION` override the title and
meta description.

### Other scripts

```bash
npm run build        # production build
npm run lint         # eslint
npm test             # jest
npm run test:coverage
```

Note that there is no CI workflow in this repo yet — the only automated check on a PR is
the Vercel build, so nothing runs the test suite on push. Adding that is DND-010, with
format and typecheck/coverage jobs in DND-011 and DND-012.

## Where things live

| | |
|---|---|
| Pages and UI | [`src/app/`](src/app/) · [`src/components/`](src/components/) |
| D&D reference proxy | [`src/app/api/dnd5e/`](src/app/api/dnd5e/) |
| Auth and route protection | [`src/lib/auth/`](src/lib/auth/) · [`src/proxy.ts`](src/proxy.ts) |
| The backlog — **tickets are the plan** | [`.icm/intake/`](.icm/intake/) |
| Scope authority: what's in, out, and killed | [`.icm/docs/scope-decisions-2026-08-13.md`](.icm/docs/scope-decisions-2026-08-13.md) |
| Product requirements (historical detail) | [`.cursor/requirements/processed/`](.cursor/requirements/processed/) |

Work is tracked as markdown tickets in [`.icm/intake/`](.icm/intake/), one file per unit
of work, finished ones moved to `_done/`. There is no `TODO.md` and no issue tracker —
that folder is the backlog.

## Licence

MIT — see [LICENSE](LICENSE).
