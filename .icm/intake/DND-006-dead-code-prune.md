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
- [x] `src/lib/pwa/`, `src/lib/stores/`, service worker, manifest, offline.html and their tests deleted; app boots with no SW registration
- [x] `src/lib/supabase/`, `/api/profile`, `useProfile`, `ProfileSection`, `supabase/` dir and their tests deleted
- [x] `src/lib/dnd-api/hooks.ts` deleted
- [x] Deps removed: `idb`, `zustand`, all `@supabase/*`, `supabase`, `@linear/sdk`
- [x] Husky either has a meaningful hook set or is removed entirely
- [ ] Remote branches `K0D-158` and `dev` deleted — **blocked, needs Jamie** (see below)
- [x] CI green (Vercel deploy succeeded on the prune commit)

## Resolution notes (2026-08-14)

Three things the ticket's inventory had wrong or left open, decided while pruning:

- **`@linear/sdk` was not orphaned.** `src/app/error.tsx` — the live App Router error
  boundary — imported `LinearClient` and auto-filed a Linear ticket on every production
  error. Removing the dep meant rewriting the boundary: it now logs to the console and
  shows the message/digest, with the existing "Go Back" plus a "Try again" wired to the
  `reset` prop that was previously accepted and ignored. This also drops
  `NEXT_PUBLIC_LINEAR_API_KEY` / `NEXT_PUBLIC_LINEAR_TEAM_ID`, a Linear API key that was
  being shipped to the browser bundle via the `NEXT_PUBLIC_` prefix — worth revoking on
  Linear's side regardless, since it was public to anyone who loaded the app.
- **Husky removed entirely**, not restored. `.husky/pre-push` turned out to have been
  deleted outright in `39235c0`, not emptied; only `pre-commit` (`npx lint-staged`)
  survived, and running eslint + jest on commit contradicts the standing "CI is the
  source of truth, never run checks locally" rule. `husky`, `lint-staged`, the `prepare`
  script and the `lint-staged` config block all go; the CI tickets (DND-010/011/012)
  own this ground now.
- **`.vscode/settings.json` deleted** — it existed only to point Deno at
  `supabase/functions` (a directory that never existed) and set the Deno extension as
  the default TypeScript formatter repo-wide.

Also swept, as part of the same subsystems: the unused `createOfflineSpell` /
`createOfflineEquipment` helpers in `dnd-api/client.ts`, the `/sw.js` cache header in
`next.config.ts`, and the service-worker / IndexedDB / Cache / Notification / Supabase
mocks in `jest.setup.js`.

Untouched deliberately: `README.md` and `CLAUDE.md` references (DND-001), Clerk
(DND-002), `origin/cursor/K0D-159-...` (DND-005).

**Still open — the branch deletions.** Ref deletion returns HTTP 403 through the agent
git proxy, and the GitHub MCP server exposes no delete-branch tool, so this one needs
Jamie's hands:

```
git push origin --delete cursor/K0D-158-set-up-nextjs-app-with-supabase-integration-46cc dev
```

Once those are gone this ticket is fully done and can be `git mv`'d to `_done/`.

**Worth knowing about "CI green":** the only check on the PR is the Vercel deploy, so a
green tick means *the build compiles* — nothing runs `jest` or `eslint` on CI yet. This
prune deleted four test files and rewrote `jest.setup.js`, and no CI job verified the
remaining suite. That gap is DND-012's to close.

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
