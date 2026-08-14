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

## Acceptance
- [ ] Drizzle + drizzle-kit set up with the Neon serverless driver; `DATABASE_URL` from env only (Vercel env for deploys) — no credentials in git
- [ ] `characters` schema as above, with a generated SQL migration checked in
- [ ] A thin typed data-access module (create / get by owner / update / delete) usable from server components and route handlers
- [ ] CI green

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
