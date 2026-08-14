# Neon Auth setup — runbook (DND-002)

What a human has to do once, in the Neon Console and in Vercel, before the auth
wired up in DND-002 actually authenticates anyone. The code is already in place
and degrades quietly until these land: `getAuth()` builds the Neon Auth client
lazily, so the app builds and the public reference browser keeps working with
none of these variables set.

## 1. Enable Neon Auth on the database

Neon Console → the D&D Companion project → the branch → **Auth** → enable.

Neon provisions a managed auth service and creates the `neon_auth` schema **in
the same database the app uses**. That is the whole point of picking Neon Auth:
once DND-007 lands, `characters.owner_id` can reference the user id living in
that schema, in the same Postgres, with no cross-service join.

## 2. Copy the two env vars

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEON_AUTH_BASE_URL` | Neon Console, after enabling Auth | Base URL of the provisioned auth service |
| `NEON_AUTH_COOKIE_SECRET` | You generate it | Signs the session cookie. **32+ characters** or the app throws. `openssl rand -base64 32` |

Set both in `.env.local` for local dev and in Vercel project settings for
preview and production. Neither belongs in git — `.gitignore` covers `.env*`,
and no key is ever sent to the browser: the client talks only to this app's own
`/api/auth/*` proxy.

`NEON_AUTH_COOKIE_SECRET` should differ between production and preview.

## 3. Add the trusted domains — **not optional**

**Neon Console → Auth → Configuration → Domains.** Add each origin with its
protocol and no trailing slash:

| Origin | Why |
|---|---|
| `https://dungeons-dragons.jamienisbet.com` | The production custom domain |
| `https://dungeons-dragons-mafra-kodominio.vercel.app` | The Vercel production domain, if you ever use it directly |

`localhost` needs no entry — Neon allows development origins automatically, on
any port. Preview deployments do need one; wildcards are supported, so something
like `https://*.vercel.app` covers them, though it is a broad allowance and only
worth adding if you actually want to sign in on previews.

**This step was missing from this runbook until 2026-08-14, and it is what an
account is gated behind.** Neon Auth validates the browser's `Origin` against
this list on every state-changing call. With the list empty, the app looks
completely healthy — the sign-up form renders, `/api/auth/ok` returns
`{"ok":true}`, `/api/auth/get-session` returns `null` — and then the submit
fails:

```
POST /api/auth/sign-up/email  ->  403
{"message":"Invalid origin","code":"INVALID_ORIGIN"}
```

Note the shape of that failure: only the *write* paths are origin-checked, so
every read-only health check passes while sign-up is impossible. If you see a
403 `INVALID_ORIGIN` anywhere, it is this list, not the env vars and not the
code.

## 4. What you get

Once the domains are in: email + password sign-up, sign-in, sign-out, password
reset, email verification, and the account settings pages.

Social sign-in is deliberately off. `src/app/providers.tsx` passes no `social`
prop, because a Google button that errors until an OAuth app is configured in
the Neon Console is worse than no button. To turn it on: configure the provider
in the Console, then add `social={{ providers: ['google'] }}` to
`NeonAuthUIProvider`.

## Where things live

| Thing | File |
|---|---|
| Server auth instance, session helpers | `src/lib/auth/server.ts` |
| Browser auth client | `src/lib/auth/client.ts` |
| Auth API proxy (`/api/auth/*`) | `src/app/api/auth/[...path]/route.ts` |
| Route protection | `src/proxy.ts` (Next 16's `middleware.ts`) |
| UI context | `src/app/providers.tsx` |
| Sign-in / sign-up / sign-out / reset views | `src/app/auth/[path]/page.tsx` |
| Account settings views | `src/app/account/[path]/page.tsx` |

## Two things that changed the DND-002 plan

**Legacy Neon Auth is closed.** DND-002 was written against Neon Auth as it was
— Stack Auth under the hood, users synced into `neon_auth.users_sync`. Neon's
docs now say that version is *"for existing users only (not available for new
projects)"*. The current product is **Managed Better Auth** (`@neondatabase/auth`),
which stores users in `neon_auth.user` / `neon_auth.session` /
`neon_auth.account` rather than a `users_sync` mirror. Everything DND-002
actually wanted — managed auth, users in the app's own Postgres, foreign-keyable
user ids — still holds; only the table name changed. **DND-007 should reference
`neon_auth.user`, not `neon_auth.users_sync`.**

**It forced Next.js 16.** Every published version of `@neondatabase/auth`,
including the first beta, declares a `next >= 16` peer dependency. The app was
on 15.5.9, so DND-002 carried the upgrade to 16.3.0 with it. The visible
consequence in this repo is that `src/middleware.ts` became `src/proxy.ts` —
Next 16's new name for the same file.
