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

## Acceptance
- [ ] Preview deploys run against a per-branch Neon database, not production; the branch is created on PR open and removed on PR close
- [ ] Migrations apply automatically to the preview branch before the preview serves traffic
- [ ] Migrations apply to production on merge to `main`, ordered before the new deployment serves traffic, failing the deploy on error rather than continuing
- [ ] The deploy path uses `drizzle-kit migrate` (apply checked-in migrations), never `drizzle-kit push` — no schema inference against a live database
- [ ] `DATABASE_URL` and any Neon API token come from env / Vercel env only — no credentials in git, and none echoed into build logs
- [ ] Migration failure and rollback behaviour written down in `.icm/docs/` — what happens to a half-applied migration, and how to recover
- [ ] CI green

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
