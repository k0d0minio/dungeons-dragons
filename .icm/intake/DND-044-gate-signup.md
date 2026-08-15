# DND-044 · Gate sign-up, or write the privacy notice

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | S |
| Sources | legal lens · `src/proxy.ts:27` · `src/app/auth/[path]/page.tsx:8-10` · `src/lib/db/schema.ts:56` |

## Problem

The app's stated intent is "friends and family at one physical table — not a product, no
customers". The deployment does not match that: `/auth/*` is deliberately outside the proxy
matcher (`src/proxy.ts:27` matches only `/characters/:path*` and `/account/:path*`), and
`src/app/auth/[path]/page.tsx:8-10` statically generates every Neon Auth view including
`sign-up`. **Anyone who finds the URL can create an account.**

That mismatch is the entire legal question for this project, and it has a cheap answer.

GDPR Art 2(2)(c) exempts purely personal or household activity — a phone tool for Jamie and his
friends is squarely that, and under it essentially none of the compliance apparatus applies. But
the CJEU reads that exemption narrowly (*Lindqvist* C-101/01, *Ryneš* C-212/13) and specifically
excludes publishing personal data to an indefinite number of people. Open registration is what
puts this near the line. Personal data currently stored: email and password hash in `neon_auth`,
plus character rows keyed to `owner_id` (`schema.ts:56`).

**Two branches, and the cheap one is much cheaper.** Close the door — invite code, email
allowlist, or disable open registration in the Neon Auth console — and the app becomes what its
intent already says it is; the household exemption holds comfortably and there is nothing further
to build. Leave it open, and Jamie is a controller processing strangers' data who owes an Art 13
notice: who he is, what is stored, why, where, and how to delete it. That is roughly 200 words on
one page linked from the footer — still not a compliance programme, but it is work that the other
branch does not need at all.

The legal lens's own recommendation, which is worth repeating: gating sign-up costs an afternoon
and makes the question disappear, which is cheaper than paying for advice about it.

## Amendment from DND-016 — 2026-08-15

DND-016 has landed: open sign-up is **confirmed working** on production, so gating it can no
longer mask an unverified bug. This ticket is unblocked.

One finding narrows Branch A. The Neon Auth trusted-domains list — the obvious candidate for
"disable open registration in the Neon Auth console" — **cannot serve as the gate**. It is
enforced only when the request carries an `Origin` header: `POST /api/auth/sign-up/email`
with the header omitted returns `200` and creates an account. That is correct Better Auth
behaviour (it is a CSRF boundary, and browsers always send `Origin`), but it means a domain
list stops another *website* from driving this one and stops nothing else. Branch A needs a
gate the app or the auth service enforces on the request itself — an invite code or an email
allowlist — not a Console domain setting.

Also relevant to Branch B: the probe account DND-016 created cannot be deleted from inside
the app, which makes the Art 17 concern concrete rather than hypothetical. Details in
`.icm/docs/neon-auth-setup.md`.

## Acceptance

- [ ] Jamie has decided: gated, or open with a notice
- [ ] **If gated** — a stranger with the URL cannot create an account, and the people who should
      be able to, can
- [ ] **If open** — a privacy notice exists covering identity, data stored, purpose, processor
      (Neon), retention and how to request deletion, linked from a persistent surface
- [ ] Whichever branch, the decision is recorded in `.icm/project.md`'s decisions table
- [ ] No cookie banner is added — see below
- [ ] CI green

## Prompt

Decide and implement the sign-up door for the D&D 5e Companion. **Ask Jamie which branch before
building** — the two paths share almost no work.

The situation: intent says "friends and family at one table, not a product", but `/auth/*` sits
outside the proxy matcher (`src/proxy.ts:27`) and every Neon Auth view including sign-up is
statically generated (`src/app/auth/[path]/page.tsx:8-10`), so anyone with the URL can register.
Under GDPR (and Portugal's Lei n.º 58/2019) the household exemption in Art 2(2)(c) comfortably
covers a tool for Jamie and his friends — but the CJEU reads it narrowly and open registration to
an indefinite public is exactly what erodes it.

**Branch A — gate it (recommended, and much cheaper).** An invite code, an email allowlist, or
disabling open registration in the Neon Auth console. The app then matches its own stated intent,
and the legal question disappears entirely with nothing further to build. Note this interacts with
DND-016, which verifies that a non-Jamie account can be created at all — coordinate, because
gating sign-up while that is still unverified could mask a real bug. Land DND-016 first.

**Branch B — leave it open and write the notice.** Roughly 200 words on one page, linked from a
persistent surface: who the controller is, what is stored (email and password hash in `neon_auth`,
character data keyed to `owner_id`), why, that Neon is the processor, retention, and how to
request deletion. If this branch is chosen, note that there is currently no delete-account path
and `owner_id` has no FK or cascade, so a deleted user's characters orphan — that becomes a real
Art 17 problem rather than a hygiene one, and needs a follow-up ticket.

**Do not add a cookie banner, on either branch.** The app has no analytics and no trackers at all
— confirmed by grep across `src/` and `package.json`, no `document.cookie`, `localStorage` or
`sessionStorage` writes in application code. The only cookie is Neon Auth's session cookie, which
is strictly necessary for a service the user requested and is consent-exempt under ePrivacy Art
5(3) (Lei 41/2004 art. 5). A banner here would be pure theatre and would make the experience worse
for no legal gain.

Record whichever branch is chosen in `.icm/project.md`'s decisions table.

Read `.icm/intake/DND-044-gate-signup.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.

## Amendment — 2026-08-15, branch chosen (D20)

Jamie chose the gate: sign-up requires a shared invite code, `SIGNUP_INVITE_CODE`,
set in Vercel and never in git, **fail-closed** when unset. Enforcement is on the
auth proxy (`src/app/api/auth/[...path]/route.ts`) — the sign-up page's gate is
UI, the proxy check is the lock, and Neon's trusted-domains list is neither (see
`.icm/docs/neon-auth-setup.md`). Friends who enter the code sign up normally and
default to the `player` role (D19). The household GDPR exemption holds; no
privacy notice is needed. The Art 17 orphaned-rows note stands as a known gap.

**Jamie's one console task: set `SIGNUP_INVITE_CODE` in Vercel (production env),
to a phrase he'd happily read out at the table.** Until then sign-up shows
"closed" — which is fail-closed working as chosen, not a bug.
