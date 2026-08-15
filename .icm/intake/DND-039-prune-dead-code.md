# DND-039 · Prune the dead code, dead deps and dead config

| | |
|---|---|
| Status | ready |
| Type | chore |
| Priority | P2 |
| Size | S |
| Sources | tech lens · data lens · ticket-scout · `src/lib/dnd-api/client.ts` · `src/lib/dnd-api/swr-hooks.ts:430,450,610,630` · `package.json:58,68` · `next.config.ts:27-42` · `.vscode/*` |

## Problem

Several things in this repo look load-bearing and are not. Each one costs the next session time,
and two of them are actively misleading.

**`src/lib/dnd-api/client.ts` — 237 lines of dead API client.** `DndApiClient` advertises an
in-memory 24-hour cache and is imported by exactly one file: its own test
(`client.test.ts`, 186 lines). Real fetching goes through
`src/lib/dnd-api/swr-hooks.ts:7` to the route handlers. It reads like the app's caching layer,
so anyone adding caching reaches for it first — DND-020's ticket had to explicitly warn against
it. Roughly a tenth of the 21-file test suite tests code no user reaches, which will also distort
the coverage baseline DND-042 sets.

**Four SWR hooks point at routes that do not exist.** `useFeatures`, `useFeature`, `useWeapons`
and `useArmor` (`swr-hooks.ts:430,450,610,630`) fetch `/api/dnd5e/features`,
`/api/dnd5e/features/{index}`, `/api/dnd5e/equipment-categories/weapon` and
`/equipment-categories/armor`. None of those route files exist. They are re-exported from the
public `dndApiHooks` object at `:727-754`, so they read as supported surface and will 404 on
first use.

**Dead dependencies and config.** `vercel@^48.1.6` is a devDependency referenced by nothing —
both workflows call the Vercel REST API with `curl` — yet `npm ci` installs its whole tree on
every CI run. `@types/uuid` with no `uuid`. `next.config.ts:27-42` whitelists two dnd5eapi.co
paths in `images.remotePatterns` for a `next/image` the app never imports. The five Next.js
starter SVGs in `public/` are unreferenced.

**Cursor and Supabase leftovers survived DND-006.** `.vscode/extensions.json` recommends
`denoland.vscode-deno`, for a `supabase/functions` directory that no longer exists.
`.vscode/tasks.json` offers "Run Test Suite" and "Run Test Coverage" tasks that directly
contradict this repo's standing rule never to run checks locally. `.gitignore` still carries a
`/.clerk/` entry from the retired Clerk era.

## Acceptance

- [ ] `src/lib/dnd-api/client.ts` and its test are deleted
- [ ] The four hooks pointing at non-existent routes are resolved — deleted, or their routes built
- [ ] `vercel`, `@types/uuid` and `tailwindcss-animate` are gone from `package.json` if still present
- [ ] `images.remotePatterns` and the unreferenced `public/` SVGs are removed
- [ ] `.vscode/` no longer recommends Deno or offers local test tasks
- [ ] The `/.clerk/` gitignore entry is gone
- [ ] Nothing that is actually used is removed — verify each by grep before deleting
- [ ] CI green

## Prompt

Delete the dead code, dead dependencies and dead config in the D&D 5e Companion. Everything here
is verified unused, but **grep each one yourself before deleting** — this ticket was written from
a scan and the tree may have moved.

1. **`src/lib/dnd-api/client.ts` and `src/lib/dnd-api/client.test.ts`.** A 237-line API client
   with a 24-hour in-memory cache, imported only by its own test. It is actively harmful: it
   looks like the app's caching layer, so anyone implementing caching reaches for it first. Real
   fetching goes through `swr-hooks.ts` to the route handlers.

2. **Four hooks fetching routes that do not exist** — `useFeatures`, `useFeature`, `useWeapons`,
   `useArmor` at `src/lib/dnd-api/swr-hooks.ts:430,450,610,630`, re-exported at `:727-754`.
   **Check the board before deleting these.** DND-034 (attacks) wants class features and DND-035
   (inventory) wants the weapon and armour categories — if either has landed or is in flight, the
   right move is to build the missing routes instead, following DND-020's caching pattern.
   Whichever way, they must not stay as exported hooks that 404.

3. **Dead dependencies.** `vercel@^48.1.6` (devDependency, referenced by nothing — both workflows
   use `curl` against the REST API, and it inflates every `npm ci`), `@types/uuid` with no
   `uuid`, and `tailwindcss-animate` if DND-019 has not already removed it.

4. **Dead config.** `next.config.ts:27-42` whitelists dnd5eapi.co paths in
   `images.remotePatterns` for a `next/image` that is never imported. The five Next.js starter
   SVGs in `public/`. The `/.clerk/` line in `.gitignore`.

5. **Cursor and Supabase leftovers.** `.vscode/extensions.json` recommends `denoland.vscode-deno`
   for a deleted `supabase/functions` directory. `.vscode/tasks.json` offers "Run Test Suite" and
   "Run Test Coverage" — local check tasks that contradict this repo's standing rule that CI is
   the source of truth. Remove both.

Read `.icm/intake/DND-039-prune-dead-code.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
