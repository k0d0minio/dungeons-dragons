# DND-024 · Workflows must fail loudly, not green-tick a skipped job

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P1 |
| Size | S |
| Sources | tech lens · `.github/workflows/db-migrate-production.yml:42-47,50,53,59,65` · `db-preview.yml:31,40-45` |

## Problem

"CI is the source of truth" is a standing rule of this repo, printed at the bottom of every
ticket. Both workflows break it at the root.

**Production migrations succeed when they do nothing.** If `secrets.DATABASE_URL` is ever
absent, `db-migrate-production.yml:42-47` emits a `::warning::` and every subsequent step is
gated on `steps.db.outputs.configured == 'true'` (lines 50, 53, 59, 65) — so the job
**passes**. Its own warning text says production is then "running code that expects columns it
does not have". It announces an outage and reports success in the same run. The degrade-to-a-
warning behaviour was a deliberate choice made before the secret existed, so that PRs were not
red during setup; that reason has expired — `DATABASE_URL` has been set since 2026-08-14.

**Preview database branching has never actually run.** Preview runs complete in 5–10 seconds,
which is the `configured=false` path: `NEON_API_KEY` and `NEON_PROJECT_ID` are not set, so no
branch is created and no migration is applied. Two consequences. First, `db-preview.yml` is
the only PR-triggered workflow (`:31`), so **a PR's check list today proves nothing at all**.
Second, and worse: **every migration merged so far first ran against production**, inside the
deliberately-accepted window where the Vercel deploy and the migration job run in parallel.

The workflows themselves are well written — `db-preview.yml` even keeps the connection string
out of the logs via `jq` and cleans up branch-scoped Vercel vars on close. This ticket is
about the credential gate and the secrets, not a rewrite.

## Acceptance

- [ ] A missing required credential fails the job rather than passing it
- [ ] `NEON_API_KEY` and `NEON_PROJECT_ID` are set, and a PR demonstrably creates and migrates
      its own Neon branch
- [ ] A green check on a PR means a migration was actually test-applied
- [ ] The `.icm/docs/db-migrations-deploy.md` runbook that both workflows cite five times is
      restored and correct, or the citations are removed — an operator must not be sent to a
      file that does not exist
- [ ] CI green

## Prompt

Make the D&D 5e Companion's database workflows honest. Right now both of them can report
success while doing nothing, in a repo whose standing rule is "CI is the source of truth".

**The bug.** `.github/workflows/db-migrate-production.yml:42-47` checks for
`secrets.DATABASE_URL`, and if it is missing emits a warning and sets `configured=false`;
every following step is gated on that output (lines 50, 53, 59, 65), so the job succeeds
having skipped the migration entirely — while its own warning text says production is running
code that expects columns it does not have. `db-preview.yml:40-45` has the same shape. That
degrade-to-warning was deliberate, so PRs were not red before the one-time setup; the setup is
done and the behaviour should now be a hard failure.

**The unset secrets.** Only `DATABASE_URL` exists in repo secrets. `NEON_API_KEY` and
`NEON_PROJECT_ID` are absent, so preview branching has silently never run — which means every
migration merged so far first executed against production. Setting those two is Jamie's to do
in the GitHub and Neon consoles: write the exact steps rather than pretending to have done
them, and say plainly in the PR that the workflow change should land alongside them, because
failing loudly with the secrets still unset will turn every PR red.

**The missing runbook.** Both workflows cite `.icm/docs/db-migrations-deploy.md` in five log
messages, as the thing an operator reads when a migration fails. That file was deleted by
`1b151fa` and `.icm/docs/` now holds only `.gitkeep`. Recover it with
`git show 1b151fa^:.icm/docs/db-migrations-deploy.md`, check it against the current workflows,
and restore a corrected version — or remove the citations. Do not leave an operator being sent
to a file that does not exist at the exact moment they need it.

Do not rewrite the workflows otherwise. They are well built — including keeping the connection
string out of the logs and cleaning up branch-scoped Vercel variables on PR close. The
parallel deploy/migrate window documented at `db-migrate-production.yml:8-13` is a known,
accepted trade-off; leave it.

Read `.icm/intake/DND-024-workflows-must-fail-loudly.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.

## Amendment — 2026-08-15, decided and closed (D27)

Jamie chose the narrow fix during the prototype interrogation: the **production**
job now hard-fails when `DATABASE_URL` is missing, and both runbooks
(`db-migrations-deploy.md`, `neon-database-setup.md`) are restored and corrected,
so all five workflow citations resolve again. The **preview** credentials
(`NEON_API_KEY` / `NEON_PROJECT_ID`) stay deliberately unset — migrations keep
first-applying against production on merge, accepted with eyes open. That
acceptance and its escape hatch (set the two values, no workflow edit needed)
are recorded in the register as D27 and in the preview workflow's header. The
"green tick while skipping" behaviour this ticket names survives only there, and
only by explicit choice.
