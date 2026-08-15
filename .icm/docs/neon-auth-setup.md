# Neon Auth setup — runbook

> Restored and corrected 2026-08-15 by DND-016. The original was written by `e86d132` and
> deleted the next day by `1b151fa`; this version keeps what was right, fixes what was
> wrong, and adds what was verified against the live deployment.

**Bottom line: open sign-up works.** On 2026-08-15 an account that is not Jamie's was
created on production, signed in from a client with no prior session, created a character
and opened its sheet — all of it end to end, no Console change required. The
trusted-domains step below has already been done. Nothing here is a to-do unless you change
domains.

## What was verified, and how

Against `https://dungeons-dragons.jamienisbet.com`, production deployment
`dpl_FoJabAJhdaNjTSZ3ar4BzCyPa85F` (commit `65a969e`):

| Check | Result |
|---|---|
| `POST /api/auth/sign-up/email`, production `Origin` | `200` — user row created, session cookie issued |
| `POST /api/auth/sign-in/email` from a fresh client | `200` — session valid |
| `POST /api/characters` with that session | `201` |
| `GET /characters/<id>` with that session | `200`, sheet renders |
| `GET /characters/<id>` with no session | `307` → `/auth/sign-in` |
| `GET /api/characters` with no session | `401` |
| `GET /characters/<unknown-id>` signed in | `404` |
| `POST /api/auth/sign-in/email`, `Origin: https://evil.example.com` | `403 INVALID_ORIGIN` |

That last row is the one that matters: the origin check is live *and* correctly
configured. A foreign origin is rejected; the production origin is not.

The probe account is still there — see [Cleaning up the probe account](#cleaning-up-the-probe-account).

## 1. Enable Neon Auth on the database

Neon Console → the D&D Companion project → the branch → **Auth** → enable.

Neon provisions a managed auth service and creates the `neon_auth` schema **in the same
database the app uses**. That is the point of picking Neon Auth: `characters.owner_id`
references a user id living in that schema, in the same Postgres, with no cross-service
join.

## 2. The two env vars

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEON_AUTH_BASE_URL` | Neon Console, after enabling Auth | Base URL of the provisioned auth service |
| `NEON_AUTH_COOKIE_SECRET` | You generate it | Signs the session cookie. **32+ characters** or `createNeonAuth` throws. `openssl rand -base64 32` |

Both are set in Vercel production today — `GET /api/auth/ok` returns `{"ok":true}` and
sign-in works, which it could not without them. Set them in `.env.local` for local dev too.
Neither belongs in git; `.gitignore` covers `.env*`. No key reaches the browser: the client
talks only to this app's own `/api/auth/*` proxy.

`NEON_AUTH_COOKIE_SECRET` should differ between production and preview.

## 3. Trusted domains — done, and worth understanding

**Neon Console → Auth → Configuration → Domains.** Each origin with its protocol and no
trailing slash.

| Origin | Status | Why |
|---|---|---|
| `https://dungeons-dragons.jamienisbet.com` | **configured — this is the one that works** | The production custom domain; the only URL a friend will ever use |
| `https://dungeons-dragons-mafra-kodominio.vercel.app` | not needed | See below — Vercel blocks it before Neon Auth is ever reached |
| `localhost` | not needed | Neon allows development origins automatically, on any port |

**The `.vercel.app` domains are not an entry point.** The original runbook listed
`dungeons-dragons-mafra-kodominio.vercel.app` as a domain to add. It isn't: the project has
Vercel Deployment Protection on, so that host answers `401 {"code":"401","message":"Protected
deployment"}` to anyone not logged into the Kodominio Vercel team. The request never reaches
Neon Auth, so a trusted-domain entry for it would change nothing. Preview deployments are
protected the same way. **Only the custom domain matters.**

If the custom domain ever changes, this list is the thing to update, and the failure mode is
below.

### What a missing entry looks like

Neon Auth validates the browser's `Origin` against this list on state-changing calls. With
the domain missing, the app looks completely healthy — the sign-up form renders,
`/api/auth/ok` returns `{"ok":true}`, `/api/auth/get-session` returns `null` — and then the
submit fails:

```
POST /api/auth/sign-up/email  ->  403
{"message":"Invalid origin","code":"INVALID_ORIGIN"}
```

Only *write* paths are origin-checked, so every read-only health check passes while sign-up
is impossible. A 403 `INVALID_ORIGIN` anywhere is this list — not the env vars, not the code.

### Two things that will mislead you if you probe this with curl

Both were hit while verifying DND-016. They are the reason a casual probe can "prove" the
opposite of the truth.

**A `400` does not mean the origin is trusted.** Payload validation runs *before* the origin
check. Posting a deliberately malformed email from `https://evil.example.com` returns
`400 VALIDATION_ERROR`, not `403 INVALID_ORIGIN` — so a probe designed to avoid creating a
real account cannot tell you anything about the origin list. You have to send a *valid* body
to reach the origin check.

**A request with no `Origin` header is not checked at all.** `POST /api/auth/sign-in/email`
with the header omitted returns `200`. That is ordinary Better Auth behaviour and not a bug
— browsers always send `Origin` on state-changing cross-origin requests, so it does its job
as a CSRF boundary. But it means the trusted-domains list **is not an access-control gate**:
it stops another website from driving this one, and it stops nothing else.

> **This lands on DND-044.** That ticket floats "disabling open registration in the Neon Auth
> console" as one way to gate sign-up. Whatever that Console setting does, the trusted-domains
> list is not it — a script with no `Origin` header signs up fine. A gate has to be something
> the app or the auth service enforces on the request itself (invite code, email allowlist),
> not a domain list.

## 4. What you actually get

Email + password sign-up, sign-in, sign-out, password reset and the account settings pages.

**Email verification is not enforced.** Sign-up returns `emailVerified: false` and issues a
working session in the same response; sign-in with an unverified address succeeds. A friend
therefore needs no working inbox to start playing, and no email provider has to be
configured for sign-up to work. If verification is ever wanted, it has to be turned on
deliberately.

Social sign-in is deliberately off. `src/app/providers.tsx` passes no `social` prop, because
a Google button that errors until an OAuth app is configured in the Console is worse than no
button. To turn it on: configure the provider in the Console, then add
`social={{ providers: ['google'] }}` to `NeonAuthUIProvider`.

## Why a misconfiguration is silent

`isAuthConfigured()` in `src/lib/auth/server.ts` returns false when either env var is
missing, and `getSessionUser()` then returns `null` instead of throwing. `src/proxy.ts` does
the same and passes the request through. This is deliberate — the public reference browser
keeps working and the build never fails on a deploy where Neon Auth is not enabled yet — but
it means **a silent redirect to `/auth/sign-in` proves nothing**. It is what you see both
when auth is working and you are signed out, and when auth is not configured at all.

To tell them apart: `GET /api/auth/ok` returns `{"ok":true}` only when the env vars are
present and the handler was constructible.

## Cleaning up the probe account

DND-016's verification left real rows in production. They are harmless, and deleting them is
optional, but they are not Jamie's and should not be mistaken for a real player:

- user `dnd016-signup-probe@example.com`, id `90684dfa-e5a7-487c-9aee-aa3c5532b57d`
  (`example.com` is IANA-reserved and cannot receive mail, so no real mailbox was touched)
- character `DND-016 Probe Fighter`, id `3dc11dd3-fc15-408b-8701-bd4d991f0e1c`

**There is no in-app way to delete either.** The app has no delete-account path and no
`DELETE` route under `src/app/api/characters/`. Removal means SQL against the Neon database:
delete the `characters` row by id, then the `neon_auth.session` / `neon_auth.account` /
`neon_auth.user` rows for that user id. `owner_id` has no foreign key or cascade, so
deleting the user first orphans the character rather than removing it — do the character
first. DND-044 already flags this as a real Art 17 problem if sign-up stays open.

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

**Legacy Neon Auth is closed.** DND-002 was written against Neon Auth as it was — Stack Auth
under the hood, users synced into `neon_auth.users_sync`. Neon's docs now say that version is
*"for existing users only (not available for new projects)"*. The current product is
**Managed Better Auth** (`@neondatabase/auth`), which stores users in `neon_auth.user` /
`neon_auth.session` / `neon_auth.account` rather than a `users_sync` mirror. Everything
DND-002 wanted — managed auth, users in the app's own Postgres, foreign-keyable user ids —
still holds; only the table name changed. **DND-007 should reference `neon_auth.user`, not
`neon_auth.users_sync`.**

**It forced Next.js 16.** Every published version of `@neondatabase/auth`, including the
first beta, declares a `next >= 16` peer dependency. The app was on 15.5.9, so DND-002
carried the upgrade to 16.3.0 with it. The visible consequence in this repo is that
`src/middleware.ts` became `src/proxy.ts` — Next 16's new name for the same file.
