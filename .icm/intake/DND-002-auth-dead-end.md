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
removed entirely**, replaced by **Neon Auth** — Neon's managed auth (Stack Auth under
the hood) whose users sync into `neon_auth.users_sync` inside the same Neon database
the app uses, so `characters` rows can foreign-key the user id directly.

Depends on DND-007 (the Neon + Drizzle data layer must exist first — Neon Auth is
enabled on that same Neon project).

## Acceptance
- [ ] `@clerk/nextjs` removed from dependencies; no Clerk imports remain (`src/middleware.ts`, `src/app/layout.tsx`, `src/components/CustomUserButton.tsx`)
- [ ] Neon Auth wired in: working sign-up / sign-in / sign-out, mobile-friendly
- [ ] Character routes (per DND-008/009) require a session; public reference browsing stays public
- [ ] Middleware (if any remains) only references routes that exist — no redirect ever lands on a 404
- [ ] No secrets in git — Neon Auth keys via env vars only
- [ ] CI green

## Prompt

Replace Clerk with Neon Auth in the D&D 5e Companion. Remove `@clerk/nextjs` and all
Clerk usage (`src/middleware.ts`, layout provider, `CustomUserButton`). Enable Neon Auth
on the project's Neon database (users sync into `neon_auth.users_sync`) and wire its
Next.js SDK: sign-up/sign-in/sign-out pages, session available in server components and
route handlers, character routes protected, reference browsing public. Env vars only for
keys. Read `.icm/intake/DND-002-auth-dead-end.md` and
`.icm/docs/scope-decisions-2026-08-13.md` for full context; DND-007 must be done first.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
