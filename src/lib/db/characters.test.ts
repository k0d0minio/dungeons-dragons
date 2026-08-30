import { getTableColumns } from 'drizzle-orm'

import {
  createCharacter,
  deleteCharacter,
  getCharacter,
  listCharacters,
  updateCharacter,
  type Character,
} from './characters'
import { characters } from './schema'

// A real Drizzle instance over a stub driver, rather than a hand-rolled mock of
// the query builder. Drizzle compiles the actual SQL and maps the actual result
// rows, so these tests fail if a query stops being viewer-scoped — which is the
// only thing standing between one player and another player's characters.
type DriverCall = { sql: string; params: unknown[] }

// `mock`-prefixed so babel-plugin-jest-hoist allows the factory below to see it.
const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
// When set, each statement consumes the next result in turn — for the paths
// that issue more than one query (the conflict/missing re-read of DND-028).
let mockRowsQueue: unknown[][][] | undefined

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRowsQueue ? (mockRowsQueue.shift() ?? []) : mockRows }
}

jest.mock('./client', () => {
  // Required inside the factory, and the instance built lazily: the factory runs
  // while this module's own imports are still being evaluated, so anything it
  // touches at that moment is still in the temporal dead zone.
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

const OWNER = 'user_2mFq8xKpLd'
const OTHER_OWNER = 'user_9zQw1nBvRt'
const DM = 'user_5tHj3cWsYm'
const ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const FIXTURE: Character = {
  id: ID,
  ownerId: OWNER,
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 5,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 21,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: { '1': { max: 4, used: 2 }, '2': { max: 3, used: 0 } },
  conditions: ['prone'],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  skillProficiencies: [],
  skillExpertise: [],
  knownSpellIndexes: ['fireball', 'magic-missile'],
  preparedSpellIndexes: ['fireball'],
  concentration: null,
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  updatedAt: new Date('2026-08-13T09:30:00.000Z'),
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
}

/**
 * The compiled shape of the DND-027 viewer predicate: owner, OR the DM of a
 * campaign the character is in — an EXISTS against the join table, never a
 * role column. The parameter positions shift with the statement around it.
 */
function viewerPredicate(ownerParam: number, dmParam: number): string {
  return (
    `("characters"."owner_id" = $${ownerParam} or exists (select 1 from "character_campaigns" ` +
    'inner join "campaigns" on "character_campaigns"."campaign_id" = "campaigns"."id" ' +
    'where ("character_campaigns"."character_id" = "characters"."id" and ' +
    `"campaigns"."dm_user_id" = $${dmParam})))`
  )
}

/**
 * Encode a character the way the Neon HTTP driver hands rows back: a positional
 * array in table-column order, with Postgres' own text encodings for the types
 * Drizzle parses itself.
 */
function driverRow(character: Character): unknown[] {
  return Object.entries(getTableColumns(characters)).map(([column, definition]) => {
    const value = character[column as keyof Character]
    if (value instanceof Date) return value.toISOString()
    // A jsonb array (`class_resources`) travels as JSON text, not as a
    // Postgres array literal — the column type decides, not the JS type.
    if (definition.columnType === 'PgJsonb') return JSON.stringify(value)
    if (Array.isArray(value)) return `{${value.join(',')}}`
    if (value !== null && typeof value === 'object') return JSON.stringify(value)
    return value
  })
}

/** The single statement the call under test issued. */
function onlyCall(): DriverCall {
  expect(mockCalls).toHaveLength(1)
  return mockCalls[0]
}

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('listCharacters', () => {
  it('scopes the query to the owner and orders by most recently updated', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await listCharacters(OWNER)

    const { sql, params } = onlyCall()
    expect(sql).toContain('from "characters"')
    expect(sql).toContain('"characters"."owner_id" = $1')
    expect(sql).toContain('order by "characters"."updated_at" desc')
    // Owner-only on purpose: a DM reads the party through the campaign roster,
    // not by having everyone's characters mixed into their own list.
    expect(sql).not.toContain('exists')
    expect(params).toEqual([OWNER])
    expect(result).toEqual([FIXTURE])
  })

  it('returns an empty list when the owner has no characters', async () => {
    await expect(listCharacters(OWNER)).resolves.toEqual([])
  })
})

describe('getCharacter', () => {
  it('filters on the id and the viewer predicate (DND-027)', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await getCharacter(OWNER, ID)

    const { sql, params } = onlyCall()
    expect(sql).toContain('"characters"."id" = $1')
    expect(sql).toContain(viewerPredicate(2, 3))
    expect(params).toEqual([ID, OWNER, OWNER, 1])
    expect(result).toEqual(FIXTURE)
  })

  it('lets the DM of a campaign the character is in read it (D13)', async () => {
    mockRows = [driverRow(FIXTURE)]

    // The DM does not own this row; only the EXISTS arm of the predicate can
    // match, and both arms carry the same viewer id.
    const result = await getCharacter(DM, ID)

    const { sql, params } = onlyCall()
    expect(sql).toContain(
      'exists (select 1 from "character_campaigns" inner join "campaigns" ' +
        'on "character_campaigns"."campaign_id" = "campaigns"."id" ' +
        'where ("character_campaigns"."character_id" = "characters"."id" ' +
        'and "campaigns"."dm_user_id" = $3))',
    )
    expect(params).toEqual([ID, DM, DM, 1])
    expect(result).toEqual(FIXTURE)
  })

  it('returns null for a character belonging to someone else', async () => {
    // The row filter is the database's job; a viewer mismatch simply matches
    // nothing, and the caller must not be able to tell that apart from a 404.
    await expect(getCharacter(OTHER_OWNER, ID)).resolves.toBeNull()
    expect(onlyCall().params).toEqual([ID, OTHER_OWNER, OTHER_OWNER, 1])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(getCharacter(OWNER, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createCharacter', () => {
  const input = {
    name: 'Vex Ashbrand',
    classIndex: 'wizard',
    speciesIndex: 'half-elf',
    level: 5,
    intelligence: 18,
    maxHitPoints: 32,
  }

  it('attaches the owner and returns the stored row', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await createCharacter(OWNER, input)

    const { sql, params } = onlyCall()
    expect(sql).toContain('insert into "characters"')
    expect(sql).toContain('returning')
    // Columns the caller left out are written as `default`, not as parameters,
    // so the schema defaults are what a sparse creation form actually gets.
    expect(params).toEqual([OWNER, 'Vex Ashbrand', 'wizard', 'half-elf', 5, 18, 32, 32])
    expect(result).toEqual(FIXTURE)
  })

  it('starts a new character at full hit points', async () => {
    mockRows = [driverRow(FIXTURE)]

    await createCharacter(OWNER, input)

    // max_hit_points then current_hit_points — the second is inferred, not supplied.
    expect(onlyCall().params.slice(-2)).toEqual([32, 32])
  })

  it('honours an explicit current hit points value', async () => {
    mockRows = [driverRow(FIXTURE)]

    await createCharacter(OWNER, { ...input, currentHitPoints: 7 })

    expect(onlyCall().params.slice(-2)).toEqual([32, 7])
  })
})

describe('updateCharacter', () => {
  it('scopes the update to the viewer and touches updated_at', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await updateCharacter(OWNER, ID, { currentHitPoints: 4 })

    const { sql, params } = onlyCall()
    expect(sql).toContain('update "characters" set')
    expect(sql).toContain('"current_hit_points" = $1')
    expect(sql).toContain('"updated_at" = $2')
    expect(sql).toContain('"characters"."id" = $3')
    expect(sql).toContain(viewerPredicate(4, 5))
    expect(params[0]).toBe(4)
    // Drizzle hands timestamps to the driver as ISO strings, not Date objects.
    expect(params[1]).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/))
    expect(params.slice(2)).toEqual([ID, OWNER, OWNER])
    expect(result).toEqual({ outcome: 'updated', character: FIXTURE })
  })

  it('bumps the version on every write, checked or not (DND-028)', async () => {
    mockRows = [driverRow(FIXTURE)]

    await updateCharacter(OWNER, ID, { currentHitPoints: 4 })

    const { sql } = onlyCall()
    expect(sql).toContain('"version" = "characters"."version" + 1')
    // No expectedVersion was passed, so nothing guards the WHERE clause.
    expect(sql).not.toContain('"characters"."version" = $')
  })

  it('lets the DM of a campaign the character is in write to it (D13)', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await updateCharacter(DM, ID, { currentHitPoints: 4 })

    const { sql, params } = onlyCall()
    expect(sql).toContain('exists (select 1 from "character_campaigns"')
    expect(sql).toContain('"campaigns"."dm_user_id" = $5')
    expect(params.slice(2)).toEqual([ID, DM, DM])
    expect(result).toEqual({ outcome: 'updated', character: FIXTURE })
  })

  it('adds the expected version to the WHERE clause when given one', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await updateCharacter(OWNER, ID, { currentHitPoints: 4 }, 7)

    const { sql, params } = onlyCall()
    expect(sql).toContain('"characters"."version" = $6')
    expect(params.slice(2)).toEqual([ID, OWNER, OWNER, 7])
    expect(result).toEqual({ outcome: 'updated', character: FIXTURE })
  })

  it('reports a conflict when the guarded write misses but the row is still visible', async () => {
    // The UPDATE matches nothing (the version moved), the viewer-scoped
    // re-read still finds the row — that is a stale writer, not a missing row.
    mockRowsQueue = [[], [driverRow({ ...FIXTURE, version: 8 })]]

    const result = await updateCharacter(OWNER, ID, { currentHitPoints: 4 }, 7)

    expect(mockCalls).toHaveLength(2)
    expect(mockCalls[0].sql).toContain('update "characters" set')
    expect(mockCalls[1].sql).toContain('select')
    // The re-read is viewer-scoped too, so a stale *foreign* id still 404s.
    expect(mockCalls[1].sql).toContain(viewerPredicate(2, 3))
    expect(mockCalls[1].params).toEqual([ID, OWNER, OWNER, 1])
    expect(result).toEqual({ outcome: 'conflict', character: { ...FIXTURE, version: 8 } })
  })

  it('reports a miss when neither the write nor the re-read finds the row', async () => {
    mockRowsQueue = [[], []]

    const result = await updateCharacter(OTHER_OWNER, ID, { level: 6 }, 7)

    expect(mockCalls).toHaveLength(2)
    expect(result).toEqual({ outcome: 'missing' })
  })

  it('re-reads even without a version guard, to tell conflict from missing', async () => {
    const result = await updateCharacter(OTHER_OWNER, ID, { level: 6 })

    expect(mockCalls).toHaveLength(2)
    expect(result).toEqual({ outcome: 'missing' })
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(updateCharacter(OWNER, 'not-a-uuid', { level: 6 })).resolves.toEqual({
      outcome: 'missing',
    })
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteCharacter', () => {
  it('scopes the delete to the owner and reports success', async () => {
    mockRows = [[ID]]

    await expect(deleteCharacter(OWNER, ID)).resolves.toBe(true)

    const { sql, params } = onlyCall()
    expect(sql).toContain('delete from "characters"')
    expect(sql).toContain('"characters"."id" = $1')
    expect(sql).toContain('"characters"."owner_id" = $2')
    // D13 grants "sees and edits", not "deletes" — no DM arm here.
    expect(sql).not.toContain('exists')
    expect(params).toEqual([ID, OWNER])
  })

  it('reports failure when the character is not the owner’s', async () => {
    await expect(deleteCharacter(OTHER_OWNER, ID)).resolves.toBe(false)
  })

  it('treats a malformed id as a miss without querying', async () => {
    expect(mockCalls).toHaveLength(0)
    await expect(deleteCharacter(OWNER, 'not-a-uuid')).resolves.toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})
