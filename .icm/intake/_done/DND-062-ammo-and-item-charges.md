> Dropped: kill box exercised — decided by Jamie in the 2026-08-27 estate ticket audit: the app has not yet been played at a real table, so no observed friction backs this convenience; re-cut with evidence if a session proves it missing.

# DND-062 · Ammunition and item charges — countable things that count down

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | improvement |
| Priority | P2 |
| Size | S |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/components/characters/sheet/inventory-card.tsx` · `src/components/characters/sheet/attacks-card.tsx` |

## Problem

Arrows, potions and wand charges are the sheet's countable consumables, and today they
all live as inventory quantity steppers — which works, but only if the player scrolls to
the inventory card mid-turn and remembers to. The attacks card shows the shortbow; firing
it decrements nothing and hints at nothing. A wand of magic missiles' 7 charges and
dawn-recharge have no home at all except an item-notes textarea.

Honest counterpoint: the quantity stepper *is* tap-to-decrement, and the generic class
resource counters could be abused for wand charges today. The gap is real but narrow —
this is a quality-of-life ticket, priced small, and killable if the table doesn't play
ammo-strict.

## Decision — Jamie

- [ ] **Ammo link on attacks.** A ranged weapon's attack row shows its ammo count with a
      −1 tap (linked to the matching inventory item), so firing and counting are one
      gesture in the place the turn already looks. Size S.
- [ ] **Ammo + charges.** The above, plus items can carry a charge counter
      (current/max) with an optional long-rest/dawn refill, shown on the item row —
      potions stay plain quantities. Size S+.
- [ ] **Kill.** Quantity steppers and the honour system are enough. `> Dropped:` and
      done.

## Acceptance

- [ ] Firing a ranged weapon decrements its ammunition from the attacks card in one tap;
      at 0 the row says so rather than going negative
- [ ] (Charges scope) a charged item shows and spends charges on its inventory row, and
      the chosen refill rule fires with the existing rest flows
- [ ] Nothing changes for characters who never touch these — no new required fields
- [ ] CI green

## Prompt

Jamie has picked a scope in the Decision section of
`.icm/intake/DND-062-ammo-and-item-charges.md` — read it, and `.icm/project.md` for
context. If killed, `git mv` to `_done/` with a `> Dropped:` line and stop.

The attacks card (`src/components/characters/sheet/attacks-card.tsx`) derives rows from
equipped weapons via `src/lib/characters/attacks.ts`; the ammunition link means finding
the matching ammo item in inventory (`character_items`) by its equipment category —
check what the equipment payload calls ammunition before hard-coding names. Charges are
additive nullable columns on `character_items`; refill hooks into
`src/lib/characters/rests.ts` beside the class-resource recharge. All writes ride the
existing item API and optimistic pattern. Open a PR on a `claude/` branch; CI is the
source of truth.
