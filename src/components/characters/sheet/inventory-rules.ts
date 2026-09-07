// What the inventory card derives from the rows it is drawn from
// (`first-table/inventory-trim`): what a row is called, whether the character
// holds anything that can be attuned, and what an equipment pack unfolds into.
//
// Pure, and read straight off the local SRD data — no gate, no stored flag. A
// rule that reads the inventory cannot drift from it.
//
// It reads the generated `sheet-inventory` slice rather than `MAGIC_ITEMS` and
// `EQUIPMENT` themselves: this module is in the sheet's client bundle, and the
// two collections whole are ~340 KB of JSON to answer four small questions
// (`triage/sheet-bundle-srd-json`).
import { formatReferenceIndex } from '@/lib/characters/display'
import type { CharacterItem } from '@/lib/db/schema'
import {
  EQUIPMENT_NAMES,
  MAGIC_ITEM_NAMES,
  MAGIC_ONLY_INDEXES,
  PACK_CONTENTS,
} from '@/lib/srd/sheet-inventory'

/**
 * What to call one inventory row (`triage/inventory-item-names`).
 *
 * Three sources in order, and the order is the point. A `customName` wins
 * outright: `character_items` stores a reference item, a homebrew item, *or a
 * renamed reference item*, and the rename is the player's own word for the
 * thing — a Longsword they call Fang stays Fang. Otherwise the row is named
 * the way the Library names it, off the generated slice, so a `priests-pack`
 * reads "Priest's Pack".
 *
 * Formatting the index is the last resort, not the first: it is what the card
 * used to do for every reference row, which is where "Healers-Kit" and
 * "Chain-Mail" came from. It survives only for an index the equipment
 * collection no longer carries — a row stored against a renamed index still
 * reads as words rather than vanishing.
 */
export function itemDisplayName(
  item: Pick<CharacterItem, 'equipmentIndex' | 'customName'>,
): string {
  if (item.customName) return item.customName
  if (!item.equipmentIndex) return 'Item'
  return EQUIPMENT_NAMES.get(item.equipmentIndex) ?? formatReferenceIndex(item.equipmentIndex)
}

/**
 * True when a row is a magic item by reference or by name.
 *
 * By reference, an index is magic when the magic-items collection has it and
 * the mundane equipment collection does not: `shield` is in both (the generic
 * magic parent of `+1 Shield`), and a cleric's plain shield must stay mundane.
 * By name, a custom row matches an SRD magic item's name case-insensitively,
 * trimmed — the sheet's add panel offers no magic-item picker, so a Cloak of
 * Protection arrives as a custom row named after it.
 */
export function isMagicItem(item: Pick<CharacterItem, 'equipmentIndex' | 'customName'>): boolean {
  if (item.equipmentIndex && MAGIC_ONLY_INDEXES.has(item.equipmentIndex)) return true
  const name = item.customName?.trim().toLowerCase()
  return name !== undefined && name !== '' && MAGIC_ITEM_NAMES.has(name)
}

/**
 * Whether the Attuned toggle has anything to do on this inventory.
 *
 * Attunement is a magic-item rule nobody at a level-1 table meets, so the
 * toggle stays off every row until the character holds a magic item — or
 * until a row is already attuned, because a stored attunement must stay
 * reachable: hiding never deletes state (D40), and a row attuned on a
 * previous build has to be un-attunable on this one.
 */
export function inventoryHoldsMagicItem(items: readonly CharacterItem[]): boolean {
  return items.some((item) => item.attuned || isMagicItem(item))
}

/** One line of a pack's contents, resolved to a display name. */
export interface PackContent {
  index: string
  name: string
  quantity: number
}

/**
 * What an equipment pack holds, or an empty list for anything that is not one.
 *
 * A pack is detected by having contents, not by category: the Explorer's and
 * Entertainer's packs are filed under plain `adventuring-gear` in the SRD
 * data. A content index the equipment collection does not carry falls back to
 * the index's own words rather than dropping the line.
 */
export function packContents(item: Pick<CharacterItem, 'equipmentIndex'>): PackContent[] {
  if (!item.equipmentIndex) return []
  const contents = PACK_CONTENTS.get(item.equipmentIndex) ?? []
  return contents.map((content) => ({
    index: content.index,
    name: content.name ?? formatReferenceIndex(content.index),
    quantity: content.quantity,
  }))
}
