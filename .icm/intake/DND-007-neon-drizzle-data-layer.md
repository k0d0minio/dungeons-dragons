# DND-007 · Neon Postgres + Drizzle data layer

| | |
|---|---|
| Type | feature |
| Priority | P1 |
| Size | M |

## Problem
Per the 2026-08-13 scope decisions, character data lives in **Neon Postgres** accessed
through **Drizzle ORM** — replacing the deleted Supabase stack (DND-006) and matching
the rest of the estate (the Apps monorepo's `biz.*` schema is already on Neon). Nothing
exists yet: no Neon project is wired, no Drizzle schema, no migrations. This is the
foundation DND-002 (Neon Auth), DND-008 (creation form), and DND-009 (sheet) all build
on.

Schema for v1 (combat-core sheet, simple creation form):

- `characters` — owner id (text, references Neon Auth's `neon_auth.user.id` — **not**
  `users_sync`, see below), name, class, species, level, the six ability
  scores, max/current/temp HP, AC, speed, spell slot state per level, conditions,
  death saves, known/prepared spell indexes (referencing dnd5eapi indexes), timestamps.

Keep it one table until a real need splits it — this is a friends-and-family app, not
the BRD's platform.

> **Correction from DND-002 (landed first).** The `neon_auth.users_sync` table named
> above belonged to legacy Neon Auth (Stack Auth), which Neon has since closed to new
> projects. Current Neon Auth is Managed Better Auth and stores users in
> `neon_auth.user`. Reference that. See `.icm/docs/neon-auth-setup.md`.

## What landed

- `drizzle.config.ts` — dialect `postgresql`, schema `src/lib/db/schema.ts`, output
  `drizzle/`. `DATABASE_URL` from the environment only; `.env.local` is loaded
  explicitly because drizzle-kit reads `.env` but not `.env.local`, which is the file
  Next.js and the auth runbook use.
- `src/lib/db/schema.ts` — the `characters` table, plus `Character` / `NewCharacter` /
  `SpellSlotState` types.
- `src/lib/db/client.ts` — `getDb()` / `isDatabaseConfigured()`, built lazily so the app
  builds and serves the public reference browser with `DATABASE_URL` unset. Same shape
  as `src/lib/auth/server.ts`, deliberately.
- `src/lib/db/characters.ts` — `listCharacters` / `getCharacter` / `createCharacter` /
  `updateCharacter` / `deleteCharacter`, every one of them taking `ownerId` first.
- `drizzle/0000_characters.sql` + snapshot.
- `.icm/docs/neon-database-setup.md` — the runbook for the human half.
- `/api/characters` now serves real rows instead of a hardcoded empty list.

## Decisions taken

**`neon_auth.user`, and no foreign key yet.** Per the correction above, `owner_id` is
plain `text` holding a Managed Better Auth user id. The FK is deliberately absent: Neon
creates the `neon_auth` schema only when a human enables Auth in the console, so a FK in
migration 0000 would fail against any database where that hasn't happened. The
`ALTER TABLE` to add it later is written out in the runbook.

**Owner id is the first argument, always.** There is no row-level security behind this
module — the WHERE clause *is* the security model. A required leading `ownerId` makes an
unscoped query awkward to write by accident, and the tests compile the real SQL to prove
each statement carries it.

**One table, with `jsonb` spell slots.** Slot state is `{"1": {max, used}, …}` rather
than a `character_spell_slots` table: it is read and written as one unit by one screen.
`max` is stored rather than derived because pact magic and multiclassing break the tidy
class-table derivation. The genuinely stable derived values (ability modifiers,
proficiency bonus, save/skill bonuses) stay computed at render time, per DND-009.

**Reference data by dnd5eapi index.** Class, species, spells and conditions are stored as
the index strings `/api/dnd5e/*` already serves (`"wizard"`, `"fireball"`, `"prone"`), so
the sheet taps through to DND-003's detail views with no lookup table of our own.

**`neon-http`, not the WebSocket driver.** v1 issues one independent statement per
request. Swap it if something ever needs a multi-statement transaction.

**Per-column CHECK constraints.** Level 1–20, ability scores 1–30, death saves 0–3,
non-negative HP/AC/speed. Deliberately no cross-column rule such as
`current_hit_points <= max_hit_points`: that would force every partial update to know
about the other column and make level-up order its writes. Clamping HP is the sheet's
job.

## Acceptance
- [x] Drizzle + drizzle-kit set up with the Neon serverless driver; `DATABASE_URL` from env only (Vercel env for deploys) — no credentials in git
- [x] `characters` schema as above, with a generated SQL migration checked in — `drizzle/0000_characters.sql`
- [x] A thin typed data-access module (create / get by owner / update / delete) usable from server components and route handlers — `src/lib/db/characters.ts`, wired into `/api/characters`
- [ ] CI green
- [ ] Jamie provisions the Neon database and sets `DATABASE_URL` (`.icm/docs/neon-database-setup.md`), then runs `npm run db:migrate` once — the code is inert until then

## Follow-ups this leaves open

- **DND-013** is now unblocked and needed: nothing applies `drizzle/` on deploy, so a
  merged schema change ships code expecting columns the database lacks. Until it lands,
  `npm run db:migrate` is a manual step.
- **The `owner_id` foreign key**, once Neon Auth is enabled on every environment. Until
  then nothing at the database level stops a character row outliving its owner — an
  accepted gap for an app with no account-deletion flow.
- **"CI green" still means "the Vercel build compiled."** There is no job running `jest`
  or `eslint` (DND-010/011/012), so the two test files added here are typechecked by the
  build but executed by nobody automatically.

## Prompt

Build the Neon + Drizzle data layer for the D&D 5e Companion. Add `drizzle-orm`,
`drizzle-kit`, and `@neondatabase/serverless`; configure drizzle-kit against
`DATABASE_URL` (env only). Define the v1 `characters` table per
`.icm/intake/DND-007-neon-drizzle-data-layer.md` (owner id as text for Neon Auth's
`neon_auth.users_sync`, added in DND-002 — don't add the FK constraint until that
schema exists), generate the migration, and expose a thin typed data-access module for
CRUD by owner. Assume the Neon project is provisioned by Jamie via the Vercel
integration; if `DATABASE_URL` is absent, wire everything so it works the moment the
env var lands. Read `.icm/docs/scope-decisions-2026-08-13.md` for context. DND-006
(prune) should land first. Open a PR on a `claude/` branch; do not run local checks —
CI is the source of truth.
