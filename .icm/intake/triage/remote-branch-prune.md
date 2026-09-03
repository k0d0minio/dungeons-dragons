# Stub: Prune the dead remote branches

- lane: chore
- found-by: ticket-scout, 2026-08-29
- priority: P2
- size: S
- blocked: this session's GitHub credential cannot delete refs — `git push origin
  --delete` returns HTTP 403 from GitHub (not the egress proxy: the response carries an
  `X-Github-Request-Id` and the proxy's `recentRelayFailures` is empty), and the GitHub
  MCP server exposes no ref-deletion tool. Verification below is complete; only the
  delete itself is outstanding.

70 remote branches other than `main`. **Every one maps to a pull request** — 66 merged,
4 closed-unmerged — and there are **zero open PRs**, so nothing in flight is stranded.
Verified 2026-09-03 against a full (un-shallowed) clone.

69 are verified dead. One is held: `claude/dnd-campaigns-substrate-awdt22` carries a file
that never landed anywhere — see `triage/migrations-additive-guard.md`.

## What was verified, and how

- **66 branches with a merged PR.** 63 have `git cherry origin/main <branch>` clean —
  every commit's patch-id has an equivalent in `main`. The other three (`#68`
  `dm-reveal-controls-en69ch`, `#73` `dm-tracker-stat-blocks-ldyric`, `#64`
  `locations-handouts-storage-hdm49d`) report unique patch-ids because the squash landed
  on a base that had moved; each was checked file-by-file against its own squash commit
  and every touched path is byte-identical there. `locations-handouts-storage` showed two
  paths differing (`.icm/project.md`, `src/lib/db/campaigns.test.ts`) — in the *reverse*
  direction: content `#62` added that the branch's older base predates, not content the
  branch is owed.
- **3 closed-unmerged branches, each superseded:**
  - `claude/asi-and-feats` (`#53`) → `#54` `asi-feat-level-up-9w4alv` shipped the same
    feature as `featChoices` (`drizzle/0009_asi-and-feats.sql` adds `feat_choices` where
    the branch added `asi_choices`), its `general-feats.json` is subsumed by main's
    richer `feats.json`, and the epic's stubs are already in `srd-2024-migration/_done/`.
  - `claude/dnd5e-companion-readme-2k26e4` (`#3`) → `#7` rewrote the README instead. The
    branch's version sells an offline PWA, which D28 explicitly retired.
  - `cursor/K0D-159-…` (`#2`, 2025-09-25) → all 12 of its source files are absent from
    `main`; the Cursor-era JSX prototype was deleted by `#6` and D42.

## To finish

Tips were recorded before the attempt, so any delete is reversible with
`git push origin <sha>:refs/heads/<name>`. Run from a checkout with delete rights:

```sh
git push origin --delete \
  $(grep -v '^#' .icm/docs/remote-branch-prune-list.txt | awk 'NF{print $1}')
```

The 69 names are in `.icm/docs/remote-branch-prune-list.txt`, with tip SHAs, so the list
does not have to be re-derived.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/remote-branch-prune.md` — the verification is already done and the 69
verified-dead branch names, with their tip SHAs, are in
`.icm/docs/remote-branch-prune-list.txt`. Confirm you have a GitHub credential that can
delete refs (a plain `git push origin --delete <one-branch>` that does not 403), then
delete all 69 and report what was removed. Do **not** delete
`claude/dnd-campaigns-substrate-awdt22` — it is held; see
`.icm/intake/triage/migrations-additive-guard.md` for why.
