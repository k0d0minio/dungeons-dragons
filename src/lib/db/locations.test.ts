import { getTableColumns } from 'drizzle-orm'

import {
  createCampaignLocation,
  deleteCampaignLocation,
  listCampaignLocations,
  locationPublicColumns,
  setLocationRevealed,
  updateCampaignLocation,
  type CampaignLocation,
} from './locations'
import { campaignLocations } from './schema'

// The same real-Drizzle-over-a-stub-driver pattern as `npcs.test.ts`, against
// the second revealable entity. The property is D38's, and it does not get
// weaker for being the second table to carry it: a DM's prep is the DM's, so
// every statement folds `campaigns.dm_user_id` into its WHERE, and the public
// layer is a named selection a player-facing read cannot widen by writing
// `select()`.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
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

const DM = 'user_2mFq8xKpLd'
const PLAYER = 'user_9zQw1nBvRt'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const LOCATION_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const LOCATION: CampaignLocation = {
  id: LOCATION_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  name: 'Kelp Harbour',
  summary: 'A fishing village with no fishermen left',
  description: 'Nets rotting on the racks. Every boat is still tied up.',
  secrets: 'The village pays the smugglers to keep the lighthouse dark.',
  dmNotes: 'The harbourmaster will lie about the Marigold twice before he breaks.',
}

/** A location row, positionally, as the Neon HTTP driver hands it back. */
function driverRow(location: CampaignLocation): unknown[] {
  return Object.keys(getTableColumns(campaignLocations)).map((column) => {
    const value = location[column as keyof CampaignLocation]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** One row saying "yes, this exists" — what the authority pre-reads select. */
const EXISTS_ROW = [[1]]

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('locationPublicColumns', () => {
  it('names the public layer and nothing else', () => {
    expect(Object.keys(locationPublicColumns).sort()).toEqual([
      'campaignId',
      'description',
      'id',
      'name',
      'revealedAt',
      'summary',
    ])
  })

  it('carries no DM-only column — the leak this selection exists to prevent', () => {
    expect(locationPublicColumns).not.toHaveProperty('secrets')
    expect(locationPublicColumns).not.toHaveProperty('dmNotes')
  })
})

describe('listCampaignLocations', () => {
  it('scopes to the DM and orders by name', async () => {
    mockRowsQueue = [EXISTS_ROW, [driverRow(LOCATION)]]

    const locations = await listCampaignLocations(DM, CAMPAIGN_ID)

    const [authority, list] = mockCalls

    expect(authority.sql).toContain('from "campaigns"')
    expect(authority.params).toEqual([CAMPAIGN_ID, DM, 1])

    expect(list.sql).toContain('from "campaign_locations"')
    expect(list.sql).toContain('exists')
    expect(list.sql).toContain('"dm_user_id"')
    expect(list.sql).toMatch(/order by .*"name" asc.*"created_at" asc/)

    expect(locations).toEqual([LOCATION])
  })

  it('is a miss for a campaign this DM does not run — nothing is read', async () => {
    mockRowsQueue = [[]]

    expect(await listCampaignLocations(PLAYER, CAMPAIGN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await listCampaignLocations(DM, 'not-a-uuid')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createCampaignLocation', () => {
  it('settles authority before inserting', async () => {
    mockRowsQueue = [EXISTS_ROW, [driverRow(LOCATION)]]

    const location = await createCampaignLocation(DM, CAMPAIGN_ID, { name: 'Kelp Harbour' })

    const [authority, insert] = mockCalls
    expect(authority.sql).toContain('from "campaigns"')
    expect(insert.sql).toContain('insert into "campaign_locations"')
    expect(insert.params).toContain(CAMPAIGN_ID)

    expect(location).toEqual(LOCATION)
  })

  it('never writes a revealed row — campaign content starts hidden', async () => {
    mockRowsQueue = [EXISTS_ROW, [driverRow(LOCATION)]]

    await createCampaignLocation(DM, CAMPAIGN_ID, {
      name: 'Kelp Harbour',
      secrets: 'The lighthouse is kept dark on purpose.',
    })

    // Positional, like the NPC roster's: whatever slot `revealed_at` occupies
    // must be `default`, never a bound parameter. It has no column default, so
    // that is NULL — hidden.
    const [, insert] = mockCalls
    const columns = insert.sql.slice(insert.sql.indexOf('(') + 1, insert.sql.indexOf(')'))
    const values = insert.sql.slice(
      insert.sql.indexOf('values (') + 8,
      insert.sql.indexOf(')', insert.sql.indexOf('values (')),
    )
    const at = columns.split(', ').indexOf('"revealed_at"')

    expect(at).toBeGreaterThanOrEqual(0)
    expect(values.split(', ')[at]).toBe('default')
  })

  it('refuses a campaign this DM does not run, without inserting', async () => {
    mockRowsQueue = [[]]

    expect(await createCampaignLocation(PLAYER, CAMPAIGN_ID, { name: 'Mine now' })).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed campaign id as a miss', async () => {
    expect(await createCampaignLocation(DM, 'not-a-uuid', { name: 'Kelp Harbour' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('updateCampaignLocation', () => {
  it('carries the DM, the campaign and the location in one statement', async () => {
    mockRows = [driverRow({ ...LOCATION, secrets: null })]

    const location = await updateCampaignLocation(DM, CAMPAIGN_ID, LOCATION_ID, { secrets: null })

    const [update] = mockCalls
    expect(update.sql).toContain('update "campaign_locations"')
    expect(update.sql).toContain('exists')
    expect(update.sql).toContain('"dm_user_id"')
    expect(update.params).toEqual(expect.arrayContaining([LOCATION_ID, CAMPAIGN_ID, DM]))

    expect(location?.secrets).toBeNull()
  })

  it('is a miss when the statement changed nothing', async () => {
    mockRows = []

    expect(
      await updateCampaignLocation(PLAYER, CAMPAIGN_ID, LOCATION_ID, { name: 'Mine now' }),
    ).toBeNull()
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await updateCampaignLocation(DM, CAMPAIGN_ID, 'nope', { name: 'x' })).toBeNull()
    expect(await updateCampaignLocation(DM, 'nope', LOCATION_ID, { name: 'x' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('setLocationRevealed', () => {
  it("stamps the reveal under the DM's authority, and writes nothing else", async () => {
    const revealedAt = new Date('2026-09-03T19:00:00.000Z')
    mockRows = [driverRow({ ...LOCATION, revealedAt })]

    const location = await setLocationRevealed(DM, CAMPAIGN_ID, LOCATION_ID, true)

    const [update] = mockCalls
    expect(update.sql).toContain('update "campaign_locations"')
    expect(update.sql).toContain('"dm_user_id"')
    expect(update.params).toEqual(expect.arrayContaining([LOCATION_ID, CAMPAIGN_ID, DM]))
    expect(update.params[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const [assignments] = update.sql.split(' set ')[1].split(' where ')
    expect(assignments).toContain('"revealed_at"')
    for (const column of ['name', 'summary', 'description', 'secrets']) {
      expect(assignments).not.toContain(column)
    }

    expect(location?.revealedAt).toEqual(revealedAt)
  })

  it('clears the stamp on an un-reveal — null is hidden', async () => {
    mockRows = [driverRow({ ...LOCATION, revealedAt: null })]

    const location = await setLocationRevealed(DM, CAMPAIGN_ID, LOCATION_ID, false)

    expect(mockCalls[0].params[0]).toBeNull()
    expect(location?.revealedAt).toBeNull()
  })

  it('is a miss for another DM, and for a malformed id before any statement', async () => {
    mockRows = []
    expect(await setLocationRevealed(PLAYER, CAMPAIGN_ID, LOCATION_ID, true)).toBeNull()

    mockCalls.length = 0
    expect(await setLocationRevealed(DM, CAMPAIGN_ID, 'nope', true)).toBeNull()
    expect(await setLocationRevealed(DM, 'nope', LOCATION_ID, true)).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteCampaignLocation', () => {
  it('deletes only within a campaign this DM runs', async () => {
    mockRows = [[LOCATION_ID]]

    expect(await deleteCampaignLocation(DM, CAMPAIGN_ID, LOCATION_ID)).toBe(true)

    const [remove] = mockCalls
    expect(remove.sql).toContain('delete from "campaign_locations"')
    expect(remove.sql).toContain('"dm_user_id"')
    expect(remove.params).toEqual(expect.arrayContaining([LOCATION_ID, CAMPAIGN_ID, DM]))
  })

  it('is false when there was nothing this DM could delete', async () => {
    mockRows = []

    expect(await deleteCampaignLocation(PLAYER, CAMPAIGN_ID, LOCATION_ID)).toBe(false)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await deleteCampaignLocation(DM, CAMPAIGN_ID, 'nope')).toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})
