# DND-011 · CI job: format — add Prettier and a format check

| | |
|---|---|
| Type | chore |
| Priority | P2 |
| Size | S |

## Problem
The repo has **no formatter at all** — no `prettier` dependency, no `.prettierrc`, no
`.prettierignore`. ESLint's Next config carries almost no stylistic rules, so nothing
holds layout steady.

> **Updated 2026-08-14, after DND-006.** This ticket was written when the repo still had
> husky and lint-staged. DND-006 removed both — a pre-commit hook running eslint and
> jest locally contradicts the standing "CI is the source of truth, never run checks
> locally" rule. So there is no commit hook to wire a formatter into, and CI is the only
> gate. The `supabase/` directory it told you to ignore is gone too. Both acceptance
> boxes rewritten below.

The cost is already visible in the tree. Before DND-003 touched it, `src/app/page.tsx`
had closing tags at the wrong depth (`</h3>` and `</div>` outdented mid-JSX), mixed
2- and 4-space continuation lines, and trailing whitespace on import lines — all of it
committed and invisible to `npm run lint`. Every future PR re-litigates layout by hand
in review, and diffs carry whitespace noise that hides the real change.

This is the third job in the CI pipeline DND-010 scaffolds (lint · format · quality).

## Acceptance
- [ ] `prettier` added, with `.prettierrc` and `.prettierignore` checked in (ignore `.next/`, `out/`, `build/`, `package-lock.json`)
- [ ] `eslint-config-prettier` added last in `eslint.config.mjs` so ESLint stops fighting the formatter
- [ ] `format` (write) and `format:check` (verify) scripts in `package.json`
- [ ] A `format` job in the DND-010 workflow running `npm run format:check` on every PR and push to `main`
- [ ] ~~`lint-staged` runs `prettier --write` alongside `eslint --fix`~~ — **obsolete, DND-006 removed husky and lint-staged.** `format:check` in CI is the gate; formatting on save is an editor concern, so drop a `.vscode/settings.json` with `editor.formatOnSave` + the Prettier default formatter if you want it local (the old one was deleted — it configured Deno for a `supabase/functions` directory that never existed)
- [ ] The one-time repo-wide reformat lands as its **own commit**, separate from the tooling commit, so `git blame` stays readable and the config change is reviewable on its own
- [ ] CI green

## Prompt

Add Prettier and a CI format check to the D&D 5e Companion. Install `prettier` and
`eslint-config-prettier`; write a `.prettierrc` (match the prevailing style in `src/` —
no semicolons, single quotes, 2-space indent, 100-char width) and a `.prettierignore`.
Append `eslint-config-prettier` to `eslint.config.mjs` so its rules win over any
stylistic ESLint rules. Add `format` and `format:check` scripts, and add a `format` job
to the GitHub Actions workflow from DND-010 running `npm run format:check`. There is no
`lint-staged` block to wire into — DND-006 removed husky and lint-staged, so CI is the
only formatting gate; optionally add a `.vscode/settings.json` enabling format-on-save.

Commit the tooling first, then run `npm run format` across the repo and commit that
reformat **separately** — do not mix the two. DND-010 must land first (this adds a job
to its workflow). Read `.icm/intake/DND-011-ci-format-check.md` for context. Open a PR
on a `claude/` branch; do not run local checks — CI is the source of truth.
