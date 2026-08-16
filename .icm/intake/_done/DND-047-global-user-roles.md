# DND-047 · Global user roles — one DM, everyone else plays

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P1 |
| Size | S |
| Sources | Jamie's prototype interrogation 2026-08-15 · register D19 · `src/lib/db/schema.ts:198-211` |

## Problem

Nothing in the app knows that Jamie is the DM. `campaigns.dm_user_id` says who runs a
given campaign, but nothing says who may *create* campaigns or see the DM surface at all —
which today is everyone, and should be one person.

## Decision (Jamie, 2026-08-15, register D19)

One global role per user, `dm` or `player`, in a `public.user_roles` table. It gates the
DM **tools** only — seeing `/dm`'s tools, creating campaigns. It grants no data access:
what a DM may read or edit still flows from `campaigns.dm_user_id` per campaign (DND-027),
exactly as the schema's "roster, not a permission grant" warning demands. **No row means
player**, so sign-up needs no hook and every future sign-up is a player by construction.

The seed migration (`drizzle/0002_authority.sql`) marks `jamie.nisbet@outlook.be` as `dm`
and every user existing at migration time as `player`, reading `neon_auth."user"`
defensively: if the table is not readable it warns rather than failing the deploy, and the
by-hand INSERT lives in `.icm/docs/db-migrations-deploy.md`.

Deliberate nuance: the DM *tab* stays visible to players — the bottom bar never changes
shape under a learned thumb (D16) — and `/dm` shows a player whose screen it is rather
than a 404. The existence of DM tools is not a secret at a table of friends; their use is
what the role gates, and the API routes enforce it server-side.

## Acceptance

- [ ] `user_roles` exists; absence of a row reads as `player`
- [ ] The seed marks Jamie `dm` and existing users `player`, and cannot fail the deploy
- [ ] `/dm` renders tools for the `dm` role and an honest hand-off for players
- [ ] Campaign creation is refused server-side for players
- [ ] A brand-new sign-up is a player with no code path having to say so
- [ ] CI green

Read `.icm/intake/DND-047-global-user-roles.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
