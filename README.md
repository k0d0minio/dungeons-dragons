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

`/characters` is a placeholder page. The database and the typed data layer behind it
exist (DND-007), but nothing writes to them yet — there is no character creation and no
sheet. Those are the next two tickets:

| | |
|---|---|
| DND-008 | Simple character creation form |
| DND-009 | Character sheet — combat core (HP, spell slots, conditions, death saves) |

Landing both is the v1 bar: a friend at the table can sign in, create a character, and
run it off their phone.

Migrations do apply on deploy: a PR gets its own migrated Neon branch, and a merge to
`main` migrates production. That needs a handful of Actions secrets set once — until they
are, both workflows no-op with a notice and `npm run db:migrate` stays a manual step. The
workflows themselves are in [`.github/workflows/`](.github/workflows/).

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Neon Postgres + Drizzle ORM** for character data, over the `neon-http` driver
- **Neon Auth** (Managed Better Auth, `@neondatabase/auth`) — users live in the
  `neon_auth` schema of the app's own database
- **shadcn/ui + Radix + Tailwind CSS 4**, SWR for data fetching
- **Jest + Testing Library** — 12 test files

Fully online. There is no offline mode, no service worker and no PWA install step; that
ambition was retired on 2026-08-13. There is no dice roller either, and there won't be —
physical dice are the point of a physical table.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

The reference browser works with no configuration at all. For sign-in and character data
to work, put these in `.env.local`:

| Variable | Where it comes from |
|---|---|
| `NEON_AUTH_BASE_URL` | Neon Console, after enabling Auth on the project |
| `NEON_AUTH_COOKIE_SECRET` | You generate it — `openssl rand -base64 32`, 32+ chars |
| `DATABASE_URL` | The Neon–Vercel integration, or the Neon Console (pooled endpoint) |

All three are set by hand, once, in the Neon Console and Vercel. Without them the
app still builds and runs; auth degrades quietly, the protected pages simply have no
session to find, and `/api/characters` answers `503` rather than pretending you own
nothing. No secret is ever sent to the browser — every query runs server-side, and the
client talks only to this app's `/api/auth/*` proxy.

Optional: `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_DESCRIPTION` override the title and
meta description.

### When something crashes

Two error boundaries, and somewhere for what they catch to land (DND-025).
[`src/app/error.tsx`](src/app/error.tsx) covers the pages;
[`src/app/global-error.tsx`](src/app/global-error.tsx) covers the root layout itself,
which is the one place `error.tsx` cannot reach and the one most likely to break, since
the layout renders `@neondatabase/auth` components from a `0.5.0-beta` prerelease. Both
show the error's digest — read it aloud and it finds the event.

Errors are reported to Sentry through
[`src/lib/observability/sentry.ts`](src/lib/observability/sentry.ts), which is where the
sample rates and the PII setting live. **All of it is optional.** With no
`NEXT_PUBLIC_SENTRY_DSN` the SDK is never initialised, every capture is a no-op, and the
app is exactly what it was without it — boundaries and console logging included.

| Variable | Where it comes from | Without it |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry, after creating a Next.js project. Not a secret — it ships in the client bundle by design | No reporting; errors go to Vercel Runtime Logs only |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens. Vercel project settings only, never `.env.local` | Errors still report; their stack traces stay minified |
| `SENTRY_ORG`, `SENTRY_PROJECT` | The slugs in your Sentry URL | Only read when `SENTRY_AUTH_TOKEN` is set |

Errors only — no tracing, no profiling, no session replay, and no analytics anywhere in
this app. That is deliberate and worth keeping.

### Other scripts

```bash
npm run build        # production build
npm run lint         # eslint
npm test             # jest
npm run test:coverage

npm run db:generate  # schema change -> new SQL migration in drizzle/
npm run db:migrate   # apply checked-in migrations to DATABASE_URL
npm run db:studio    # browse the data
```

The only workflows in `.github/` are the database ones from DND-013 — nothing runs
`jest`, `eslint` or `tsc` on push, so the Vercel build is still the only thing standing
between a broken PR and `main`. Adding a real CI workflow is DND-010, with format and
typecheck/coverage jobs in DND-011 and DND-012.

## Where things live

| | |
|---|---|
| Pages and UI | [`src/app/`](src/app/) · [`src/components/`](src/components/) |
| D&D reference proxy | [`src/app/api/dnd5e/`](src/app/api/dnd5e/) |
| Auth and route protection | [`src/lib/auth/`](src/lib/auth/) · [`src/proxy.ts`](src/proxy.ts) |
| Schema, connection, owner-scoped CRUD | [`src/lib/db/`](src/lib/db/) |
| Generated SQL migrations | [`drizzle/`](drizzle/) · [`drizzle.config.ts`](drizzle.config.ts) |
| Migrations on deploy | [`.github/workflows/`](.github/workflows/) |
| The backlog — **tickets are the plan** | [`.icm/intake/`](.icm/intake/) |
| What this project is for — intent, features, decisions | `.icm/project.md` — **not yet written** |
| D&D 5e rules reference (SRD 5.1) | [`docs/rules/`](docs/rules/) |

Work is tracked as markdown tickets in [`.icm/intake/`](.icm/intake/), one file per unit
of work, finished ones moved to `_done/`. There is no `TODO.md` and no issue tracker —
that folder is the backlog.

## Licence

MIT — see [LICENSE](LICENSE) — but the MIT grant covers **the source code only**. It does
not cover the SRD-derived game rules content: everything under [`docs/rules/`](docs/rules/)
and any SRD text the app fetches and renders. That material is not Jamie's to sublicense.
It is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode) and
its attribution requirement travels with any copy or redistribution:

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
> Wizards of the Coast LLC and available at
> <https://dnd.wizards.com/resources/systems-reference-document>. The SRD 5.1 is licensed
> under the Creative Commons Attribution 4.0 International License available at
> <https://creativecommons.org/licenses/by/4.0/legalcode>.

Neither licence grants trademark rights. D&D 5e Companion is unofficial Fan Content
permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the
materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
