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

## Part of this already landed in DND-002 — read before starting

`main` had failed to build since `4eb7413` (Sept 2025). DND-002 inventoried all 77 type
errors, repaired everything in live code, and then had to delete the worst of the dead
code to get its own build green. **Already gone, do not look for them:**

- `src/lib/pwa/offline-hooks.ts` (was 32 type errors), `src/lib/pwa/offline-hooks.test.tsx`,
  `src/lib/pwa/database.ts` (15 errors) — the IndexedDB layer. Fully orphaned; nothing
  imported them but each other.
- `src/app/api/profile/`, `src/hooks/useProfile.ts`, `src/components/ProfileSection.tsx`,
  `src/lib/supabase/profile.ts` — deleted as part of the Clerk removal, since they
  imported Clerk or existed only to bridge it to Supabase.

**Still to do here**, and now purely deletion with no type-error cleanup attached:

- `src/lib/stores/` — `characterStore.ts` / `referenceStore.ts` and their tests. Orphaned
  (only their own tests import them). DND-002 typed the zustand middleware mocks in the
  tests just enough to compile; the whole directory still goes.
- `src/lib/pwa/hooks.tsx` and its two test files — **this one is live.** The layout
  imports `PWAInstallButton`, `OfflineIndicator` and `ServiceWorkerUpdate` from it, so
  deleting it means editing `src/app/layout.tsx` too.
- `src/lib/supabase/` (client/server/admin) — now fully orphaned after the above.
- `public/sw.js`, `public/manifest.json`, `public/offline.html`, PWA icons, the `supabase/`
  directory, `src/lib/dnd-api/hooks.ts`, and the dependency removals.
- `idb` is now unused (its only consumer, `database.ts`, is gone).

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
