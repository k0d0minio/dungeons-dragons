// What the inventory card derives from the rows it is drawn from
// (`first-table/inventory-trim`): whether the character holds anything that
// can be attuned, and what an equipment pack unfolds into.
//
// Pure, and read straight off the local SRD collections — no gate, no stored
// flag. A rule that reads the inventory cannot drift from it.
import { formatReferenceIndex } from '@/lib/characters/display'
import type { CharacterItem } from '@/lib/db/schema'
import { EQUIPMENT } from '@/lib/srd/equipment'
import { MAGIC_ITEMS } from '@/lib/srd/magic-items'

// The 262 magic-item names, lowered once, so a custom row typed as "cloak of
// protection" counts the same as one typed with capitals.
const MAGIC_ITEM_NAMES = new Set(MAGIC_ITEMS.all.map((entry) => entry.name.toLowerCase()))

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
  if (item.equipmentIndex && MAGIC_ITEMS.has(item.equipmentIndex)) {
    if (!EQUIPMENT.has(item.equipmentIndex)) return true
  }
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
  const contents = EQUIPMENT.get(item.equipmentIndex)?.contents ?? []
  return contents.map((content) => ({
    index: content.index,
    name: EQUIPMENT.get(content.index)?.name ?? formatReferenceIndex(content.index),
    quantity: content.quantity,
  }))
}
