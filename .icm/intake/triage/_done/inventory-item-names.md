# Stub: Inventory rows are named by their index, and one is "Gaming Set (same as above)"

- lane: tweak
- found-by: first-timer audit, 2026-09-05 (`.icm/docs/2026-09-05-first-timer-audit.md` §E)
- priority: P2
- size: S

`displayName` in `src/components/characters/sheet/inventory-card.tsx` renders a
reference item as `formatReferenceIndex(index)`: "Healers-Kit", "Chain-Mail",
"Priests-Pack", "Traveler's Clothes". The SRD name exists (`EQUIPMENT.get(index)?.name`,
`WEAPONS.get(index)?.name`) and `startingInventory` already computes it — the sheet
ignores it. Prefer the SRD name for any indexed item, the custom name otherwise.

Separately, the Soldier background's kit lands an item literally named "Gaming Set
(same as above)": the SRD's own cross-reference in `backgrounds.json` ("Gaming Set (same
as above)") reaches `parseEquipmentClause` as a phrase it cannot resolve, and becomes a
custom-named row. Strip a trailing parenthetical the parser cannot resolve before
naming the item — "Gaming Set" — and add the case to the parser's tests.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/inventory-item-names.md`. Fix both halves on a `claude/` branch and
open a PR; CI is the only evidence. `git mv` the stub into `.icm/intake/triage/_done/`
in the same PR.
