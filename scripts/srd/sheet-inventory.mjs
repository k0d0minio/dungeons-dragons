// Derives the sheet's slice of the equipment and magic-item data
// (`triage/sheet-bundle-srd-json`).
//
// `src/components/characters/sheet/inventory-rules.ts` runs on a phone, in the
// sheet's client bundle, and needs four small facts out of two large
// collections: which indexes are magic rather than mundane, the magic-item
// names a custom row can be typed as, what the seven packs unfold into, and
// what the SRD calls each equipment row. Importing `MAGIC_ITEMS` and
// `EQUIPMENT` to get them shipped ~340 KB of JSON to the table for a names
// list. This emits those four facts alone.
//
// Purely derived — no upstream call of its own, no correction of its own. It is
// a projection of the two collections `build-srd-data.mjs` has already built,
// and `src/lib/srd/sheet-inventory.test.ts` asserts it still agrees with them.

/**
 * The sheet-inventory projection of the built magic-item and equipment rows.
 *
 * @param magicItems rows as `buildMagicItems()` returns them
 * @param equipment rows as `buildEquipment()` returns them
 */
export function buildSheetInventory(magicItems, equipment) {
  const equipmentIndexes = new Set(equipment.map((entry) => entry.index))
  const equipmentNames = new Map(equipment.map((entry) => [entry.index, entry.name]))

  return {
    // An index is magic when the magic-items collection has it and the mundane
    // equipment collection does not: `shield` is in both (the generic magic
    // parent of `+1 Shield`), and a cleric's plain shield must stay mundane.
    magicOnlyIndexes: magicItems
      .map((entry) => entry.index)
      .filter((index) => !equipmentIndexes.has(index)),
    // Every magic-item name, lowered here rather than on each sheet load, so a
    // custom row typed as "cloak of protection" counts the same as one typed
    // with capitals. All 262, including the ones whose index is also equipment:
    // the name match is deliberately wider than the index match.
    magicItemNames: magicItems.map((entry) => entry.name.toLowerCase()),
    // What the SRD calls each row, so an inventory names a `priests-pack` the
    // way the Library does — "Priest's Pack", not the index's own words. Every
    // weapon is an equipment row too, so this is the whole vocabulary a stored
    // `equipmentIndex` can come from.
    equipmentNames: Object.fromEntries(equipmentNames),
    // A pack is anything with contents, not a category: the Explorer's and
    // Entertainer's packs are filed under plain `adventuring-gear`. Names are
    // resolved here; `null` for a content index the equipment collection does
    // not carry, which the rule falls back to formatting from the index.
    packs: Object.fromEntries(
      equipment
        .filter((entry) => entry.contents.length > 0)
        .map((entry) => [
          entry.index,
          entry.contents.map((content) => ({
            index: content.index,
            name: equipmentNames.get(content.index) ?? null,
            quantity: content.quantity,
          })),
        ]),
    ),
  }
}
