# D&D 5e Companion

A mobile-first D&D 5th Edition toolbox for players: fast reference lookup, and a
character sheet you can keep open on your phone for a whole session.

Personal project, personal scale — friends and family at one table, not a product.

## What works today

**Reference browser** (`/`, public, no sign-in). One page, six tabs — spells, classes,
species, equipment, magic items, monsters — with search across all of them and tap-through
detail views. Two rules chapters live in-app at [`/rules/conditions`](src/app/rules/conditions/)
and [`/rules/quick-reference`](src/app/rules/quick-reference/). Every one of the six types
is SRD 5.2.1 data that ships with the build in [`src/lib/srd/data/`](src/lib/srd/data/) —
there is no third-party API in the request path. Classes and species are read straight out
of the bundle; the long tail (339 spells, 331 monsters, 262 magic items, 182 equipment
rows) is served over the app's own public, CDN-cached `/api/srd/*` routes, so a phone
downloads a search result rather than a megabyte of stat blocks.

**Accounts** (`/auth/sign-in`, `/auth/sign-up`, `/account/*`). Email and password via
Neon Auth. Sign-up is gated by a shared invite code (`SIGNUP_INVITE_CODE`) and
**fail-closed**: with the variable unset, nobody can register at all. Everyone gets a
global role, `dm` or `player` — no row in `user_roles` means `player`, and the DM is
seeded by migration.

**Characters** (`/characters`, session required). A one-page creation and edit form —
name, class, species, level, ability scores, skill proficiencies with expertise, spells —
and a full combat sheet: hit points with typed temporary HP, attacks, death saves, spell
slots and spell preparation, rests with hit dice, class resources, conditions and
exhaustion (0–6), inventory with currency and derived AC, and skill bonuses computed for
real (proficiency, expertise, Jack of All Trades). A guided level-up page works out what
changes with a new level.

**DM tools** (`/dm`, global `dm` role). Campaigns with join links, the party at a
glance, and encounters with initiative order and per-instance monster HP. Each encounter
can share a public read-only table screen at `/table/[token]` — reachable without
sign-in via an unguessable, regenerable token, and it never shows monster HP.

**Two phones, one truth.** Every character write carries a version; a stale write
answers `409` and the losing device refreshes and says so, and an open sheet re-reads
every ~15 seconds so a DM edit lands without anyone refreshing. Errors are reported to
Sentry when a DSN is configured, and go nowhere when it is not.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Neon Postgres + Drizzle ORM** for character data, over the `neon-http` driver
- **Neon Auth** (Managed Better Auth, `@neondatabase/auth`) — users live in the
  `neon_auth` schema of the app's own database
- **shadcn/ui + Radix + Tailwind CSS 4**, SWR for data fetching
- **Jest + Testing Library** — the jest suite runs in CI on every push, with coverage
  floors; the CI check is the source of truth for whether it passes

Fully online. There is no offline mode, no service worker and no PWA install step; that
ambition was retired on 2026-08-13. There is no dice roller either, and there won't be —
physical dice are the point of a physical table.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

The reference browser works with no configuration at all. Everything else is switched on
by environment variables — [`.env.example`](.env.example) lists every one with where it
comes from. The short version, for `.env.local`:

| Variable                  | Where it comes from                                                |
| ------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`            | The Neon–Vercel integration, or the Neon Console (pooled endpoint) |
| `NEON_AUTH_BASE_URL`      | Neon Console, after enabling Auth on the project                   |
| `NEON_AUTH_COOKIE_SECRET` | You generate it — `openssl rand -base64 32`, 32+ chars             |
| `SIGNUP_INVITE_CODE`      | You invent it, and hand it to the people at your table             |

Without the database and auth variables the app still builds and runs; auth degrades
quietly, the protected pages simply have no session to find, and `/api/characters`
answers `503` rather than pretending you own nothing. Without `SIGNUP_INVITE_CODE`,
sign-up is refused outright — that is the fail-closed default, not a bug. No secret is
ever sent to the browser — every query runs server-side, and the client talks only to
this app's `/api/auth/*` proxy.

**On a deploy, these live in the Vercel project settings**, and one caveat is worth
knowing: environment variables are read at build time, so changing one in Vercel does
nothing until the next redeploy. (The optional `NEXT_PUBLIC_APP_DESCRIPTION` override
for the meta description, and `NEXT_PUBLIC_APP_NAME` for the name in the page header,
are build-time inlined the same way.)

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

| Variable                       | Where it comes from                                                                              | Without it                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`       | Sentry, after creating a Next.js project. Not a secret — it ships in the client bundle by design | No reporting; errors go to Vercel Runtime Logs only   |
| `SENTRY_AUTH_TOKEN`            | Sentry → Settings → Auth Tokens. Vercel project settings only, never `.env.local`                | Errors still report; their stack traces stay minified |
| `SENTRY_ORG`, `SENTRY_PROJECT` | The slugs in your Sentry URL                                                                     | Only read when `SENTRY_AUTH_TOKEN` is set             |

Errors only — no tracing, no profiling, no session replay, and no analytics anywhere in
this app. That is deliberate and worth keeping.

### Other scripts

```bash
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run format:check # prettier
npm test             # jest
npm run test:coverage

npm run db:generate  # schema change -> new SQL migration in drizzle/
npm run db:migrate   # apply checked-in migrations to DATABASE_URL
npm run db:studio    # browse the data
```

CI runs lint, typecheck, format and the jest suite with coverage floors on every PR and
push to `main` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml), DND-042) — a
green check means all of it passed, and the checks tab is where to read the numbers.
Migrations apply on deploy: a merge to `main` migrates production via
[`.github/workflows/`](.github/workflows/), which needs a handful of Actions secrets set
once (they are listed at the bottom of [`.env.example`](.env.example)).

## Where things live

|                                                        |                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| What this project is for — intent, features, decisions | [`.icm/project.md`](.icm/project.md)                              |
| Pages and UI                                           | [`src/app/`](src/app/) · [`src/components/`](src/components/)     |
| SRD 5.2.1 game data (local)                            | [`src/lib/srd/`](src/lib/srd/)                                    |
| SRD reference endpoints (local data, public)           | [`src/app/api/srd/`](src/app/api/srd/)                            |
| Auth, invite gate and route protection                 | [`src/lib/auth/`](src/lib/auth/) · [`src/proxy.ts`](src/proxy.ts) |
| Schema, connection, owner-scoped CRUD                  | [`src/lib/db/`](src/lib/db/)                                      |
| Generated SQL migrations                               | [`drizzle/`](drizzle/) · [`drizzle.config.ts`](drizzle.config.ts) |
| CI and migrations on deploy                            | [`.github/workflows/`](.github/workflows/)                        |
| The backlog — **tickets are the plan**                 | [`.icm/intake/`](.icm/intake/)                                    |
| D&D 5e rules reference (SRD 5.2.1)                     | [`docs/rules/`](docs/rules/)                                      |

Work is tracked as markdown tickets in [`.icm/intake/`](.icm/intake/), one file per unit
of work, finished ones moved to `_done/`. There is no `TODO.md` and no issue tracker —
that folder is the backlog.

## Licence

MIT — see [LICENSE](LICENSE) — but the MIT grant covers **the source code only**. It does
not cover the SRD-derived game rules content: everything under [`docs/rules/`](docs/rules/)
and [`src/lib/srd/data/`](src/lib/srd/data/), and any SRD text the app renders. That
material is not Jamie's to sublicense.
It is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode) and
its attribution requirement travels with any copy or redistribution:

> This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by
> Wizards of the Coast LLC, available at <https://www.dndbeyond.com/srd>. The SRD 5.2.1 is
> licensed under the Creative Commons Attribution 4.0 International License.

That is now the only SRD notice the app carries. The SRD 5.1 attribution that used to sit
beside it is gone: the reference browser's spells, monsters and magic items read local
SRD 5.2.1 data, the `dnd5eapi.co` proxy is retired, and the app no longer distributes any
5.1 material for the notice to cover.

The licence grants no trademark rights. D&D 5e Companion is unofficial Fan Content
permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the
materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
