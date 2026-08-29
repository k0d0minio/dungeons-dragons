# Epic: apple-redesign — Apple HIG structure, subtle-fantasy identity

- priority: P1
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

## What was understood

Jamie wants the app simplified and rebuilt on **Apple's design norms** — large
titles, grouped lists, sheet presentations, a calm tab bar, system typography —
with the D&D theming kept but **subtle** (his pick over "full themed skin" and
"pure minimal"): a warm parchment-and-deep-red token palette, a display serif for
headings only, thematic iconography. Target device: phones at the physical table,
nothing else.

Today the token layer is stock un-themed shadcn — every colour zero-chroma
neutral in `src/app/globals.css`, default Geist fonts — and the front door
(`src/app/page.tsx`) bypasses tokens entirely with a hardcoded amber gradient and
literal per-tab Tailwind colours (the single largest design-debt item). Navigation
is a 3-tab bottom bar (Reference / Characters / DM) with the reference tab opening
an overlay from deep screens — that overlay pattern is good and stays. The
character sheet is 15 stacked cards, several screens long.

Direction decisions this epic implements: signed-in players land on **their
character**; the reference browser becomes a search-first **Library**; the sheet
becomes **segmented (Play / Spells / Gear / Me) with beginner-mode progressive
disclosure**. Standing constraints kept: 44px touch targets, dark mode follows
system with no toggle, `--bottom-nav-height` clearance token, phone-first not
WCAG-audited (D10).

## Build order

1. `design-tokens` — the palette, type, and the untokened front door debt.
2. `navigation-shell` — iOS-pattern shell: large titles, grouped lists, sheets,
   tab bar naming.
3. `home-and-library` — land on your character; reference becomes search-first.
4. `sign-in-wall` — the public half retires: deny-by-default matcher, named
   exceptions (D34).
5. `sheet-segments` — the 15 cards become 4 segments + beginner mode.

Tokens and shell can start in parallel with `srd-2024-migration`;
`sheet-segments` should land **after** `rules-engine-2024` so the sheet is
reorganized once, on 2024 logic.

> Amended 2026-08-29 (`/project` re-run): Jamie decided **everything goes behind
> sign-in** (D34) — `sign-in-wall` added, and the stubs' public-reference
> assumptions removed. Pages are gated; reference *data* endpoints stay public and
> CDN-cached. `/` remains the PWA `start_url` (installed clients never re-read the
> manifest) — the welcome/redirect must live at `/` forever.
