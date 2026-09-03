import { eq } from 'drizzle-orm'

import { campaignRunBy, isRowId, revealStamp, revealedOnly, runByDm, seatedAt } from './revealable'
import { campaignNpcs } from './schema'

// The shared half of the revealable-entity pattern (D38). These tests pin the
// two properties every prep table inherits from this module: authority is
// `campaigns.dm_user_id` and nothing else, and "revealed" is a non-null
// `revealed_at` and nothing else. `locations-handouts` and `session-plans`
// reuse the helpers, so a regression here is a regression in all three.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRows }
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

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
})

describe('isRowId', () => {
  it('accepts a uuid in either case', () => {
    expect(isRowId(CAMPAIGN_ID)).toBe(true)
    expect(isRowId(CAMPAIGN_ID.toUpperCase())).toBe(true)
  })

  it('rejects anything a URL segment might otherwise carry', () => {
    for (const value of ['', 'not-a-uuid', '1', `${CAMPAIGN_ID}x`, "'; drop table campaigns--"]) {
      expect(isRowId(value)).toBe(false)
    }
  })
})

describe('campaignRunBy', () => {
  it('asks the campaigns table for this DM and this campaign', async () => {
    mockRows = [[1]]

    expect(await campaignRunBy(DM, CAMPAIGN_ID)).toBe(true)

    const [read] = mockCalls
    expect(read.sql).toContain('from "campaigns"')
    expect(read.sql).toContain('"dm_user_id"')
    // The trailing 1 is the bound `limit 1`.
    expect(read.params).toEqual([CAMPAIGN_ID, DM, 1])
  })

  it('is false when the campaign is someone else’s', async () => {
    mockRows = []

    expect(await campaignRunBy(DM, CAMPAIGN_ID)).toBe(false)
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await campaignRunBy(DM, 'not-a-uuid')).toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})

describe('runByDm', () => {
  it('is an EXISTS against the owning campaign, composable onto any statement', async () => {
    const { getDb } = require('./client') as typeof import('./client')

    await getDb().select().from(campaignNpcs).where(runByDm(campaignNpcs, DM))

    const [statement] = mockCalls
    expect(statement.sql).toContain('exists')
    expect(statement.sql).toContain('from "campaigns"')
    expect(statement.sql).toContain('"dm_user_id"')
    expect(statement.sql).toContain('"campaign_npcs"."campaign_id"')
    expect(statement.params).toEqual([DM])
  })
})

describe('seatedAt', () => {
  it('folds the roster into the statement as an EXISTS', async () => {
    const { getDb } = require('./client') as typeof import('./client')

    await getDb().select().from(campaignNpcs).where(seatedAt(campaignNpcs, PLAYER))

    const [statement] = mockCalls

    expect(statement.sql).toContain('exists')
    expect(statement.sql).toContain('from "campaign_members"')
    expect(statement.sql).toContain('"user_id"')
    expect(statement.sql).toContain('"campaign_npcs"."campaign_id"')
    expect(statement.params).toEqual([PLAYER])
  })

  it('never consults the roster role, which grants nothing', async () => {
    // `campaign_members.role` records the seat someone holds so the UI can
    // label them. A `where role = 'dm'` here would be privilege escalation:
    // nothing stops a member row claiming 'dm' for a campaign someone else
    // owns. See the warning on the table in `schema.ts`.
    const { getDb } = require('./client') as typeof import('./client')

    await getDb().select().from(campaignNpcs).where(seatedAt(campaignNpcs, PLAYER))

    expect(mockCalls[0].sql).not.toContain('"role"')
  })

  it('is not on its own a licence to read — it composes with revealedOnly', async () => {
    const { and } = require('drizzle-orm') as typeof import('drizzle-orm')
    const { getDb } = require('./client') as typeof import('./client')

    await getDb()
      .select()
      .from(campaignNpcs)
      .where(and(seatedAt(campaignNpcs, PLAYER), revealedOnly(campaignNpcs)))

    const [statement] = mockCalls

    expect(statement.sql).toContain('from "campaign_members"')
    expect(statement.sql).toContain('"revealed_at" is not null')
  })
})

describe('revealedOnly', () => {
  it('is "revealed_at is not null" — the only definition of revealed', async () => {
    const { getDb } = require('./client') as typeof import('./client')

    await getDb().select().from(campaignNpcs).where(revealedOnly(campaignNpcs))

    const [statement] = mockCalls
    expect(statement.sql).toContain('"revealed_at" is not null')
  })

  it('composes with another predicate rather than replacing it', async () => {
    const { and } = require('drizzle-orm') as typeof import('drizzle-orm')
    const { getDb } = require('./client') as typeof import('./client')

    await getDb()
      .select()
      .from(campaignNpcs)
      .where(and(eq(campaignNpcs.campaignId, CAMPAIGN_ID), revealedOnly(campaignNpcs)))

    const [statement] = mockCalls
    expect(statement.sql).toContain('"campaign_id" =')
    expect(statement.sql).toContain('"revealed_at" is not null')
  })
})

describe('revealStamp', () => {
  it('stamps now when revealing', () => {
    const before = Date.now()
    const { revealedAt } = revealStamp(true)

    expect(revealedAt).toBeInstanceOf(Date)
    expect((revealedAt as Date).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('clears the timestamp when un-revealing, rather than keeping a stale one', () => {
    expect(revealStamp(false)).toEqual({ revealedAt: null })
  })
})
