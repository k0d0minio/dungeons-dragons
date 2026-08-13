# DND-011 · CI job: format — add Prettier and a format check

| | |
|---|---|
| Type | chore |
| Priority | P2 |
| Size | S |

## Problem
The repo has **no formatter at all** — no `prettier` dependency, no `.prettierrc`, no
`.prettierignore`, and nothing in `lint-staged` beyond `eslint --fix`. ESLint's Next
config carries almost no stylistic rules, so nothing holds layout steady.

The cost is already visible in the tree. Before DND-003 touched it, `src/app/page.tsx`
had closing tags at the wrong depth (`</h3>` and `</div>` outdented mid-JSX), mixed
2- and 4-space continuation lines, and trailing whitespace on import lines — all of it
committed and invisible to `npm run lint`. Every future PR re-litigates layout by hand
in review, and diffs carry whitespace noise that hides the real change.

This is the third job in the CI pipeline DND-010 scaffolds (lint · format · quality).

## Acceptance
- [ ] `prettier` added, with `.prettierrc` and `.prettierignore` checked in (ignore `.next/`, `out/`, `build/`, `package-lock.json`, `supabase/` until the DND-006 prune removes it)
- [ ] `eslint-config-prettier` added last in `eslint.config.mjs` so ESLint stops fighting the formatter
- [ ] `format` (write) and `format:check` (verify) scripts in `package.json`
- [ ] A `format` job in the DND-010 workflow running `npm run format:check` on every PR and push to `main`
- [ ] `lint-staged` runs `prettier --write` alongside `eslint --fix`
- [ ] The one-time repo-wide reformat lands as its **own commit**, separate from the tooling commit, so `git blame` stays readable and the config change is reviewable on its own
- [ ] CI green

## Prompt

Add Prettier and a CI format check to the D&D 5e Companion. Install `prettier` and
`eslint-config-prettier`; write a `.prettierrc` (match the prevailing style in `src/` —
no semicolons, single quotes, 2-space indent, 100-char width) and a `.prettierignore`.
Append `eslint-config-prettier` to `eslint.config.mjs` so its rules win over any
stylistic ESLint rules. Add `format` and `format:check` scripts, wire `prettier --write`
into the `lint-staged` block, and add a `format` job to the GitHub Actions workflow from
DND-010 running `npm run format:check`.

Commit the tooling first, then run `npm run format` across the repo and commit that
reformat **separately** — do not mix the two. DND-010 must land first (this adds a job
to its workflow); DND-006's prune may remove `supabase/`, so don't spend effort
formatting files scheduled for deletion. Read `.icm/intake/DND-011-ci-format-check.md`
for context. Open a PR on a `claude/` branch; do not run local checks — CI is the source
of truth.
