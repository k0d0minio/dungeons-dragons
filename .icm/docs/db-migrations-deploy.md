# Database migrations on deploy — runbook (DND-013)

How the SQL in [`drizzle/`](../../drizzle/) reaches a real database, what happens
when one fails, and how to get out of it. Companion to
[`neon-database-setup.md`](neon-database-setup.md), which covers provisioning.

## What runs where

| When | Workflow | What it does |
|---|---|---|
| PR opened / reopened / pushed to | `.github/workflows/db-preview.yml` | Creates (or reuses) Neon branch `preview-pr-<n>`, applies migrations to it, points that PR's Vercel preview at it |
| PR closed | same file, `cleanup` job | Deletes the Neon branch and the branch-scoped Vercel variable |
| Push to `main` | `.github/workflows/db-migrate-production.yml` | Applies migrations to production |

Both use `drizzle-kit migrate`, which applies the checked-in SQL and infers
nothing. **Never `drizzle-kit push`** on any database anyone cares about — it
diffs against the live schema and will drop a column it believes is surplus.

## One-time setup

Nothing below is in git. Until it exists the workflows no-op with a notice
rather than failing, so PRs stay green — but no database gets migrated either.

**Repository secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Where it comes from |
|---|---|
| `NEON_API_KEY` | Neon Console → Account settings → API keys |
| `VERCEL_TOKEN` | Vercel → Account settings → Tokens. Optional — without it the Neon branch is still created and migrated, but the preview keeps using the shared preview database |

**Repository variables** (same page → Variables — these are not secret):

| Variable | Value |
|---|---|
| `NEON_PROJECT_ID` | Neon Console → Project settings |
| `VERCEL_PROJECT_ID` | `prj_Ftc0XWagsDbj4r6HZdNTXTolbPgQ` |
| `VERCEL_TEAM_ID` | `team_PCq0jpC3GS1jsyS8OFuHPLqm` |

**Environment secret** (Settings → Environments → `production`):

| Secret | Value |
|---|---|
| `DATABASE_URL` | The production Neon connection string. Put it on the `production` environment, not on the repository, so it cannot be read by a workflow run from a fork or a feature branch |

## The two decisions, and what they cost

DND-013 left both of these to Jamie. Both were decided on 2026-08-14.

### Production migrations apply automatically on merge

The migrate job runs through a GitHub Environment called `production` with no
required reviewers, so merging to `main` applies the migration immediately.

*Chosen because* Jamie is both the author and the only reviewer here — a gate
that only he can clear, on work only he wrote, is ceremony rather than safety.

*To add the gate later*: Settings → Environments → `production` → Required
reviewers → add yourself. Merges then wait for a click in the Actions tab. **No
change to the workflow file** — that is why the job names an environment it does
not currently need.

### Vercel keeps its Git deploys; migrations run alongside

**This leaves the ticket's ordering criterion unmet, knowingly.** Vercel deploys
on push to `main` at the same time Actions migrates, so there is a window —
usually under a minute — where the new code is live against a database that has
not been migrated yet. With one table, one user base of friends, and a schema
change every few weeks, that window is very unlikely to be hit and trivially
recovered from by waiting.

*The alternative, if that stops being acceptable*: set
`{"git": {"deploymentEnabled": {"main": false}}}` in a `vercel.json`, add
`VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`, and have the production
workflow run `vercel deploy --prod` after the migrate step. Ordering then holds
by construction and a failed migration means no deploy at all. The cost is that
production deploys stop happening at all if those secrets ever go stale.

### The related caveat nobody chose

**The first build of a new PR can miss its branch database.** Vercel starts the
preview build on push, in parallel with the workflow that creates the Neon
branch and sets the branch-scoped `DATABASE_URL`. On the very first push to a
new PR, Vercel usually wins the race, so that first preview runs against the
shared preview database. Every later push to the same PR is fine, because the
variable is already in place.

If a first preview matters, redeploy it from the Vercel dashboard once the
`Preview database` check is green. The structural fix is the same as above —
let Actions own the deploy — or the native Neon–Vercel integration, which wires
branch databases in without a race.

## When a migration fails

**The good news, and it is load-bearing:** `drizzle-kit migrate` runs **every
pending migration inside a single transaction**, and records them in
`drizzle.__drizzle_migrations` inside that same transaction. Postgres DDL is
transactional. So a failure rolls the whole thing back — schema and bookkeeping
together. **There is normally no such thing as a half-applied migration here.**
The database is exactly as it was, and re-running after fixing the SQL is safe.

Verified against `drizzle-orm`'s migrator, which this project reaches through
the WebSocket driver: `drizzle-kit` picks its driver from what is installed, and
this repo has `@neondatabase/serverless`, so migrations run over a real
transactional connection rather than the HTTP one the app uses.

### The exceptions worth knowing

A few statements cannot run inside a transaction block and will error rather
than half-apply — `CREATE INDEX CONCURRENTLY`, `DROP INDEX CONCURRENTLY`,
`VACUUM`, `ALTER TYPE … ADD VALUE` on older Postgres. Drizzle does not generate
these on its own. If you hand-edit a migration to include one, split it into its
own migration file and expect it to need manual cleanup on failure.

### Recovery

1. **Read the failure in the Actions log.** The transaction has already rolled
   back; nothing is waiting on you.
2. **Fix the schema in `src/lib/db/schema.ts`,** regenerate with
   `npm run db:generate`, and delete the bad migration file *and its snapshot
   entry* — do not leave a broken migration in `drizzle/` for someone to trip
   over later.
3. **Re-run** the workflow (Actions → the failed run → Re-run jobs), or
   `npm run db:migrate` locally against the same database.

If the deploy already went out and the code now expects a schema that is not
there, the fastest fix is almost always to roll the code forward or revert the
merge — not to hand-patch production. Reverting the merge and letting Vercel
redeploy restores the previous code against the previous schema, which is a
consistent pair.

### There is no `down` migration

Drizzle generates forward-only SQL. Undoing a schema change means writing the
inverse as a new migration. For a destructive change (dropping a column, tightening
a constraint) that means the data is gone — take a Neon branch first, which is
instant and free, and treat it as the backup:

```bash
# Before a destructive migration, from the Neon Console or API:
#   create a branch of production named e.g. pre-0003
# It is a copy-on-write snapshot; restore by branching back from it.
```

## The hazard that does not announce itself

Drizzle's migrator applies **only migrations newer than the newest one already
applied** — it compares timestamps, it does not reconcile a set. So:

> Two PRs each generate a migration. PR B's is generated later but merges
> first. PR A's migration is now older than the newest applied one, and will be
> **silently skipped forever**. No error, no warning; the column simply never
> appears.

This is the one failure mode that will not page you. Guard against it: if two
PRs in flight both touch `drizzle/`, rebase the second one on `main` and
regenerate its migration after the first merges. If you suspect it has already
happened, compare `drizzle/meta/_journal.json` against the rows in
`drizzle.__drizzle_migrations` — a migration in the journal with no matching
hash in the table was skipped.

## Where things live

| Thing | File |
|---|---|
| Preview branch lifecycle | `.github/workflows/db-preview.yml` |
| Production migrations | `.github/workflows/db-migrate-production.yml` |
| Migration SQL and journal | `drizzle/` |
| Schema and data access | `src/lib/db/` |
| Provisioning and local dev | `.icm/docs/neon-database-setup.md` |
