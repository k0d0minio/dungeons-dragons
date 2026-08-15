# DND-025 · A crash at the table must leave evidence

| | |
|---|---|
| Status | ready |
| Type | chore |
| Priority | P1 |
| Size | S |
| Sources | tech lens · `src/app/layout.tsx:4` · `src/app/error.tsx:12` · `src/proxy.ts:22-23` · `jest.setup.js:9-13` |

## Problem

Two gaps that only matter once the app is actually being used — which is now.

**The one place most likely to break has no error boundary.** `src/app/error.tsx` sits
*inside* the root layout, so anything thrown by `layout.tsx` escapes it. And `layout.tsx:4`
imports `SignedIn`, `SignedOut` and `UserButton` from `@neondatabase/auth/react/ui` — a
`0.5.0-beta` prerelease. The component most likely to throw is in the one file no boundary
covers, and the result is Next's unstyled built-in error page. There is no `global-error.tsx`
anywhere. `src/proxy.ts:22-23` is a second uncovered path: a throw there 500s all of
`/characters/*` and `/account/*` with no boundary at all.

**A crash leaves no trace by the next morning.** The only error sink in the app is
`console.error` (`src/app/error.tsx:12`). On Vercel that means Runtime Logs — short retention,
not searchable after the fact. A 500 at Friday's table is unreconstructable on Saturday, which
is precisely when you want to know what happened. `jest.setup.js:9-13` also blanket-overrides
`console.error` to a no-op, so tests cannot surface one either.

Proportionality: this is a five-person personal app. The ask is a boundary and a place for
errors to land — not an observability stack.

## Acceptance

- [ ] A throw from the root layout renders a styled page with a way out, not Next's default
- [ ] Errors from the app reach somewhere durable and searchable after the session ends
- [ ] Whatever is added is free at this scale and needs no ongoing attention
- [ ] `src/app/error.tsx`'s current display of `error.message` and `error.digest` is reviewed —
      it is fine for friends and family, but decide deliberately rather than by default
- [ ] CI green

## Prompt

Give the D&D 5e Companion somewhere for a crash to land. It is about to be used at a real
table for the first time, and today a 500 on Friday night leaves nothing to look at on
Saturday.

**Add `src/app/global-error.tsx`.** The existing `src/app/error.tsx` sits inside the root
layout and cannot catch anything thrown *by* that layout — which matters because
`src/app/layout.tsx:4` renders `SignedIn`/`SignedOut`/`UserButton` from `@neondatabase/auth`,
a `0.5.0-beta` prerelease. Right now the most likely thing to break is in the one place with
no boundary. Match the styling of the existing `error.tsx`; note that a `global-error`
replaces the whole document, so it needs its own `<html>` and `<body>`.

**Add error tracking.** The only sink today is `console.error` at `error.tsx:12`, which on
Vercel means short-retention Runtime Logs. Pick something with a free tier that suits a
five-person personal app — Sentry is the obvious candidate, and Vercel has a native
integration — and wire it into both error boundaries and the API route error paths. Keep it
proportionate: this is not an observability project. Do not add analytics; the legal lens
confirmed the app has no trackers at all, and that is a deliberate state worth preserving.

Two things to notice while you are there. `jest.setup.js:9-13` overrides `console.error` to a
no-op for the whole suite, so a real error in a test is invisible — worth narrowing to the
specific noise it was silencing. And `src/app/error.tsx:63-71` offers only `history.back()`,
which returns to the screen that just failed; give it a route home. (The related
`not-found.tsx` gap is DND-041 — leave that one.)

Read `.icm/intake/DND-025-global-error-and-tracking.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
