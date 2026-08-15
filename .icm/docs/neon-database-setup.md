# Neon database setup — runbook (DND-007)

> Deleted with the 2026-08-15 board reset (D9), restored by DND-024 — the
> character pages and two API error bodies still pointed users at this path.

What a human has to do once, in Vercel and the Neon Console, before the Drizzle
data layer built in DND-007 talks to a real database. The code is already in
place and degrades quietly until this lands: `getDb()` builds the connection
lazily, so the app builds and the public reference browser keeps working with
`DATABASE_URL` unset.

Companion to [`neon-auth-setup.md`](neon-auth-setup.md) — same Neon project, same
database. That is the point of putting both on Neon: `characters.owner_id` and
`neon_auth.user.id` live in one Postgres, so there is no cross-service join.

## 1. Provision the database

Vercel project → **Storage** → **Neon** (Marketplace integration) → create a
database, or connect an existing Neon project.

The integration writes the connection variables into the Vercel project itself —
`DATABASE_URL` among them. Nothing to copy by hand for preview and production.

## 2. Local development

Pull the same variable into `.env.local`:

```bash
npx vercel env pull .env.local
```

Or copy the pooled connection string from the Neon Console into
`.env.local` by hand:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
```

Use the **pooled** endpoint (the host containing `-pooler`) for the app. It has
no downside for the HTTP driver this app uses, and it is what serverless
functions want.

`.gitignore` covers `.env*`, and no connection string is ever sent to the
browser — every query runs server-side, in a route handler or a server
component.

## 3. Apply the migration

```bash
npm run db:migrate
```

That applies the checked-in SQL in [`drizzle/`](../../drizzle/) — it does not
infer anything from the live database. **Never run `drizzle-kit push` against a
database anyone cares about**; it diffs against live schema and will happily
drop a column.

On deploy this is automatic (DND-013): pull requests get their own migrated Neon
branch, and a merge to `main` migrates production. The failure and rollback
story, the one-time secrets, and the deliberate gap in deploy ordering are all
in [`db-migrations-deploy.md`](db-migrations-deploy.md). You still need
`db:migrate` locally against your own database; production migrates itself on
merge, and fails loudly if its `DATABASE_URL` secret ever goes missing
(DND-024).

## 4. Changing the schema

1. Edit [`src/lib/db/schema.ts`](../../src/lib/db/schema.ts).
2. `npm run db:generate` — writes a new numbered file into `drizzle/` plus a
   snapshot under `drizzle/meta/`.
3. Read the generated SQL before committing it. Drizzle guesses on renames, and
   a guess that lands as "drop column, add column" is a data loss bug that looks
   like a rename in the diff.
4. Commit the schema change and the generated migration in the same commit.
   A migration that arrives without its schema, or the reverse, breaks the next
   `db:generate` for whoever runs it next.

## The foreign key that isn't there yet

`characters.owner_id` holds a `neon_auth.user.id` but carries **no foreign key
constraint**. The `neon_auth` schema is created by Neon when a human enables Auth
in the console (step 1 of the auth runbook) — so a FK in this migration would
fail against any database where that has not happened. Add it in a follow-up
migration once Auth is enabled everywhere:

```sql
ALTER TABLE characters
  ADD CONSTRAINT characters_owner_id_fk
  FOREIGN KEY (owner_id) REFERENCES neon_auth."user"(id) ON DELETE CASCADE;
```

`user` needs the quotes — it is a reserved word in Postgres. Check the column
type Neon actually created for `neon_auth.user.id` before running this; the
constraint requires the two sides to match.

Until then, nothing at the database level stops a character row outliving its
owner. For a friends-and-family app with no account deletion flow, that is a
known and accepted gap, not an oversight.

## Where things live

| Thing                                             | File                                |
| ------------------------------------------------- | ----------------------------------- |
| Table definition and row types                    | `src/lib/db/schema.ts`              |
| Lazy connection (`getDb`, `isDatabaseConfigured`) | `src/lib/db/client.ts`              |
| Owner-scoped CRUD                                 | `src/lib/db/characters.ts`          |
| drizzle-kit config                                | `drizzle.config.ts`                 |
| Generated migrations                              | `drizzle/`                          |
| Migrations on deploy, failure and rollback        | `.icm/docs/db-migrations-deploy.md` |
