# DND-042 · A CI that actually gates the merge

| | |
|---|---|
| Status | ready |
| Type | chore |
| Priority | P2 |
| Size | M |
| Sources | tech lens · `.github/workflows/` · `package.json:5-13` · `jest.config.js:27-34` |

## Problem

Every ticket in this repo ends with "CI is the source of truth". There is no CI that checks the
code. `.github/workflows/` holds two database workflows and nothing else — no job runs `jest`,
`eslint` or `tsc` on any push or pull request.

So a green PR today means the Vercel build compiled. That is now weaker than it sounds: **Next 16
dropped the build-time ESLint step along with `next lint`**, so the Vercel build does not lint
even incidentally. Twenty-one test files and an ESLint config exist with nothing running them.

Three specifics:

- **No `typecheck` script.** `package.json` has no entry, so the only thing that ever runs `tsc`
  is `next build` — late, slow, and bundled with everything else, surfacing a type error as a
  failed build rather than a named failing check.
- **Coverage thresholds that have never gated anything.** `jest.config.js:27-34` declares
  `coverageThreshold.global` at 85% branches / 95% functions / 90% lines / 90% statements. But
  `"test": "jest"` runs plain, and thresholds only apply under `--coverage`. Those four numbers
  have never been enforced, and turning them on as-is would very likely wedge CI red on day one.
- **No formatter at all** — no `prettier` dependency, no config. ESLint's Next config carries
  almost no stylistic rules, so nothing holds layout steady and every PR re-litigates whitespace
  in review. Note there is no commit hook to wire a formatter into, and there must not be: this
  repo's standing rule is never to run checks locally.

The honest coverage move is to **measure the real baseline first**, set the gate at or just under
it, and ratchet up — not to switch on aspirational numbers. That is cleaner after DND-039 deletes
`src/lib/dnd-api/client.ts` and its 186-line test, which currently tests code no user reaches and
distorts the number. `collectCoverageFrom` also does not exclude `src/components/ui/**`, which is
generated shadcn code nobody wrote.

## Acceptance

- [ ] A CI workflow runs on pull requests and on pushes to `main`
- [ ] It runs the test suite, ESLint and a typecheck, each as a distinguishable job or step
- [ ] A `typecheck` script exists in `package.json`
- [ ] Coverage thresholds reflect a measured baseline, not aspiration, with a note on intent to ratchet
- [ ] `collectCoverageFrom` excludes generated shadcn components
- [ ] A formatter is added, checked in CI, with no local commit hook
- [ ] A failing test, lint error or type error turns the check red
- [ ] Node version is pinned consistently — there is no `.nvmrc` or `engines` field today
- [ ] CI green

## Prompt

Give the D&D 5e Companion a CI workflow that actually gates a merge. The repo's standing rule is
"CI is the source of truth", and today nothing checks the code — `.github/workflows/` holds only
the two database workflows, and Next 16 dropped the build-time ESLint step, so the Vercel build
does not even lint incidentally.

Add a workflow running on pull requests and pushes to `main`, with test, lint and typecheck as
separate named jobs or steps so a failure says which one. Add a `typecheck` script to
`package.json` — there is none, so the only thing that ever runs `tsc` is `next build`. Pin the
Node version properly: there is no `.nvmrc` and no `engines` field, so the existing workflows'
`node-version: 22` and Vercel's default are pinned independently and free to drift.

**Coverage needs judgement, not a switch.** `jest.config.js:27-34` declares thresholds of
85/95/90/90 which have never run — `"test": "jest"` is plain, and thresholds only apply under
`--coverage`. Do not just turn them on; they are near-certainly unmet and would wedge CI red
immediately. Measure the real baseline, set the gate at or just under it, and leave a comment
saying the intent is to ratchet up. Two things make that number more honest: land **after
DND-039**, which deletes `src/lib/dnd-api/client.ts` and its 186-line test (dead code that no user
reaches), and exclude `src/components/ui/**` from `collectCoverageFrom` — generated shadcn
components nobody wrote.

**Add a formatter** — Prettier, checked in CI. **Do not add a commit hook.** DND-006 deliberately
removed husky and lint-staged because a pre-commit hook running checks locally contradicts this
repo's standing rule. CI is the only gate.

Expect the first run to be red, and treat that as the ticket's real work: whatever lint, type or
test failures have accumulated with nothing watching are yours to fix or explicitly waive here.
Say in the PR which you did.

Related: DND-024 fixes the database workflows reporting success when they skip their job. Same
principle, different files — do not duplicate its changes.

Read `.icm/intake/DND-042-ci-workflow.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
