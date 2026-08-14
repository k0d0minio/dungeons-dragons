# DND-006 · The great prune — delete the offline/PWA layer, Supabase stack, and Cursor-era leftovers

| | |
|---|---|
| Type | chore |
| Priority | P1 |
| Size | M |

## Problem
The 2026-08-13 scope decisions (`.icm/docs/scope-decisions-2026-08-13.md`) resolved
DND-004: **no offline, no PWA, Supabase replaced by Neon + Drizzle**. Both orphaned
subsystems are now confirmed dead code, on top of the original Cursor/Linear leftovers:

- **Offline/PWA layer** — `src/lib/pwa/` (database.ts, hooks, offline-hooks),
  `src/lib/stores/` (characterStore, referenceStore), `public/sw.js`,
  `public/manifest.json`, `public/offline.html`, PWA icon set in `public/icons/`
  (keep anything the layout actually uses as favicon), any service-worker
  registration in `src/app/layout.tsx`, plus their test files. Deps: `idb`, `zustand`.
- **Supabase stack** — `src/lib/supabase/`, `src/app/api/profile/`,
  `src/hooks/useProfile.ts`, `src/components/ProfileSection.tsx`, the `supabase/`
  directory (config + both migrations), plus test files. Deps: `@supabase/supabase-js`,
  `@supabase/ssr`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared`, `supabase`
  (CLI). The repo README (DND-001) and CLAUDE.md references follow separately.
- **Duplicate API hook layer** — `src/lib/dnd-api/hooks.ts` (the page uses
  `swr-hooks.ts` only).
- **Cursor/Linear era** — `@linear/sdk` runtime dependency (nothing imports it);
  `.husky/pre-push` silently emptied in `39235c0` (restore a real hook or remove husky
  + lint-staged entirely); stale remote branches `origin/cursor/K0D-158-...` and
  `origin/dev` (`origin/cursor/K0D-159-...` only after DND-005 salvages it, which is
  now post-v1 — leave it).

Run this **before** DND-007 builds the Neon layer, so new code lands on clean ground.
Clerk is *not* in scope here — its removal is part of the DND-002 swap.

## This prune is now the only thing standing between the repo and a green build

`main` has failed to build since `4eb7413` (Sept 2025) — every Vercel deploy since is
red. DND-002 inventoried the wreckage and repaired everything in live code. **The 51
type errors that remain are all in files this ticket deletes:**

| File | Errors | Note |
|---|---|---|
| `src/lib/pwa/offline-hooks.ts` | 32 | Fully orphaned — nothing imports it |
| `src/lib/pwa/database.ts` | 15 | Only reachable via `offline-hooks.ts` |
| `src/lib/stores/characterStore.test.ts` | 2 | Stores are orphaned — only their tests import them |
| `src/lib/stores/referenceStore.test.ts` | 2 | ditto |

So deleting them is not just cleanup — it should take the build green on its own. Two
things to keep, both repaired by DND-002 and still live: `src/lib/pwa/hooks.tsx` is
imported by the layout (`PWAInstallButton`, `OfflineIndicator`, `ServiceWorkerUpdate`),
so removing it means editing `src/app/layout.tsx` too; and `src/lib/supabase/` is now
fully orphaned since DND-002 deleted `/api/profile`, `useProfile`, `ProfileSection` and
`src/lib/supabase/profile.ts` — the four files that couldn't survive the Clerk removal.
Adjust the acceptance list below accordingly; those are already gone.

## Acceptance
- [ ] `src/lib/pwa/`, `src/lib/stores/`, service worker, manifest, offline.html and their tests deleted; app boots with no SW registration
- [ ] `src/lib/supabase/`, `/api/profile`, `useProfile`, `ProfileSection`, `supabase/` dir and their tests deleted
- [ ] `src/lib/dnd-api/hooks.ts` deleted
- [ ] Deps removed: `idb`, `zustand`, all `@supabase/*`, `supabase`, `@linear/sdk`
- [ ] Husky either has a meaningful hook set or is removed entirely
- [ ] Remote branches `K0D-158` and `dev` deleted
- [ ] CI green

## Prompt

Prune all confirmed-dead code in the D&D 5e Companion per the 2026-08-13 scope
decisions: delete the offline/PWA layer (`src/lib/pwa/`, `src/lib/stores/`,
`public/sw.js`, `public/manifest.json`, `public/offline.html`, PWA icons, any SW
registration in layout), the Supabase stack (`src/lib/supabase/`, `src/app/api/profile/`,
`src/hooks/useProfile.ts`, `src/components/ProfileSection.tsx`, `supabase/` directory),
the duplicate `src/lib/dnd-api/hooks.ts`, and their tests. Remove deps: `idb`,
`zustand`, `@supabase/*` (all four), `supabase` CLI, `@linear/sdk`. Resolve the emptied
`.husky/pre-push` (restore or remove husky). Delete remote branches
`origin/cursor/K0D-158-...` and `origin/dev`; leave `K0D-159`. Do NOT touch Clerk —
that's DND-002. Read `.icm/intake/DND-006-dead-code-prune.md` and
`.icm/docs/scope-decisions-2026-08-13.md` for full context. Open a PR on a `claude/`
branch; do not run local checks — CI is the source of truth.
