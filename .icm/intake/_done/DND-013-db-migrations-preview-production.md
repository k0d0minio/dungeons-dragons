# DND-013 · Database migrations on preview and production deploys

| | |
|---|---|
| Type | chore |
| Priority | P1 |
| Size | M |

## Problem
DND-007 checks generated Drizzle SQL migrations into the repo — but **nothing applies
them**. `next build` does not run migrations, and Vercel has no post-deploy hook wired.
As it stands, a merged schema change ships application code that expects columns the
database does not have, and the first request after deploy is the thing that finds out.

Two environments, two different problems:

- **Preview.** Every PR gets a Vercel preview deploy, and they currently share whatever
  `DATABASE_URL` is configured — so a preview running a not-yet-merged migration would
  mutate the same database as every other preview and as production. Preview deploys
  need an isolated, disposable database per branch. Neon's branching (via the
  Neon–Vercel integration) is the intended mechanism: branch from production, run
  migrations against the branch, drop it when the PR closes.
- **Production.** Migrations must apply on merge to `main`, ordered before the new code
  serves traffic, and must fail the deploy loudly rather than half-applying.

This blocks DND-008 (creation form) and DND-009 (character sheet) from being safely
deployable — both write real character data.

## Jamie's two decisions (2026-08-14)

Both taken in session, trade-offs written up in `.icm/docs/db-migrations-deploy.md`.

**(a) Production migrations apply automatically on merge** — no approval gate. The
job runs through a GitHub Environment named `production` with no required reviewers,
so adding the gate later is a settings toggle and not a code change.

**(b) Preview branching runs through GitHub Actions and the Neon API**, not the
Neon–Vercel integration. Jamie also chose to **leave Vercel's Git deploys in place**
rather than let Actions own the production deploy — which is what the "ordering"
criterion below turns on, so that box stays unticked deliberately rather than
optimistically.

## What landed

- `.github/workflows/db-preview.yml` — Neon branch `preview-pr-<n>` created on PR
  open, migrated on every push, repointed via a branch-scoped Vercel `DATABASE_URL`;
  branch and variable both deleted on PR close. (First `.github/` in this repo —
  DND-010/011/012 still own lint/typecheck/test jobs.)
- `.github/workflows/db-migrate-production.yml` — migrates production on push to
  `main`, through the `production` environment.
- `.icm/docs/db-migrations-deploy.md` — setup, both decisions with their costs, the
  failure/rollback story, and the silent-skip hazard below.

Both workflows no-op with a notice when their credentials are absent, so PRs stay
green before the one-time setup rather than going red on every push.

## Two findings worth carrying forward

**A failed migration does not half-apply.** `drizzle-kit` picks its driver from what
is installed; this repo has `@neondatabase/serverless`, so migrations run over the
WebSocket driver, and `drizzle-orm`'s migrator wraps *every pending migration plus
its `__drizzle_migrations` bookkeeping* in one transaction. Postgres DDL is
transactional, so a failure rolls back schema and bookkeeping together. Re-running
after a fix is safe. (Verified by reading the migrator, not assumed.)

**Out-of-order migrations are skipped silently.** The migrator applies only
migrations *newer* than the newest already applied — it compares timestamps rather
than reconciling a set. Two PRs in flight, the later-generated one merged first, and
the other's migration is skipped forever with no error. This is the one failure mode
that will not page anyone; the detection recipe is in the runbook.

## Acceptance
- [x] Preview deploys run against a per-branch Neon database, not production; the branch is created on PR open and removed on PR close — with one caveat: on the *first* push to a new PR, Vercel's build can start before the branch-scoped variable lands, so that first preview may use the shared preview database. Every later push is correct. Documented.
- [x] Migrations apply automatically to the preview branch before the preview serves traffic
- [ ] Migrations apply to production on merge to `main`, ordered before the new deployment serves traffic, failing the deploy on error rather than continuing — **knowingly unmet per decision (b).** Migrations apply on merge and fail the Actions run loudly, but Vercel deploys in parallel, so there is a sub-minute window where new code can serve against an un-migrated database. Closing it means letting Actions own the production deploy; the exact change is in the runbook.
- [x] The deploy path uses `drizzle-kit migrate` (apply checked-in migrations), never `drizzle-kit push` — no schema inference against a live database
- [x] `DATABASE_URL` and any Neon API token come from env / Vercel env only — no credentials in git, and none echoed into build logs (request bodies built with `jq`, error paths print `.error.message` only, never the whole response)
- [x] Migration failure and rollback behaviour written down in `.icm/docs/` — `db-migrations-deploy.md`
- [x] CI green — PR #8. The `Preview database` workflow ran on that PR and passed: the credential check took the skip path and every step after it was skipped, which is the intended behaviour before the secrets exist. Vercel green on the same commit.
- [ ] Jamie sets the Actions secrets and variables (`.icm/docs/db-migrations-deploy.md` § One-time setup) — both workflows are inert until then

Jamie moved this ticket to `_done/` on 2026-08-14 with two boxes still open. The
workflows are merged and verified on a real runner; what remains is the one-time
secret setup (a console chore) and the ordering gap, which is a consequence of his own
decision (b) rather than unfinished work. Neither needs the ticket held open.

## Prompt

Wire Drizzle migrations into the D&D 5e Companion's deploy pipeline for both preview and
production. Preview deploys must run against an isolated per-branch Neon database
(created on PR open, migrated before the preview serves traffic, dropped on PR close);
production must apply migrations on merge to `main`, before the new code takes traffic,
failing the deploy loudly on error. Use `drizzle-kit migrate` against the checked-in
migrations — never `push`. Keep `DATABASE_URL` and any Neon API token in env / Vercel env
only, and make sure neither reaches build logs. Document the failure and rollback story
in `.icm/docs/`.

DND-007 must land first — it creates the Drizzle setup and the first migration this
pipeline applies. Two choices are **Jamie's to make, not yours**: (a) whether production
migrations apply automatically on merge or wait behind a manual approval gate, and
(b) whether preview branching runs through the Neon–Vercel integration (Jamie clicks it
into place) or through an explicit GitHub Actions job using the Neon API. Lay out the
trade-offs for both with enough detail to decide, implement the automatable path behind
whichever default you propose, and leave the human checkboxes unticked.

Read `.icm/intake/DND-013-db-migrations-preview-production.md` and
`.icm/docs/scope-decisions-2026-08-13.md` for context. Open a PR on a `claude/` branch;
do not run local checks — CI is the source of truth.
