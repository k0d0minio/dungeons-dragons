# DND-010 · Add a CI workflow — "CI is the source of truth" needs a CI

| | |
|---|---|
| Type | chore |
| Priority | P1 |
| Size | S |

## Problem
Every ticket in this repo ends with "CI is the source of truth" — but the repo has **no
`.github/workflows/` at all**. The only automated check is whatever Vercel's build does.
There are 19 Jest test files and an ESLint config with nothing running them on push.
The doctrine needs teeth before the v1 chain (DND-006 → 009) starts landing PRs.

**This already cost us.** DND-003 (reference detail views) merged on 2026-08-13 with
zero verification: no Actions workflow existed, and the sole check — the Vercel
deployment — failed on the free-tier `api-deployments-free-per-day` quota rather than on
anything in the diff. A red PR that says nothing about the code is worse than no check,
because it reads like a signal. Raised to P1 for that reason.

This ticket is the **workflow foundation**; three sibling tickets add jobs to it and
depend on it landing first:

- DND-011 — `format` job (Prettier; no formatter exists in the repo today)
- DND-012 — `typecheck` and coverage jobs (quality assurance)
- DND-013 — database migrations on preview and production deploys

## Acceptance
- [ ] A GitHub Actions workflow runs lint, tests, and a production build on every PR and push to `main`
- [ ] The workflow is green on `main` at merge time (fix or delete tests orphaned by the DND-006 prune as part of this)
- [ ] Jobs are separately named so a failure says which gate broke, and the workflow has room for DND-011/012/013 to add theirs
- [ ] Branch protection note: ticket does not enable it — that's Jamie's click

## Prompt

Add CI to the D&D 5e Companion repo. Create a GitHub Actions workflow running
`npm run lint`, `npm test`, and `npm run build` on PRs and pushes to `main` (Node 24,
npm cache). If tests reference modules deleted by DND-006, update or remove those test
files so the suite reflects the real codebase. Read
`.icm/intake/DND-010-ci-workflow.md` for context. Open a PR on a `claude/` branch; the
workflow's own run on that PR is its proof.
