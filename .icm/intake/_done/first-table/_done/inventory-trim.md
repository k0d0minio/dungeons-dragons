# Stub: A level-1 backpack, not a ledger

- feature-slug: inventory-trim
- sequence: 14 of 17
- depends-on: none
- priority: P2
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §C;
  `.icm/docs/2026-09-05-first-timer-research.md` §5 (the box cuts attunement, components
  and weight), §6 (scrolling is where phones lose); Q&A: both trims

Every row of the inventory (`inventory-card.tsx`) carries Equipped, Attuned, Notes and
Remove — for a level-1 kit of arrows, a quiver, a healer's kit and a gaming set.
Attunement is a magic-item rule (the cap is app logic in `src/lib/db/items.ts`) nobody at
this table meets before level 3.

## Build

- Hide the Attuned toggle until the character holds an item that is in the magic-items
  list — no gate, no state, the rule reads the inventory it is drawn from.
- Fold a pack's contents (Priest's Pack, Explorer's Pack, Dungeoneer's Pack) under the
  pack's row, collapsed; the pack is one row with a count.
- Equipped stays on every weapon and armour row: it is the toggle that makes attacks
  and AC real.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/inventory-trim.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/first-table/_done/` in the same PR.
