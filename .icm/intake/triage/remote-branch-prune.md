# Stub: Prune the dead remote branches

- lane: chore
- found-by: ticket-scout, 2026-08-29
- priority: P2
- size: S

~38 remote branches, all merged or superseded (the apparently-unmerged tips are
empty merge topology; the three with unique commits — `dnd5e-companion-readme`,
`dnd5e-detail-views`, `dnd-campaigns-substrate` — are pre-2026-08-15 work that
shipped via other branches), plus one fossil from the retired Cursor/Linear era
(`cursor/K0D-159-…`, 2025-09-25). Nothing in-flight is stranded; this is hygiene
only. Deleting remote branches is irreversible — verify each is merged/superseded
before deleting, and list what was pruned in the PR description or commit body.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/remote-branch-prune.md`. For each remote branch other than
`main`: verify its content is merged or superseded (`git cherry`, merge-base
checks); delete verified-dead branches via `git push origin --delete`; leave
anything ambiguous and list it for Jamie instead. Record the full pruned list.
No code changes; no PR needed for branch deletion itself — report what was done.
