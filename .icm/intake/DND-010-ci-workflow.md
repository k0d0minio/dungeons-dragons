# DND-010 · Add a CI workflow — "CI is the source of truth" needs a CI

| | |
|---|---|
| Type | chore |
| Priority | P2 |
| Size | S |

## Problem
Every ticket in this repo ends with "CI is the source of truth" — but the repo has **no
`.github/workflows/` at all**. The only automated check is whatever Vercel's build does.
There are 16 Jest test files and an ESLint config with nothing running them on push.
The doctrine needs teeth before the v1 chain (DND-006 → 009) starts landing PRs.

## Acceptance
- [ ] A GitHub Actions workflow runs lint, tests, and a production build on every PR and push to `main`
- [ ] The workflow is green on `main` at merge time (fix or delete tests orphaned by the DND-006 prune as part of this)
- [ ] Branch protection note: ticket does not enable it — that's Jamie's click

## Prompt

Add CI to the D&D 5e Companion repo. Create a GitHub Actions workflow running
`npm run lint`, `npm test`, and `npm run build` on PRs and pushes to `main` (Node 24,
npm cache). If tests reference modules deleted by DND-006, update or remove those test
files so the suite reflects the real codebase. Read
`.icm/intake/DND-010-ci-workflow.md` for context. Open a PR on a `claude/` branch; the
workflow's own run on that PR is its proof.
