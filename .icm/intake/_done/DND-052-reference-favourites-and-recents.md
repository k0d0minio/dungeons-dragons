> Dropped: kill box exercised — decided by Jamie in the 2026-08-27 estate ticket audit: the app has not yet been played at a real table, so no observed friction backs this convenience; re-cut with evidence if a session proves it missing.

# DND-052 · Favourites and recents in the reference browser

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | improvement |
| Priority | P2 |
| Size | S |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/app/page.tsx` · `src/components/navigation/reference-lookup-sheet.tsx` |

## Problem

Nothing in the app remembers a lookup. The player who checks *Hunter's Mark* every
session types it every session; the DM who keeps returning to the same three stat blocks
re-searches them every time. For the people at one fixed table — the only users this app
has — the set of things worth looking up is small and stable, which is exactly the case
favourites and recents are built for. This is the cheapest remaining attack on the
ten-second bar: for a repeat lookup it makes the answer zero-typing.

The cost side: it's a convenience, the search already works, and the reference browser is
deliberately public and account-free — which forces the storage question below.

## Decision — Jamie

- [ ] **Per-device (localStorage).** No schema, no sign-in dependency, works on the
      public browser. A pin star on detail sheets, a "Pinned & recent" strip above the
      tabs when non-empty. Lost if the browser data is cleared. Size S.
- [ ] **Per-account (DB).** Survives devices, but only exists signed-in — the public
      browser stays memoryless, and it's a table + API for a convenience feature. Size M.
- [ ] **Recents only, automatic.** No pin UI at all; the last ~10 opened entries appear
      in the lookup sheet. Smallest possible version.
- [ ] **Kill.** Search is fast enough. `> Dropped:` and done.

## Acceptance

- [ ] A repeat lookup of a pinned/recent entry is zero-typing from the home screen and
      from the in-sheet lookup overlay
- [ ] The empty state adds no visual noise — nothing shows until there's something to show
- [ ] The public no-account browser behaves per the chosen storage model
- [ ] CI green

## Prompt

Jamie has picked a storage model in the Decision section of
`.icm/intake/DND-052-reference-favourites-and-recents.md` — read it, and
`.icm/project.md` for context. If killed, `git mv` to `_done/` with a `> Dropped:` line
and stop.

Touch points: the home browser (`src/app/page.tsx`), the detail sheets
(`src/components/reference/reference-detail-sheet.tsx` — the natural home for a pin
star), and the in-sheet lookup overlay
(`src/components/navigation/reference-lookup-sheet.tsx`), which should surface the same
list so a mid-session lookup benefits too. Keys are `(type, index)` pairs. If
per-account was chosen, migrations must be additive and nullable. Open a PR on a
`claude/` branch; CI is the source of truth.
