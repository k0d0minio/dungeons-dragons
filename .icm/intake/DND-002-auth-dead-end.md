# DND-002 · Fix the auth dead-end — middleware protects pages that don't exist

| | |
|---|---|
| Type | bug |
| Priority | P1 |
| Size | S |

## Problem
`src/middleware.ts` protects `/dashboard`, `/profile`, `/api/profile` and redirects
unauthenticated users to `/sign-in` — but none of `/dashboard`, `/profile`, or `/sign-in`
exist as pages (`src/app/` holds only the root page and API routes), so every hit on a
protected route 404s. "Authentication System" is an MVP core feature
(`.cursor/project.json` → `mvp.coreFeatures`), and the BRD requires an auth system with
"Guest mode, account migration, password recovery" (business-requirements.mdx §5.2).
Clerk is already installed and the sign-in header button works.

## Acceptance
- [ ] Unauthenticated visit to a protected route lands on a working sign-in flow (Clerk hosted or in-app pages), never a 404
- [ ] Signed-in users are not redirected to a dead page anywhere
- [ ] Middleware's protected-route list matches routes that actually exist
- [ ] CI green

## Prompt

Fix the auth dead-end in the D&D 5e Companion PWA. `src/middleware.ts` (Clerk) redirects
to `/sign-in` and protects `/dashboard` + `/profile`, but none of those pages exist, so
protected routes 404. Either add Clerk's sign-in/sign-up pages and align the protected
list with real routes, or switch to Clerk's hosted redirect — smallest honest fix wins.
Read `.icm/intake/DND-002-auth-dead-end.md` for full context. Open a PR on a `claude/`
branch; do not run local checks — CI is the source of truth.
