import { getTableColumns } from 'drizzle-orm'

import {
  addItem,
  deleteItem,
  equippedArmorByCharacter,
  listItems,
  updateItem,
  type CharacterItem,
} from './items'
import { characterItems } from './schema'

// Same harness as `characters.test.ts`: a real Drizzle instance over a stub
// driver, so these tests compile the actual SQL — and fail if an inventory
// query ever stops being scoped through the viewer predicate on `characters`,
// which is the only thing keeping one player out of another's saddlebags.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
// Each statement consumes the next result in turn — most item writes are a
// visibility check, sometimes a count, then the write.
let mockRowsQueue: unknown[][][] | undefined

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRowsQueue ? (mockRowsQueue.shift() ?? []) : mockRows }
}

jest.mock('./client', () => {
  let db: ReturnType<typeof import('drizzle-orm/neon-http').drizzle> | undefined

  return {
    getDb: () => {
      const { drizzle } = require('drizzle-orm/neon-http')
      db ??= drizzle(mockClient)
      return db
    },
    isDatabaseConfigured: () => true,
  }
})

const VIEWER = 'user_2mFq8xKpLd'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const ITEM_ID = '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

const FIXTURE: CharacterItem = {
  id: ITEM_ID,
  characterId: CHARACTER_ID,
  equipmentIndex: 'longsword',
  customName: null,
  quantity: 1,
  equipped: true,
  attuned: false,
  notes: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

/**
 * The compiled shape of the scoping every item statement must carry: an
 * EXISTS on `characters` folding in the DND-027 viewer predicate (owner or
 * campaign DM), correlated to the item's own `character_id`.
 */
const ITEM_SCOPE =
  'exists (select 1 from "characters" where ' +
  '("characters"."id" = "character_items"."character_id" and ' +
  '("characters"."owner_id" = $'

function driverRow(item: CharacterItem): unknown[] {
  return Object.keys(getTableColumns(characterItems)).map((column) => {
    const value = item[column as keyof CharacterItem]
    if (value instanceof Date) return value.toISOString()
    return value
  })
}

/** A one-row result for the `characterVisible` probe. */
const VISIBLE = [[1]]

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

// The worn armour of a party, for the glance and the list
// (`first-table/glance-derived-ac`): one statement, ids in, SRD armour
// details out, every id answered.
describe('equippedArmorByCharacter', () => {
  const OTHER_ID = '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e'

  it('reads the equipped rows of the given characters in one statement, armour only', async () => {
    mockRows = [
      [CHARACTER_ID, 'chain-mail'],
      [CHARACTER_ID, 'shield'],
      [CHARACTER_ID, 'longsword'],
      [OTHER_ID, null],
    ]

    const armor = await equippedArmorByCharacter([CHARACTER_ID, OTHER_ID])

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('from "character_items"')
    expect(sql).toContain('"character_items"."equipped" = $')
    expect(sql).not.toContain('"characters"')
    expect(params).toEqual(expect.arrayContaining([CHARACTER_ID, OTHER_ID]))

    expect(armor[CHARACTER_ID].map((detail) => detail.index)).toEqual(['chain-mail', 'shield'])
    expect(armor[CHARACTER_ID][0].armorClass).toEqual({ base: 16, dexBonus: false, maxBonus: 0 })
    // Asked about, wearing nothing: present, and empty.
    expect(armor[OTHER_ID]).toEqual([])
  })

  it('answers an empty map for no ids, and drops malformed ones without querying', async () => {
    expect(await equippedArmorByCharacter([])).toEqual({})
    expect(await equippedArmorByCharacter(['not-a-uuid'])).toEqual({})
    expect(mockCalls).toHaveLength(0)
  })
})

describe('listItems', () => {
  it('scopes the query through the viewer predicate and orders by acquisition', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await listItems(VIEWER, CHARACTER_ID)

    const { sql, params } = mockCalls[0]
    expect(sql).toContain('from "character_items"')
    expect(sql).toContain('"character_items"."character_id" = $1')
    expect(sql).toContain(ITEM_SCOPE)
    expect(sql).toContain('order by "character_items"."created_at" asc')
    expect(params).toEqual([CHARACTER_ID, VIEWER, VIEWER])
    expect(result).toEqual([FIXTURE])
  })

  it('tells an empty inventory apart from an invisible character', async () => {
    // No items, but the viewer-scoped probe finds the character: empty list.
    mockRowsQueue = [[], VISIBLE]
    await expect(listItems(VIEWER, CHARACTER_ID)).resolves.toEqual([])

    // No items and no visible character: null, which the route turns into 404.
    mockRowsQueue = [[], []]
    await expect(listItems(VIEWER, CHARACTER_ID)).resolves.toBeNull()
  })

  it('treats a malformed character id as a miss without querying', async () => {
    await expect(listItems(VIEWER, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('addItem', () => {
  it('checks visibility with the viewer predicate before inserting', async () => {
    mockRowsQueue = [VISIBLE, [driverRow(FIXTURE)]]

    const result = await addItem(VIEWER, CHARACTER_ID, {
      equipmentIndex: 'longsword',
      equipped: true,
    })

    expect(mockCalls).toHaveLength(2)
    expect(mockCalls[0].sql).toContain('from "characters"')
    expect(mockCalls[0].sql).toContain('"characters"."owner_id" = $2')
    expect(mockCalls[0].params).toEqual([CHARACTER_ID, VIEWER, VIEWER, 1])
    expect(mockCalls[1].sql).toContain('insert into "character_items"')
    expect(mockCalls[1].sql).toContain('returning')
    expect(result).toEqual({ outcome: 'written', item: FIXTURE })
  })

  it('is a miss for a character the viewer may not see, without writing', async () => {
    mockRowsQueue = [[]]

    const result = await addItem(VIEWER, CHARACTER_ID, { equipmentIndex: 'longsword' })

    expect(result).toEqual({ outcome: 'missing' })
    expect(mockCalls).toHaveLength(1)
  })

  it('refuses a fourth attunement in app logic, not SQL', async () => {
    // Visible, then three items already attuned.
    mockRowsQueue = [VISIBLE, [[3]]]

    const result = await addItem(VIEWER, CHARACTER_ID, {
      customName: 'Ring of Winter',
      attuned: true,
    })

    expect(result).toEqual({ outcome: 'attunement-limit' })
    // The count query filtered on attuned items of this character…
    expect(mockCalls[1].sql).toContain('count')
    expect(mockCalls[1].sql).toContain('"character_items"."attuned" = $2')
    // …and nothing was inserted.
    expect(mockCalls).toHaveLength(2)
  })

  it('does not count attunement for an item arriving unattuned', async () => {
    mockRowsQueue = [VISIBLE, [driverRow(FIXTURE)]]

    await addItem(VIEWER, CHARACTER_ID, { equipmentIndex: 'longsword' })

    // Visibility probe, then straight to the insert — no count in between.
    expect(mockCalls).toHaveLength(2)
    expect(mockCalls[1].sql).toContain('insert')
  })
})

describe('updateItem', () => {
  it('scopes the update to the item, the character and the viewer', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await updateItem(VIEWER, CHARACTER_ID, ITEM_ID, { equipped: false })

    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "character_items" set')
    expect(sql).toContain('"equipped" = $1')
    expect(sql).toContain('"updated_at" = $2')
    expect(sql).toContain('"character_items"."id" = $3')
    expect(sql).toContain('"character_items"."character_id" = $4')
    expect(sql).toContain(ITEM_SCOPE)
    expect(params.slice(2)).toEqual([ITEM_ID, CHARACTER_ID, VIEWER, VIEWER])
    expect(result).toEqual({ outcome: 'written', item: FIXTURE })
  })

  it('is a miss when the scoped update matches nothing', async () => {
    mockRows = []

    await expect(updateItem(VIEWER, CHARACTER_ID, ITEM_ID, { quantity: 2 })).resolves.toEqual({
      outcome: 'missing',
    })
  })

  it('refuses attuning past the cap, counting the other items only', async () => {
    mockRowsQueue = [VISIBLE, [[3]]]

    const result = await updateItem(VIEWER, CHARACTER_ID, ITEM_ID, { attuned: true })

    expect(result).toEqual({ outcome: 'attunement-limit' })
    // Excluding the item being toggled, so re-saving an attuned item passes.
    expect(mockCalls[1].sql).toContain('<>')
    expect(mockCalls[1].params).toContain(ITEM_ID)
    expect(mockCalls).toHaveLength(2)
  })

  it('lets a third attunement through', async () => {
    mockRowsQueue = [VISIBLE, [[2]], [driverRow({ ...FIXTURE, attuned: true })]]

    const result = await updateItem(VIEWER, CHARACTER_ID, ITEM_ID, { attuned: true })

    expect(result.outcome).toBe('written')
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(updateItem(VIEWER, CHARACTER_ID, 'nope', { quantity: 2 })).resolves.toEqual({
      outcome: 'missing',
    })
    await expect(updateItem(VIEWER, 'nope', ITEM_ID, { quantity: 2 })).resolves.toEqual({
      outcome: 'missing',
    })
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteItem', () => {
  it('scopes the delete like the update and reports success', async () => {
    mockRows = [[ITEM_ID]]

    await expect(deleteItem(VIEWER, CHARACTER_ID, ITEM_ID)).resolves.toBe(true)

    const { sql, params } = mockCalls[0]
    expect(sql).toContain('delete from "character_items"')
    expect(sql).toContain('"character_items"."id" = $1')
    expect(sql).toContain('"character_items"."character_id" = $2')
    expect(sql).toContain(ITEM_SCOPE)
    expect(params).toEqual([ITEM_ID, CHARACTER_ID, VIEWER, VIEWER])
  })

  it('reports failure when nothing this viewer could see matched', async () => {
    await expect(deleteItem(VIEWER, CHARACTER_ID, ITEM_ID)).resolves.toBe(false)
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(deleteItem(VIEWER, CHARACTER_ID, 'nope')).resolves.toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})
