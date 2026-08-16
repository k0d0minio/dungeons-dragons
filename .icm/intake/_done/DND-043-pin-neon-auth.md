# DND-043 · Pin the beta auth package, and decide the posture

| | |
|---|---|
| Status | ready |
| Type | chore |
| Priority | P2 |
| Size | S |
| Sources | tech lens · `package.json:19` · `package-lock.json` · `src/lib/auth/server.ts:35` |

## Problem

The entire auth boundary of a deployed app rides a `0.x` prerelease under a caret range:
`"@neondatabase/auth": "^0.5.0-beta"` (`package.json:19`).

The deployed app is stable today — the lockfile pins `0.5.0-beta` and Vercel builds from it. The
exposure is that `^0.5.0-beta` admits any `0.5.x`, and a `0.x` beta carries no semver promise, so
one stray `npm install` can silently re-resolve the session layer with nothing in CI to catch it
(there is no CI running tests — that is DND-042).

Two further points a version pin does not cover:

- **It vendors `better-auth@1.6.23` as a nested dependency in two places** — under
  `@neondatabase/auth` and under `@neondatabase/auth-ui`. A `better-auth` advisory cannot be
  patched here; it waits on Neon publishing a new release.
- **`NEON_AUTH_BASE_URL` points at a hosted beta service** which can change behaviour with no
  package change at all. No pin protects against that.

The pin is a one-line change. The posture — whether this stays on the beta channel and what would
trigger moving off it — is an open question in the register and Jamie's to answer.

## Acceptance

- [ ] `@neondatabase/auth` is pinned exactly, not caret-ranged
- [ ] The same is done for `@neondatabase/auth-ui` if it is a direct dependency
- [ ] A comment or note records why it is pinned, so a future dependency sweep does not "helpfully"
      widen it
- [ ] The nested `better-auth` situation is written down somewhere durable
- [ ] Any upgrade path or watch trigger Jamie decides on is recorded in `.icm/project.md`
- [ ] CI green

## Prompt

Pin `@neondatabase/auth` exactly in the D&D 5e Companion, and write down the beta posture.

`package.json:19` has `"@neondatabase/auth": "^0.5.0-beta"` — a `0.x` prerelease carrying the
whole auth boundary of a deployed app, under a caret range that admits any `0.5.x`. The lockfile
currently resolves `0.5.0-beta` and Vercel builds from it, so nothing is broken; the risk is that
one `npm install` silently re-resolves the session layer, with no CI tests to catch it (DND-042 is
the ticket that adds those). Pin it exactly, and do the same for `@neondatabase/auth-ui` if it is
a direct dependency. Leave a comment saying why, so a future dependency sweep does not widen it
back.

Two things worth writing down while you are looking, because they are invisible from
`package.json`. The package vendors `better-auth@1.6.23` as a **nested** dependency in two places
— under `@neondatabase/auth` and under `@neondatabase/auth-ui` — so a `better-auth` advisory
cannot be patched in this repo and waits on Neon. And `NEON_AUTH_BASE_URL`
(`src/lib/auth/server.ts:35`) points at a hosted beta service whose behaviour can change with no
package change at all. Neither is a bug to fix; both are facts a future session should not have to
rediscover. Put them in a comment near the construction point or in `.icm/docs/`.

There is an open question in `.icm/project.md` about whether this stays on the beta channel and
what would trigger moving off it. That is Jamie's to answer, not yours — if he has answered by the
time you pick this up, record it in the register's decisions table. Do not migrate auth in this
ticket.

Read `.icm/intake/DND-043-pin-neon-auth.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
