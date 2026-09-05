// Pins what the inventory card derives from its rows over the real SRD data:
// when the Attuned toggle has a reason to exist, and what a pack unfolds into
// (`first-table/inventory-trim`).
import type { CharacterItem } from '@/lib/db/schema'
import { EQUIPMENT } from '@/lib/srd/equipment'
import { MAGIC_ITEMS } from '@/lib/srd/magic-items'

import { inventoryHoldsMagicItem, isMagicItem, packContents } from './inventory-rules'

function item(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    characterId: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
    equipmentIndex: 'longsword',
    customName: null,
    quantity: 1,
    equipped: false,
    attuned: false,
    notes: null,
    createdAt: new Date('2026-08-14T12:00:00.000Z'),
    updatedAt: new Date('2026-08-14T12:00:00.000Z'),
    ...overrides,
  }
}

/** A level-1 cleric's kit as the wizard writes it: nothing here is magic. */
const MUNDANE_KIT = [
  item(),
  item({ id: 'a1b2c3d4-0000-4000-8000-000000000002', equipmentIndex: 'shield' }),
  item({ id: 'a1b2c3d4-0000-4000-8000-000000000003', equipmentIndex: 'chain-mail' }),
  item({ id: 'a1b2c3d4-0000-4000-8000-000000000004', equipmentIndex: 'priests-pack' }),
  item({
    id: 'a1b2c3d4-0000-4000-8000-000000000005',
    equipmentIndex: null,
    customName: 'Holy symbol on a chain',
  }),
]

describe('isMagicItem', () => {
  it('treats the generic shield as mundane even though the magic list has the index', () => {
    // `shield` is the one index both collections carry — the magic parent of
    // +1 Shield and the plain 2 gp shield share it.
    expect(MAGIC_ITEMS.has('shield')).toBe(true)
    expect(EQUIPMENT.has('shield')).toBe(true)
    expect(isMagicItem({ equipmentIndex: 'shield', customName: null })).toBe(false)
  })

  it('recognises a magic item by reference index', () => {
    expect(isMagicItem({ equipmentIndex: 'cloak-of-protection', customName: null })).toBe(true)
  })

  it('recognises a custom row named after an srd magic item, whatever the case', () => {
    expect(isMagicItem({ equipmentIndex: null, customName: 'Cloak of Protection' })).toBe(true)
    expect(isMagicItem({ equipmentIndex: null, customName: '  ring of protection ' })).toBe(true)
  })

  it('leaves a custom row with its own name alone', () => {
    expect(isMagicItem({ equipmentIndex: null, customName: 'Bag of interesting rocks' })).toBe(
      false,
    )
    expect(isMagicItem({ equipmentIndex: null, customName: '   ' })).toBe(false)
  })

  it('agrees with the magic-items collection on every name it carries', () => {
    for (const entry of MAGIC_ITEMS.all) {
      expect(isMagicItem({ equipmentIndex: null, customName: entry.name })).toBe(true)
    }
  })
})

describe('inventoryHoldsMagicItem', () => {
  it('is false for a level-1 kit', () => {
    expect(inventoryHoldsMagicItem(MUNDANE_KIT)).toBe(false)
    expect(inventoryHoldsMagicItem([])).toBe(false)
  })

  it('is true once a custom row carries a magic item name', () => {
    expect(
      inventoryHoldsMagicItem([
        ...MUNDANE_KIT,
        item({
          id: 'a1b2c3d4-0000-4000-8000-000000000006',
          equipmentIndex: null,
          customName: 'Ring of Protection',
        }),
      ]),
    ).toBe(true)
  })

  it('is true while any row is attuned, so a stored attunement stays reachable', () => {
    expect(inventoryHoldsMagicItem([item({ attuned: true })])).toBe(true)
  })
})

describe('packContents', () => {
  it('unfolds the priest’s pack into its seven lines with names and quantities', () => {
    const contents = packContents({ equipmentIndex: 'priests-pack' })

    expect(contents).toHaveLength(7)
    expect(contents).toContainEqual({ index: 'rations', name: 'Rations', quantity: 7 })
    expect(contents).toContainEqual({ index: 'holy-water', name: 'Holy Water', quantity: 1 })
  })

  it('finds a pack by its contents, not its category', () => {
    // The explorer’s pack is filed under plain adventuring gear in the SRD data.
    expect(EQUIPMENT.get('explorers-pack')?.categories).toEqual(['adventuring-gear'])
    expect(packContents({ equipmentIndex: 'explorers-pack' })).toHaveLength(8)
  })

  it('resolves every content line of every srd pack to an equipment name', () => {
    const packs = EQUIPMENT.all.filter((entry) => entry.contents.length > 0)
    expect(packs.map((pack) => pack.index).sort()).toEqual([
      'burglars-pack',
      'diplomat-pack',
      'dungeoneer-pack',
      'entertainers-pack',
      'explorers-pack',
      'priests-pack',
      'scholars-pack',
    ])
    for (const pack of packs) {
      for (const line of packContents({ equipmentIndex: pack.index })) {
        expect(line.name).toBe(EQUIPMENT.get(line.index)?.name)
      }
    }
  })

  it('is empty for a weapon, a custom row and an index the srd never had', () => {
    expect(packContents({ equipmentIndex: 'longsword' })).toEqual([])
    expect(packContents({ equipmentIndex: null })).toEqual([])
    expect(packContents({ equipmentIndex: 'bag-of-nothing' })).toEqual([])
  })
})
