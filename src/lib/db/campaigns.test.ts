import { getTableColumns } from 'drizzle-orm'

import {
  createCampaign,
  generateJoinCode,
  getCampaignByJoinCode,
  getCampaignForDm,
  joinCampaignByCode,
  regenerateJoinCode,
  type Campaign,
} from './campaigns'
import { campaigns } from './schema'

// The same real-Drizzle-over-a-stub-driver pattern as `characters.test.ts`.
// The property under test is the authority model: `dm_user_id` folded into
// every DM-scoped WHERE clause, ownership re-checked in SQL before a character
// is linked, and a foreign campaign indistinguishable from a fictional one.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
// Each statement consumes the next result in turn — these functions issue
// several statements per call.
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
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const JOIN_CODE = 'kfEbCq3vX9pLm2Rt8sWz1A'

const FIXTURE: Campaign = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: JOIN_CODE,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

/** Encode a campaign the way the Neon HTTP driver hands rows back. */
function driverRow(campaign: Campaign): unknown[] {
  return Object.keys(getTableColumns(campaigns)).map((column) => {
    const value = campaign[column as keyof Campaign]
    return value instanceof Date ? value.toISOString() : value
  })
}

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('generateJoinCode', () => {
  it('is 128 bits of base64url — code-shaped and unguessable', () => {
    const code = generateJoinCode()

    expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(generateJoinCode()).not.toBe(code)
  })
})

describe('createCampaign', () => {
  it('inserts the campaign with its DM and a live join code, then the DM roster row', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], []]

    const result = await createCampaign(DM, '  The Rime of the Frostmaiden  ')

    expect(mockCalls).toHaveLength(2)

    const [insert, member] = mockCalls
    expect(insert.sql).toContain('insert into "campaigns"')
    expect(insert.sql).toContain('returning')
    // dm_user_id, the trimmed name, and a generated code — nothing else varies.
    expect(insert.params[0]).toBe(DM)
    expect(insert.params[1]).toBe('The Rime of the Frostmaiden')
    expect(insert.params[2]).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(insert.params).toHaveLength(3)

    // Jamie plays at his own table: the DM lands on the roster, as a label,
    // idempotently — the schema's warning says this row grants nothing.
    expect(member.sql).toContain('insert into "campaign_members"')
    expect(member.sql).toContain('on conflict do nothing')
    expect(member.params).toEqual([CAMPAIGN_ID, DM, 'dm'])

    expect(result).toEqual(FIXTURE)
  })
})

describe('getCampaignForDm', () => {
  it('filters on both id and dm_user_id', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await getCampaignForDm(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('"campaigns"."id" = $1')
    expect(sql).toContain('"campaigns"."dm_user_id" = $2')
    expect(params).toEqual([CAMPAIGN_ID, DM, 1])
    expect(result).toEqual(FIXTURE)
  })

  it('returns null for a campaign someone else runs', async () => {
    // A foreign campaign matches nothing — indistinguishable from one that
    // does not exist, exactly like a foreign character id.
    await expect(getCampaignForDm(PLAYER, CAMPAIGN_ID)).resolves.toBeNull()
    expect(mockCalls[0].params).toEqual([CAMPAIGN_ID, PLAYER, 1])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(getCampaignForDm(DM, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('getCampaignByJoinCode', () => {
  it('looks the code up when it is code-shaped', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await getCampaignByJoinCode(JOIN_CODE)

    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('"campaigns"."join_code" = $1')
    expect(mockCalls[0].params).toEqual([JOIN_CODE, 1])
    expect(result).toEqual(FIXTURE)
  })

  it.each([
    ['too short', 'shortcode'],
    ['not base64url', 'kfEbCq3vX9pLm2Rt8sWz1A!!'],
    ['sql-ish garbage off a url', "' or 1=1 --------------"],
    ['empty', ''],
  ])('rejects a malformed code (%s) without querying', async (_label, code) => {
    await expect(getCampaignByJoinCode(code)).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('joinCampaignByCode', () => {
  it('answers null to a dead code and writes nothing', async () => {
    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, [CHARACTER_ID])

    expect(result).toBeNull()
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('select')
    expect(mockCalls[0].sql).not.toContain('insert')
  })

  it('seats the joiner as a player and links only characters they own', async () => {
    mockRowsQueue = [
      [driverRow(FIXTURE)], // the campaign behind the code
      [], // member upsert
      [[CHARACTER_ID]], // the ownership-scoped character select
      [], // the link insert
    ]

    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, [CHARACTER_ID])

    expect(mockCalls).toHaveLength(4)
    const [, member, owned, link] = mockCalls

    expect(member.sql).toContain('insert into "campaign_members"')
    expect(member.sql).toContain('on conflict do nothing')
    expect(member.params).toEqual([CAMPAIGN_ID, PLAYER, 'player'])

    // Ownership is re-checked in SQL before anything is linked: whatever ids
    // arrive, only rows with this joiner's owner_id come back.
    expect(owned.sql).toContain('from "characters"')
    expect(owned.sql).toContain('"characters"."id" in ($1)')
    expect(owned.sql).toContain('"characters"."owner_id" = $2')
    expect(owned.params).toEqual([CHARACTER_ID, PLAYER])

    expect(link.sql).toContain('insert into "character_campaigns"')
    expect(link.sql).toContain('on conflict do nothing')
    expect(link.params).toEqual([CHARACTER_ID, CAMPAIGN_ID])

    expect(result).toEqual(FIXTURE)
  })

  it('seats the DM as dm when they join their own table', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], []]

    await joinCampaignByCode(DM, JOIN_CODE, [])

    expect(mockCalls[1].params).toEqual([CAMPAIGN_ID, DM, 'dm'])
  })

  it('links nothing when the owner check returns no rows', async () => {
    // The select found none of the requested ids under this owner — a
    // tampered request dies quietly, with no character_campaigns insert.
    mockRowsQueue = [[driverRow(FIXTURE)], [], []]

    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, [CHARACTER_ID])

    expect(mockCalls).toHaveLength(3)
    expect(result).toEqual(FIXTURE)
  })

  it('drops malformed character ids before they reach a query', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], []]

    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, ['not-a-uuid'])

    // The member row lands; the character select never happens.
    expect(mockCalls).toHaveLength(2)
    expect(result).toEqual(FIXTURE)
  })
})

describe('regenerateJoinCode', () => {
  it('replaces the code, scoped to the DM who runs the campaign', async () => {
    const rotated = { ...FIXTURE, joinCode: 'aaaaaaaaaaaaaaaaaaaaaa' }
    mockRows = [driverRow(rotated)]

    const result = await regenerateJoinCode(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "campaigns" set')
    expect(sql).toContain('"join_code" = $1')
    expect(sql).toContain('"updated_at" = $2')
    expect(sql).toContain('"campaigns"."id" = $3')
    expect(sql).toContain('"campaigns"."dm_user_id" = $4')
    expect(params[0]).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(params.slice(2)).toEqual([CAMPAIGN_ID, DM])
    expect(result).toEqual(rotated)
  })

  it('returns null for a campaign someone else runs, having rotated nothing', async () => {
    await expect(regenerateJoinCode(PLAYER, CAMPAIGN_ID)).resolves.toBeNull()
    expect(mockCalls[0].params.slice(2)).toEqual([CAMPAIGN_ID, PLAYER])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(regenerateJoinCode(DM, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})
