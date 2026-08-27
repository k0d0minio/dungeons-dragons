> Dropped: kill box exercised — decided by Jamie in the 2026-08-27 estate ticket audit: the app has not yet been played at a real table, so no observed friction backs this convenience; re-cut with evidence if a session proves it missing.

# DND-063 · Inspiration — one boolean the whole table can see

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | feature |
| Priority | P2 |
| Size | XS |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/lib/characters/combat.ts` · `docs/rules/01-core-mechanics.md` |

## Problem

Inspiration is a single you-have-it-or-you-don't token the DM hands out for good
roleplay, spent for advantage on one roll. `grep -i inspiration` over `src/` returns
zero hits. It is the smallest possible piece of live character state the app doesn't
hold — one boolean — and it's also the piece most often forgotten *because* it usually
lives nowhere (a coin, a scrap of paper, someone's memory). The DM grants it via the
edit power D13 already provides; the party glance shows it; the player spends it with a
tap.

This ticket exists mostly because it costs almost nothing. It dies just as cheaply if
the table doesn't play with inspiration.

## Decision — Jamie

- [ ] **Build it.** A boolean on combat state; a small badge/toggle on the sheet near
      the vitals; visible on the DM party glance. Granting is just the DM toggling it
      on the player's sheet (D13).
- [ ] **Kill.** The table doesn't use inspiration, or a coin on the table does it
      better. `> Dropped:` and done.

## Acceptance

- [ ] A player sees whether they have inspiration without scrolling and spends it in
      one tap; the DM glance shows who holds it
- [ ] Rides the existing combat-state optimistic write and 409 guard — no new API
- [ ] CI green

## Prompt

Jamie has decided in `.icm/intake/DND-063-inspiration.md` — read its Decision section
and `.icm/project.md` for context. If killed, `git mv` to `_done/` with a `> Dropped:`
line and stop.

Add an `inspiration` boolean to the combat state (`src/lib/characters/combat.ts`, an
additive nullable column on `characters`), a toggle on the sheet near the vitals tiles
(`stats-cards.tsx` territory — visible without scrolling, but it must not crowd the HP
card), and a badge on the party glance row
(`src/components/campaigns/party-glance.tsx`). It flows through `use-combat-state.ts`
like every other live field. Open a PR on a `claude/` branch; CI is the source of truth.
