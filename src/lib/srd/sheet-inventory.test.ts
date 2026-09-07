// Keeps the generated sheet slice honest against the collections it comes from
// (`triage/sheet-bundle-srd-json`).
//
// `sheet-inventory.json` is derived, not fetched: nothing at build or deploy
// time regenerates it, so a data regeneration that renames a magic item or
// changes a pack's contents and leaves this file behind would ship a sheet
// that disagrees with the Library about the same item. These assertions are
// that guard — they are the only thing standing between the two.
import { EQUIPMENT } from './equipment'
import { MAGIC_ITEMS } from './magic-items'
import { MAGIC_ITEM_NAMES, MAGIC_ONLY_INDEXES, PACK_CONTENTS } from './sheet-inventory'

describe('sheet-inventory', () => {
  it('carries every magic-item name, lowered', () => {
    expect(MAGIC_ITEM_NAMES.size).toBe(
      new Set(MAGIC_ITEMS.all.map((e) => e.name.toLowerCase())).size,
    )
    for (const entry of MAGIC_ITEMS.all) {
      expect(MAGIC_ITEM_NAMES.has(entry.name.toLowerCase())).toBe(true)
    }
  })

  it('holds exactly the indexes the magic-item collection has and the equipment one does not', () => {
    const expected = MAGIC_ITEMS.indexes.filter((index) => !EQUIPMENT.has(index))
    expect([...MAGIC_ONLY_INDEXES].sort()).toEqual([...expected].sort())
  })

  it('leaves the shared shield index out, so a plain shield stays mundane', () => {
    expect(MAGIC_ITEMS.has('shield')).toBe(true)
    expect(EQUIPMENT.has('shield')).toBe(true)
    expect(MAGIC_ONLY_INDEXES.has('shield')).toBe(false)
  })

  it('carries every equipment row that has contents, and nothing else', () => {
    const packs = EQUIPMENT.all.filter((entry) => entry.contents.length > 0)
    expect([...PACK_CONTENTS.keys()].sort()).toEqual(packs.map((pack) => pack.index).sort())
  })

  it('repeats each pack’s contents and resolved names exactly', () => {
    for (const pack of EQUIPMENT.all.filter((entry) => entry.contents.length > 0)) {
      expect(PACK_CONTENTS.get(pack.index)).toEqual(
        pack.contents.map((content) => ({
          index: content.index,
          name: EQUIPMENT.get(content.index)?.name ?? null,
          quantity: content.quantity,
        })),
      )
    }
  })
})
