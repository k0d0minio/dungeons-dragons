import { getTableColumns } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'

import {
  addCampaignMember,
  addCharacterToCampaign,
  createCampaign,
  deleteCampaign,
  getCampaign,
  listCampaignCharacterIds,
  listCampaignMembers,
  listCampaignsForDm,
  removeCampaignMember,
  removeCharacterFromCampaign,
  updateCampaign,
  type Campaign,
  type CampaignCharacter,
  type CampaignMember,
} from './campaigns'
import { campaignCharacters, campaignMembers, campaigns } from './schema'

// Same approach as `characters.test.ts`: a real Drizzle instance over a stub
// driver, so these assert the SQL Drizzle actually compiles. What they are
// guarding is narrower than the character tests, and worth saying out loud —
// DND-026 grants nobody anything, so every one of these queries must be
// unreachable for somebody who is not the campaign's DM. The negative cases are
// the point; DND-027 is where character reads widen, with its own.
type DriverCall = { sql: string; params: unknown[] }

// `mock`-prefixed so babel-plugin-jest-hoist allows the factory below to see it.
const mockCalls: DriverCall[] = []

// One row-set per statement, in the order they are issued: the membership
// functions authorise with a campaign lookup and then write, so a single shared
// result would let a test pass for the wrong reason.
let mockResults: unknown[][][] = []

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockResults.shift() ?? [] }
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

const DM = 'user_2mFq8xKpLd'
const OTHER_DM = 'user_9zQw1nBvRt'
const PLAYER = 'user_7hJk3sNvQe'
const CAMPAIGN_ID = '8c2d1e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const CAMPAIGN: Campaign = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Sunless Citadel',
  createdAt: new Date('2026-08-15T10:00:00.000Z'),
  updatedAt: new Date('2026-08-15T10:00:00.000Z'),
}

const MEMBER: CampaignMember = {
  campaignId: CAMPAIGN_ID,
  userId: PLAYER,
  role: 'player',
  createdAt: new Date('2026-08-15T10:05:00.000Z'),
}

const ASSOCIATION: CampaignCharacter = {
  campaignId: CAMPAIGN_ID,
  characterId: CHARACTER_ID,
  createdAt: new Date('2026-08-15T10:06:00.000Z'),
}

/**
 * Encode a row the way the Neon HTTP driver hands it back: a positional array in
 * table-column order, with Postgres' own text encodings for the types Drizzle
 * parses itself.
 */
function driverRow<T extends object>(table: PgTable, row: T): unknown[] {
  return Object.keys(getTableColumns(table)).map((column) => {
    const value = row[column as keyof T]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** Queue the rows each statement, in order, should return. */
function willReturn(...rowSets: unknown[][][]): void {
  mockResults = rowSets
}

/** The single statement the call under test issued. */
function onlyCall(): DriverCall {
  expect(mockCalls).toHaveLength(1)
  return mockCalls[0]
}

/** The statement issued after the campaign-ownership lookup. */
function callAfterLookup(): DriverCall {
  expect(mockCalls).toHaveLength(2)
  expect(mockCalls[0].sql).toContain('from "campaigns"')
  expect(mockCalls[0].params).toEqual([CAMPAIGN_ID, DM, 1])
  return mockCalls[1]
}

beforeEach(() => {
  mockCalls.length = 0
  mockResults = []
})

describe('listCampaignsForDm', () => {
  it('scopes the query to the DM and orders by name', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)])

    const result = await listCampaignsForDm(DM)

    const { sql, params } = onlyCall()
    expect(sql).toContain('from "campaigns"')
    expect(sql).toContain('"campaigns"."dm_user_id" = $1')
    expect(sql).toContain('order by "campaigns"."name" asc')
    expect(params).toEqual([DM])
    expect(result).toEqual([CAMPAIGN])
  })

  it('returns an empty list for a DM who runs nothing', async () => {
    await expect(listCampaignsForDm(OTHER_DM)).resolves.toEqual([])
  })
})

describe('getCampaign', () => {
  it('filters on both id and DM', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)])

    const result = await getCampaign(DM, CAMPAIGN_ID)

    const { sql, params } = onlyCall()
    expect(sql).toContain('"campaigns"."id" = $1')
    expect(sql).toContain('"campaigns"."dm_user_id" = $2')
    expect(params).toEqual([CAMPAIGN_ID, DM, 1])
    expect(result).toEqual(CAMPAIGN)
  })

  it('returns null for a campaign run by someone else', async () => {
    await expect(getCampaign(OTHER_DM, CAMPAIGN_ID)).resolves.toBeNull()
    expect(onlyCall().params).toEqual([CAMPAIGN_ID, OTHER_DM, 1])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(getCampaign(DM, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createCampaign', () => {
  it('attaches the DM and returns the stored row', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)])

    const result = await createCampaign(DM, { name: 'The Sunless Citadel' })

    const { sql, params } = onlyCall()
    expect(sql).toContain('insert into "campaigns"')
    expect(sql).toContain('returning')
    expect(params).toEqual([DM, 'The Sunless Citadel'])
    expect(result).toEqual(CAMPAIGN)
  })
})

describe('updateCampaign', () => {
  it('scopes the update to the DM and touches updated_at', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)])

    const result = await updateCampaign(DM, CAMPAIGN_ID, { name: 'Descent into Avernus' })

    const { sql, params } = onlyCall()
    expect(sql).toContain('update "campaigns" set')
    expect(sql).toContain('"campaigns"."dm_user_id" = $4')
    expect(params[0]).toBe('Descent into Avernus')
    // Drizzle hands timestamps to the driver as ISO strings, not Date objects.
    expect(params[1]).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/))
    expect(params.slice(2)).toEqual([CAMPAIGN_ID, DM])
    expect(result).toEqual(CAMPAIGN)
  })

  it('returns null when the update matched nothing', async () => {
    await expect(updateCampaign(OTHER_DM, CAMPAIGN_ID, { name: 'Mine now' })).resolves.toBeNull()
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(updateCampaign(DM, 'not-a-uuid', { name: 'x' })).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteCampaign', () => {
  it('scopes the delete to the DM and leaves the cascade to the database', async () => {
    willReturn([[CAMPAIGN_ID]])

    await expect(deleteCampaign(DM, CAMPAIGN_ID)).resolves.toBe(true)

    // One statement, not three. `neon-http` has no transactions, so the members
    // and associations go with the campaign by ON DELETE CASCADE or not at all.
    const { sql, params } = onlyCall()
    expect(sql).toContain('delete from "campaigns"')
    expect(sql).toContain('"campaigns"."dm_user_id" = $2')
    expect(params).toEqual([CAMPAIGN_ID, DM])
  })

  it('reports failure for a campaign run by someone else', async () => {
    await expect(deleteCampaign(OTHER_DM, CAMPAIGN_ID)).resolves.toBe(false)
  })
})

describe('listCampaignMembers', () => {
  it('lists the table of a campaign the DM runs', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)], [driverRow(campaignMembers, MEMBER)])

    const result = await listCampaignMembers(DM, CAMPAIGN_ID)

    const { sql, params } = callAfterLookup()
    expect(sql).toContain('from "campaign_members"')
    expect(sql).toContain('"campaign_members"."campaign_id" = $1')
    expect(params).toEqual([CAMPAIGN_ID])
    expect(result).toEqual([MEMBER])
  })

  it('returns nothing, and reads no membership, for a campaign the caller does not run', async () => {
    await expect(listCampaignMembers(OTHER_DM, CAMPAIGN_ID)).resolves.toEqual([])
    expect(onlyCall().sql).toContain('from "campaigns"')
  })
})

describe('addCampaignMember', () => {
  it('seats a player in a campaign the DM runs', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)], [driverRow(campaignMembers, MEMBER)])

    const result = await addCampaignMember(DM, CAMPAIGN_ID, PLAYER)

    const { sql, params } = callAfterLookup()
    expect(sql).toContain('insert into "campaign_members"')
    expect(params).toEqual([CAMPAIGN_ID, PLAYER, 'player'])
    expect(result).toEqual(MEMBER)
  })

  it('derives the role from the campaign, so the DM cannot be seated as anything else', async () => {
    willReturn(
      [driverRow(campaigns, CAMPAIGN)],
      [driverRow(campaignMembers, { ...MEMBER, userId: DM, role: 'dm' })]
    )

    const result = await addCampaignMember(DM, CAMPAIGN_ID, DM)

    // The DM at this table also plays, so they get a member row like everybody
    // else — but `role` comes from `campaigns.dm_user_id`, never from a caller.
    expect(callAfterLookup().params).toEqual([CAMPAIGN_ID, DM, 'dm'])
    expect(result?.role).toBe('dm')
  })

  it('treats re-adding a member as success rather than a duplicate-key error', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)], [driverRow(campaignMembers, MEMBER)])

    await addCampaignMember(DM, CAMPAIGN_ID, PLAYER)

    expect(callAfterLookup().sql).toContain('on conflict')
  })

  it('refuses, and writes nothing, for a campaign the caller does not run', async () => {
    await expect(addCampaignMember(OTHER_DM, CAMPAIGN_ID, PLAYER)).resolves.toBeNull()
    expect(onlyCall().sql).toContain('from "campaigns"')
  })
})

describe('removeCampaignMember', () => {
  it('removes a member of a campaign the DM runs', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)], [[PLAYER]])

    await expect(removeCampaignMember(DM, CAMPAIGN_ID, PLAYER)).resolves.toBe(true)

    const { sql, params } = callAfterLookup()
    expect(sql).toContain('delete from "campaign_members"')
    expect(params).toEqual([CAMPAIGN_ID, PLAYER])
  })

  it('refuses, and deletes nothing, for a campaign the caller does not run', async () => {
    await expect(removeCampaignMember(OTHER_DM, CAMPAIGN_ID, PLAYER)).resolves.toBe(false)
    expect(onlyCall().sql).toContain('from "campaigns"')
  })
})

describe('listCampaignCharacterIds', () => {
  it('returns the ids of the characters in a campaign the DM runs', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)], [[CHARACTER_ID]])

    const result = await listCampaignCharacterIds(DM, CAMPAIGN_ID)

    const { sql, params } = callAfterLookup()
    expect(sql).toContain('from "campaign_characters"')
    // Ids only. Reading the characters themselves would widen who can see
    // character data, which is DND-027's change to make, not this one's.
    expect(sql).not.toContain('from "characters"')
    expect(params).toEqual([CAMPAIGN_ID])
    expect(result).toEqual([CHARACTER_ID])
  })

  it('returns nothing for a campaign the caller does not run', async () => {
    await expect(listCampaignCharacterIds(OTHER_DM, CAMPAIGN_ID)).resolves.toEqual([])
    expect(onlyCall().sql).toContain('from "campaigns"')
  })
})

describe('addCharacterToCampaign', () => {
  it('associates a character with a campaign the DM runs', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)], [driverRow(campaignCharacters, ASSOCIATION)])

    const result = await addCharacterToCampaign(DM, CAMPAIGN_ID, CHARACTER_ID)

    const { sql, params } = callAfterLookup()
    expect(sql).toContain('insert into "campaign_characters"')
    // Idempotent: a character already in the campaign is not an error, and the
    // association keeps the date it was really made.
    expect(sql).toContain('on conflict')
    expect(params).toEqual([CAMPAIGN_ID, CHARACTER_ID])
    expect(result).toEqual(ASSOCIATION)
  })

  it('refuses, and writes nothing, for a campaign the caller does not run', async () => {
    await expect(addCharacterToCampaign(OTHER_DM, CAMPAIGN_ID, CHARACTER_ID)).resolves.toBeNull()
    expect(onlyCall().sql).toContain('from "campaigns"')
  })

  it('treats a malformed character id as a miss without querying', async () => {
    await expect(addCharacterToCampaign(DM, CAMPAIGN_ID, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('removeCharacterFromCampaign', () => {
  it('deletes the association and not the character', async () => {
    willReturn([driverRow(campaigns, CAMPAIGN)], [[CHARACTER_ID]])

    await expect(removeCharacterFromCampaign(DM, CAMPAIGN_ID, CHARACTER_ID)).resolves.toBe(true)

    const { sql, params } = callAfterLookup()
    expect(sql).toContain('delete from "campaign_characters"')
    expect(sql).not.toContain('delete from "characters"')
    expect(params).toEqual([CAMPAIGN_ID, CHARACTER_ID])
  })

  it('refuses, and deletes nothing, for a campaign the caller does not run', async () => {
    await expect(
      removeCharacterFromCampaign(OTHER_DM, CAMPAIGN_ID, CHARACTER_ID)
    ).resolves.toBe(false)
    expect(onlyCall().sql).toContain('from "campaigns"')
  })
})
