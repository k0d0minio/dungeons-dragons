# DND-012 · CI job: quality assurance — typecheck and an honest coverage gate

| | |
|---|---|
| Type | chore |
| Priority | P2 |
| Size | M |

## Problem
Two quality signals exist on paper and run nowhere.

**No typecheck script.** `package.json` has no `typecheck` entry, so the only thing that
ever runs `tsc` is `next build` — late, slow, and bundled with everything else. A type
error surfaces as a failed build rather than a named failing check.

**Coverage thresholds nothing enforces.** `jest.config.js` declares
`coverageThreshold.global` at 85% branches / 95% functions / 90% lines / 90% statements,
but `npm test` runs plain `jest` — thresholds only apply under `--coverage`, and only
`test:coverage` passes that flag. Nothing in the repo or (once DND-010 lands) in CI calls
it. Those four numbers have never gated anything, and across 19 test files spanning
subsystems scheduled for deletion (DND-006), they are near-certainly unmet today.
Switching them on as-is would wedge CI red on day one.

So this ticket is two jobs plus one judgement call: establish the **real** coverage
baseline, then set thresholds at or just under it and ratchet up, rather than keeping
aspirational numbers that have to be bypassed.

## Acceptance
- [ ] `typecheck` script (`tsc --noEmit`) in `package.json`
- [ ] A `typecheck` job in the DND-010 workflow, running on every PR and push to `main`
- [ ] A `test` job running `npm run test:coverage` so the thresholds actually gate
- [ ] Coverage baseline measured **after** the DND-006 prune and recorded in the PR body; `coverageThreshold` reset to that baseline (rounded down), not the current aspirational values
- [ ] `collectCoverageFrom` excludes what the app does not ship — generated files, `src/components/ui/**` (vendored shadcn primitives), and anything DND-006 deletes
- [ ] Coverage summary posted or visible in the job output, so a drop is legible without downloading artifacts
- [ ] CI green

## Prompt

Add the quality-assurance jobs to the D&D 5e Companion's CI. Add a `typecheck` script
running `tsc --noEmit` and a matching GitHub Actions job in the DND-010 workflow. Add a
`test` job running `npm run test:coverage` so `jest.config.js`'s `coverageThreshold`
gates merges instead of sitting inert.

Before switching the gate on, measure the actual coverage and set `coverageThreshold` to
that measured baseline rounded down — the current 85/95/90/90 values were never enforced
and will not hold. Record the measured numbers in the PR body so the starting point is
on record. Narrow `collectCoverageFrom` to code the app actually ships: exclude
`src/components/ui/**` (vendored shadcn primitives) and anything the DND-006 prune
removes.

DND-010 must land first (this adds jobs to its workflow), and DND-006 should land before
the baseline is measured so the number reflects the real codebase. Whether to ratchet
thresholds upward over time, and how fast, is Jamie's call — propose a step but don't
tick that decision. Read `.icm/intake/DND-012-ci-quality-assurance.md` for context. Open
a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
