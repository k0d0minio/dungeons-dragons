# DND-059 · Loot handout — DM pushes treasure to the party

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | feature |
| Priority | P2 |
| Size | S |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/components/characters/sheet/inventory-card.tsx` · `.icm/project.md` D13 |

## Problem

When the party finds 400 gp and a +1 shortsword, the app's answer is: five players each
open their own inventory and type their share, or the DM opens sheets one by one (D13
already grants the edit power) and does it for them. The capability exists; only the
convenience is missing — a "give to…" flow that takes an item or a coin amount, picks
recipients from the roster, splits currency evenly, and writes it in one pass.

Stated honestly: this is pure convenience over an existing power, at a physical table
where "you find 400 gold" spoken aloud works fine. It earns its ticket because loot is
an every-session event and the per-player bookkeeping is exactly the kind of fiddle the
app exists to absorb — but it is the most killable ticket in this audit.

One technical caveat shapes the design: `neon-http` cannot do transactions, so a
multi-character write is N separate writes with partial success as a real failure mode.
The flow must report per-recipient success rather than pretending to be atomic.

## Decision — Jamie

- [ ] **Build it.** A "hand out" action on the campaign page (and/or encounter
      tracker): pick coins and/or an item, pick recipients, currency splits evenly with
      remainder shown, items go to one chosen character. Per-recipient result shown.
- [ ] **Currency only.** The even-split math is the actual value; items are rare enough
      to hand out via the sheet. Smaller.
- [ ] **Kill.** D13 edit-the-sheet is enough. `> Dropped:` and done.

## Acceptance

- [ ] The DM can grant coins to several characters in one flow; the split is shown
      before it applies and the remainder is explicit, never silently dropped
- [ ] (Full scope) an item lands in one character's inventory with quantity and notes
- [ ] Partial failure is visible per recipient and retryable — no fake atomicity
- [ ] Writes go through the existing version-guarded character API, so a player editing
      their own sheet at the same moment reconciles via 409, not clobber
- [ ] CI green

## Prompt

Jamie has decided in `.icm/intake/DND-059-loot-handout.md` — read its Decision section
and `.icm/project.md` for context. If killed, `git mv` to `_done/` with a `> Dropped:`
line and stop.

The flow lives DM-side off the campaign roster (`src/app/dm/campaigns/[id]/page.tsx`).
Currency fields and items ride the existing character APIs (`/api/characters/[id]` and
`[id]/items`) — reuse them per recipient rather than building a batch endpoint, and
surface each recipient's outcome. Remember `neon-http` has no transactions: design for
partial success, never claim atomicity. Open a PR on a `claude/` branch; CI is the
source of truth.
