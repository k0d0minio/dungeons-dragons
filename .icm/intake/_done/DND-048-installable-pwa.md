# DND-048 · Installable PWA — a home-screen icon, still fully online

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P2 |
| Size | S |
| Sources | Jamie, 2026-08-16 ("please make this as a PWA") · register D2, D28 |

## Problem

The app is used on phones at a table, but it lives in a browser tab: no home-screen
icon, browser chrome glowing around the sheet, and a browser error page when the
wifi drops mid-session. Register D2 (2026-08-13) retired the whole PWA ambition
along with offline support — but installability and offline are separable, and
only offline was expensive.

## Decision (Jamie, 2026-08-16, register D28 — supersedes the installability half of D2)

**Installable, online-only.** Web app manifest + icons + the smallest honest
service worker: it caches exactly one thing (the `/offline` fallback page) and
passes every request straight to the network, so it cannot serve a stale sheet,
fight the DND-028 concurrency guard, or hide a deploy. Offline data stays
retired — D2's core stands.

## Acceptance

- [ ] The app installs to a home screen (manifest + icons, `display: standalone`) on Android and iOS
- [ ] Losing the network mid-navigation shows the app's own offline page, not a browser error
- [ ] No data of any kind is cached: sheets, reference and API calls all fail loudly to the app's existing error handling
- [ ] The service worker registers in production only
- [ ] CI green

Read `.icm/intake/DND-048-installable-pwa.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch.
