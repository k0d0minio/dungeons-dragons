# DND-006 · Dead-code and dependency prune

| | |
|---|---|
| Type | chore |
| Priority | P2 |
| Size | S |

## Problem
Leftovers from the Cursor/Linear era and the "big changes" rewrites:

- `@linear/sdk` ships as a **runtime dependency** of the web app; nothing in `src/`
  imports it (risk only if ever used client-side with a key — currently inert).
- `.husky/pre-push` was silently emptied in `39235c0` ("vulnerability upgrade") — either
  restore a real hook or remove the husky scaffolding.
- Stale remote branches: `origin/cursor/K0D-158-...` (superseded), `origin/dev`
  (dormant, 1 commit behind); `origin/cursor/K0D-159-...` only after DND-005 salvages it.
- Duplicate API hook layer `src/lib/dnd-api/hooks.ts` — the app uses `swr-hooks.ts`
  only. (Skip if DND-004 decides to keep it.)

## Acceptance
- [ ] `@linear/sdk` removed from dependencies
- [ ] Husky either has a meaningful hook set or is removed entirely
- [ ] Superseded remote branches deleted (`K0D-158`, `dev`; `K0D-159` only post-DND-005)
- [ ] CI green

## Prompt

Prune dead weight in the D&D 5e Companion PWA. Remove the unused `@linear/sdk` runtime
dependency, resolve the emptied `.husky/pre-push` (restore or remove husky), and delete
superseded remote branches (`origin/cursor/K0D-158-...`, `origin/dev` — leave
`K0D-159` if DND-005 hasn't salvaged it yet). Leave `src/lib/dnd-api/hooks.ts` alone
unless DND-004 already decided its fate. Read `.icm/intake/DND-006-dead-code-prune.md`
for full context. Open a PR on a `claude/` branch; do not run local checks — CI is the
source of truth.
