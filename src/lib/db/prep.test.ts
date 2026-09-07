import {
  countCampaignEncounters,
  countCampaignHandouts,
  countCampaignLocations,
  countCampaignNpcs,
  countPartyReadiness,
} from './prep'

// The Prep tab's counts (`dm-chronology/prep-tab`), on the same
// real-Drizzle-over-a-stub-driver pattern as `session-plans.test.ts`.
//
// Two properties are on trial. The first is D38's: every count folds
// `campaigns.dm_user_id` into its WHERE, so a campaign someone else runs
// tallies nothing rather than tallying their prep. The second is this tab's:
// a count is a number, and none of these statements selects a column from the
// DM-only layer to produce one — the tab renders in the browser, and a
// secret that reached it to be counted would be a secret that leaked.
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
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

/**
 * A level-1 fighter carrying a longsword, in the column order
 * `countPartyReadiness` projects and with Postgres' own encodings — the Neon
 * HTTP driver hands rows back positionally, as `campaigns.test.ts` does.
 */
const FIGHTER_ROW: unknown[] = [
  CHARACTER_ID,
  'fighter',
  1,
  16,
  12,
  JSON.stringify({}),
  '{longsword}',
  '{athletics}',
]

/** One `character_items` row, positionally: character, index, readied. */
function packRow(equipmentIndex: string, equipped: boolean): unknown[] {
  return [CHARACTER_ID, equipmentIndex, equipped]
}

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

/** The one statement a call issued, for tests that issue exactly one. */
function onlyCall(): DriverCall {
  expect(mockCalls).toHaveLength(1)
  return mockCalls[0]
}

describe.each([
  ['NPCs', countCampaignNpcs, 'campaign_npcs'],
  ['places', countCampaignLocations, 'campaign_locations'],
  ['handouts', countCampaignHandouts, 'campaign_handouts'],
])('the %s tally', (_name, count, table) => {
  it('counts the rows and the revealed ones, scoped to the DM', async () => {
    mockRows = [[12, 4]]

    await expect(count(DM, CAMPAIGN_ID)).resolves.toEqual({ total: 12, revealed: 4 })

    const call = onlyCall()
    expect(call.sql).toContain(`from "${table}"`)
    // The authority arm, and the DM whose it is.
    expect(call.sql).toContain('"campaigns"."dm_user_id"')
    expect(call.params).toContain(DM)
    expect(call.params).toContain(CAMPAIGN_ID)
  })

  it('selects two counts and no prep at all', async () => {
    mockRows = [[0, 0]]

    await count(DM, CAMPAIGN_ID)

    // The whole selection: `count(*)` and `count(revealed_at)`. A DM-only
    // column named here would be a column crossing to a browser to be counted.
    const selection = /select (.*) from/.exec(onlyCall().sql)?.[1] ?? ''
    expect(selection).toContain('count(*)')
    expect(selection).toContain('"revealed_at"')
    expect(selection).not.toMatch(/secret|notes|body|description/i)
  })

  it('refuses an id that is not a campaign id without asking the database', async () => {
    await expect(count(DM, 'not-an-id')).resolves.toEqual({ total: 0, revealed: 0 })
    expect(mockCalls).toHaveLength(0)
  })

  it('tallies nothing for a campaign this DM does not run', async () => {
    // The authority arm matched no campaign, so the aggregate returns no row
    // at all — which reads as an empty family, exactly as it should.
    mockRows = []

    await expect(count(DM, CAMPAIGN_ID)).resolves.toEqual({ total: 0, revealed: 0 })
  })
})

describe('the encounter tally', () => {
  it('counts the fights, and the ones still to run', async () => {
    mockRows = [[5, 2]]

    await expect(countCampaignEncounters(DM, CAMPAIGN_ID)).resolves.toEqual({ total: 5, ready: 2 })

    const call = onlyCall()
    expect(call.sql).toContain('from "encounters"')
    // "Ready" is a fight the DM has not called over.
    expect(call.sql).toContain('"completed_at" is null')
    expect(call.sql).toContain('"campaigns"."dm_user_id"')
    expect(call.params).toContain(DM)
  })

  it('is nothing for a malformed campaign id', async () => {
    await expect(countCampaignEncounters(DM, 'nope')).resolves.toEqual({ total: 0, ready: 0 })
    expect(mockCalls).toHaveLength(0)
  })

  it('is nothing for a campaign this DM does not run', async () => {
    mockRows = []

    await expect(countCampaignEncounters(DM, CAMPAIGN_ID)).resolves.toEqual({
      total: 0,
      ready: 0,
    })
  })
})

describe('the party tally', () => {
  it('counts the roster and the characters a night would trip up', async () => {
    // The roster, then the packs of exactly those characters. This fighter
    // carries a longsword and has not readied it, which is the readiness rule's
    // first line and the reason the tab prints "1 not ready".
    mockRowsQueue = [[FIGHTER_ROW], [packRow('longsword', false)]]

    await expect(countPartyReadiness(DM, CAMPAIGN_ID)).resolves.toEqual({
      total: 1,
      notReady: 1,
    })

    expect(mockCalls[0].sql).toContain('from "character_campaigns"')
    expect(mockCalls[0].sql).toContain('"campaigns"."dm_user_id"')
    expect(mockCalls[1].sql).toContain('from "character_items"')
  })

  it('calls a character with their weapon readied ready', async () => {
    mockRowsQueue = [[FIGHTER_ROW], [packRow('longsword', true)]]

    await expect(countPartyReadiness(DM, CAMPAIGN_ID)).resolves.toEqual({
      total: 1,
      notReady: 0,
    })
  })

  it('does not ask about packs for a table nobody has joined', async () => {
    mockRowsQueue = [[]]

    await expect(countPartyReadiness(DM, CAMPAIGN_ID)).resolves.toEqual({ total: 0, notReady: 0 })
    expect(mockCalls).toHaveLength(1)
  })

  it('is nobody for a malformed campaign id', async () => {
    await expect(countPartyReadiness(DM, 'nope')).resolves.toEqual({ total: 0, notReady: 0 })
    expect(mockCalls).toHaveLength(0)
  })
})
