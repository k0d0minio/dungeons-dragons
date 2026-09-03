# Stub: The additive-migration guard that never landed

- lane: chore
- found-by: remote-branch-prune, 2026-09-03
- priority: P2
- size: S
- sources: `origin/claude/dnd-campaigns-substrate-awdt22:src/lib/db/migrations.test.ts`
  (commit `f12dc77`, PR `#21`, closed unmerged)

Found while pruning dead remote branches. `claude/dnd-campaigns-substrate-awdt22` is the
one branch of 70 that is **not** safe to delete: PR `#21` was closed unmerged in favour of
`#22`, which landed the campaigns substrate from a different branch — so the tables, the
migration and `src/lib/db/campaigns.ts` are all in `main`, but one file rode only on `#21`
and exists nowhere else: `src/lib/db/migrations.test.ts`.

It reads the checked-in migrations from `drizzle/meta/_journal.json` in the order
`drizzle-kit migrate` applies them, and fails on the shapes that break the deploy window —
`db-migrate-production.yml` runs the migration job *in parallel* with the Vercel deploy, so
for a minute on every merge new code is live against an un-migrated database and old code
against a migrated one. "Additive and nullable" in `.icm/project.md` is exactly what that
window needs, and nothing currently enforces it: no file under `src/` or `scripts/` reads
`_journal.json` or `drizzle/meta` at all. Twelve migrations have landed since.

Decide whether the guard is worth having. If yes, take the file off the branch and let CI
run it. If no, say so here and the branch can be pruned with the rest.

**Until this is decided, do not delete `claude/dnd-campaigns-substrate-awdt22`** — it is
the only copy.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/migrations-additive-guard.md`. Recover
`src/lib/db/migrations.test.ts` from `origin/claude/dnd-campaigns-substrate-awdt22`
(`git show origin/claude/dnd-campaigns-substrate-awdt22:src/lib/db/migrations.test.ts`),
check it still parses the twelve migrations in `drizzle/` as they are shaped today, and
decide with Jamie whether to land it. Produce the evidence — which migrations it passes
and which it flags — and let Jamie call it; do not tick the decision yourself. If it
lands, note in `.icm/intake/triage/remote-branch-prune.md` that the branch is now free to
prune.
