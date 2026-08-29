# Stub: Land on your character; reference becomes the Library

- feature-slug: home-and-library
- sequence: 3 of 5
- depends-on: navigation-shell
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Jamie's front-door decision: a signed-in player opens the app onto **their
character** (their sheet if one exists, creation if none, the list if several); a
signed-out visitor gets a simple welcome screen with invite sign-in. The
six-tabbed reference browser moves to `/library` and inverts: **one search box
first**, the six content types demoted to filter chips, tap-through detail
sheets kept. The register's "answer a rules lookup in under ten seconds" bar
still applies to the Library — search must be the fast path, not a downgrade.

> Amended 2026-08-29 (`/project` re-run): the Library requires a session like
> every other page (D34 — the wall itself is the `sign-in-wall` stub). `/` must
> remain the app's entry forever: installed PWAs hold `start_url: '/'` and iOS
> never re-reads the manifest, so the welcome/redirect lives at `/`, never moves.
> If this work touches the `/offline` page, bump the service-worker cache name
> (`public/sw.js`, `dnd-offline-v1`) — existing installs never refresh it
> otherwise.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/apple-redesign/home-and-library.md` and the epic's `breakdown.md`.
Reroute the front door: `/` redirects signed-in users to their character (sheet /
creation / list as appropriate) and shows signed-out users a welcome screen with
sign-in; move the reference browser from `src/app/page.tsx` to `/library`,
redesigned search-first — a single prominent search across all six types with
type filter chips, existing detail sheets and the cross-tab match hints
preserved. Update the tab bar target and any internal links. Measure nothing
locally — PR on a `claude/` branch; CI green only.
