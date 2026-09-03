# Stub: Sign-in drops where you were going

- lane: bug
- found-by: apple-redesign/sign-in-wall, 2026-08-29
- priority: P2
- size: S

The wall redirects flat. `getAuth().middleware({ loginUrl: SIGN_IN_PATH })` sends
every unauthenticated request to `/auth/sign-in` with no return destination —
verified against a production build: `GET /campaigns/join/RIME42` answers
`307 location: /auth/sign-in`, nothing else. After signing in the player lands on
their character (D33) and has to find the link again.

This predates D34 — it was already true of `/characters`, `/dm`, `/account` and
`/campaigns` — but D34 put every page behind the wall, so it is now the first
experience of every shared link: the campaign join link (DND-046) is the one that
stings, since a DM sends it to someone who is by definition signed out.

Whether Neon Auth's middleware can carry a return path at all is the open
question — `NeonAuthMiddlewareConfig` exposes only `loginUrl`, so the answer may
be to stop delegating the redirect and build it in `src/proxy.ts`, or to hold the
destination in a short-lived cookie the sign-in page reads.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/sign-in-return-destination.md`. Make the sign-in wall in
`src/proxy.ts` carry the destination a signed-out visitor asked for, and land them
back on it after sign-in — the campaign join link (`/campaigns/join/[code]`) is the
case that matters. Check first whether `@neondatabase/auth`'s middleware can do it
(`NeonAuthMiddlewareConfig` looks like `loginUrl` only, so probably not) before
building the redirect in the proxy. Whatever carries the destination must only ever
be a path on this origin — an open redirect here is a phishing hole. Leave the
exception list in `isPublicPath` alone. Add tests. PR on a `claude/` branch; CI
green only.
