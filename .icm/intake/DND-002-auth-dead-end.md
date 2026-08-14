# DND-002 · Replace Clerk with Neon Auth (and fix the auth dead-end)

| | |
|---|---|
| Type | feature |
| Priority | P1 |
| Size | M |

## Problem
Two problems, one swap. First, the original dead-end: `src/middleware.ts` (Clerk)
protects `/dashboard`, `/profile`, `/api/profile` and redirects unauthenticated users to
`/sign-in` — none of those pages exist, so every protected hit 404s. Second, the
2026-08-13 scope decision (`.icm/docs/scope-decisions-2026-08-13.md`): **Clerk is
removed entirely**, replaced by **Neon Auth** — Neon's managed auth whose users live in
the `neon_auth` schema inside the same Neon database the app uses, so `characters` rows
can foreign-key the user id directly.

Nominally depends on DND-007 (Neon + Drizzle). In practice the dependency is soft: Neon
Auth manages its own user store, so auth works before the data layer exists. Only the
`characters.owner_id` foreign key needs DND-007, and `characters` doesn't exist yet.
DND-002 was therefore built ahead of DND-007.

## Two findings that changed the plan

Both written up in `.icm/docs/neon-auth-setup.md`:

1. **Legacy Neon Auth is closed to new projects.** This ticket was written against Neon
   Auth as it was — Stack Auth under the hood, users in `neon_auth.users_sync`. Neon's
   docs now say that version is "for existing users only (not available for new
   projects)". The current product is **Managed Better Auth** (`@neondatabase/auth`),
   storing users in `neon_auth.user` / `session` / `account`. Same guarantees, different
   table name. **DND-007 must reference `neon_auth.user`, not `neon_auth.users_sync`.**
2. **`@neondatabase/auth` requires Next.js ≥ 16** in every published version. The app was
   on 15.5.9, so this ticket carried the upgrade to 16.3.0. Visible consequence:
   `src/middleware.ts` → `src/proxy.ts`, Next 16's name for the same file.

## Acceptance
- [x] `@clerk/nextjs` removed from dependencies; no Clerk imports remain (`src/middleware.ts`, `src/app/layout.tsx`, `src/components/CustomUserButton.tsx`)
- [x] Neon Auth wired in: working sign-up / sign-in / sign-out, mobile-friendly
- [x] Character routes (per DND-008/009) require a session; public reference browsing stays public
- [x] Middleware (if any remains) only references routes that exist — no redirect ever lands on a 404
- [x] No secrets in git — Neon Auth keys via env vars only
- [ ] CI green — **blocked on DND-006**, not on this ticket. `main` has been red since
      `4eb7413` (Sept 2025). DND-002 repaired every type error in live code; the 51 that
      remain are all in the orphaned offline/store layer DND-006 deletes. See that ticket.
- [ ] Jamie enables Neon Auth in the Neon Console and sets the two env vars (`.icm/docs/neon-auth-setup.md`) — code is inert until then

## Prompt

Replace Clerk with Neon Auth in the D&D 5e Companion. Remove `@clerk/nextjs` and all
Clerk usage (`src/middleware.ts`, layout provider, `CustomUserButton`). Enable Neon Auth
on the project's Neon database (users sync into `neon_auth.users_sync`) and wire its
Next.js SDK: sign-up/sign-in/sign-out pages, session available in server components and
route handlers, character routes protected, reference browsing public. Env vars only for
keys. Read `.icm/intake/DND-002-auth-dead-end.md` and
`.icm/docs/scope-decisions-2026-08-13.md` for full context; DND-007 must be done first.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
