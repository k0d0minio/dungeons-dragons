import { getTableColumns } from 'drizzle-orm'

import {
  createCampaignNpc,
  deleteCampaignNpc,
  listCampaignNpcs,
  npcPublicColumns,
  updateCampaignNpc,
  type CampaignNpc,
} from './npcs'
import { campaignNpcs } from './schema'

// The same real-Drizzle-over-a-stub-driver pattern as `notes.test.ts`. The
// property under test is D38's: a DM's prep is the DM's, so every statement
// carries `campaigns.dm_user_id`; and the public layer is a named selection, so
// a future player-facing read cannot pick up a secret by writing `select()`.
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
const NPC_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const NPC: CampaignNpc = {
  id: NPC_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-08-29T10:00:00.000Z'),
  name: 'Harbourmaster Vane',
  summary: 'Runs the docks, and is bought',
  description: 'A tall man with ink on his cuffs.',
  motivation: 'Pay off the debt before his sister hears of it.',
  secrets: 'He signed the manifest that lost the Marigold.',
  twist: 'He turns on the smugglers the moment he is offered a way out.',
  statReference: 'Bandit Captain, SRD',
  dmNotes: 'Speaks slowly. Never finishes a sentence about the wreck.',
}

/** An NPC row, positionally, as the Neon HTTP driver hands it back. */
function npcDriverRow(npc: CampaignNpc): unknown[] {
  return Object.keys(getTableColumns(campaignNpcs)).map((column) => {
    const value = npc[column as keyof CampaignNpc]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** One row saying "yes, this exists" — what the authority pre-reads select. */
const EXISTS_ROW = [[1]]

/** The columns a player must never be able to read. */
const DM_ONLY_COLUMNS = ['motivation', 'secrets', 'twist', 'statReference', 'dmNotes'] as const

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('npcPublicColumns', () => {
  it('names the public layer and nothing else', () => {
    expect(Object.keys(npcPublicColumns).sort()).toEqual([
      'campaignId',
      'description',
      'id',
      'name',
      'revealedAt',
      'summary',
    ])
  })

  it('carries no DM-only column — the leak this selection exists to prevent', () => {
    for (const column of DM_ONLY_COLUMNS) {
      expect(npcPublicColumns).not.toHaveProperty(column)
    }
  })
})

describe('listCampaignNpcs', () => {
  it('scopes to the DM and orders by name', async () => {
    mockRowsQueue = [EXISTS_ROW, [npcDriverRow(NPC)]]

    const npcs = await listCampaignNpcs(DM, CAMPAIGN_ID)

    const [authority, list] = mockCalls

    // Authority first, and it is the DM column that carries it. The trailing
    // 1 is the bound `limit 1`, which the driver takes as a parameter.
    expect(authority.sql).toContain('from "campaigns"')
    expect(authority.params).toEqual([CAMPAIGN_ID, DM, 1])

    expect(list.sql).toContain('from "campaign_npcs"')
    expect(list.sql).toContain('exists')
    expect(list.sql).toContain('"dm_user_id"')
    expect(list.sql).toMatch(/order by .*"name" asc.*"created_at" asc/)
    expect(list.params).toEqual([CAMPAIGN_ID, DM])

    expect(npcs).toEqual([NPC])
  })

  it('is a miss for a campaign this DM does not run — nothing is read', async () => {
    mockRowsQueue = [[]]

    expect(await listCampaignNpcs(PLAYER, CAMPAIGN_ID)).toBeNull()

    // One statement: the authority read failed, so no NPC was ever selected.
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await listCampaignNpcs(DM, 'not-a-uuid')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createCampaignNpc', () => {
  it('settles authority before inserting', async () => {
    mockRowsQueue = [EXISTS_ROW, [npcDriverRow(NPC)]]

    const npc = await createCampaignNpc(DM, CAMPAIGN_ID, { name: 'Harbourmaster Vane' })

    const [authority, insert] = mockCalls
    expect(authority.sql).toContain('from "campaigns"')
    expect(insert.sql).toContain('insert into "campaign_npcs"')
    expect(insert.params).toContain(CAMPAIGN_ID)

    expect(npc).toEqual(NPC)
  })

  it('never writes a revealed row — campaign content starts hidden', async () => {
    mockRowsQueue = [EXISTS_ROW, [npcDriverRow(NPC)]]

    await createCampaignNpc(DM, CAMPAIGN_ID, {
      name: 'Harbourmaster Vane',
      secrets: 'He signed the manifest.',
    })

    // Drizzle names every column and writes `default` for the ones the values
    // object left out, so the assertion is positional: whatever slot
    // `revealed_at` occupies must be `default`, never a bound parameter. It has
    // no column default, so that is NULL — hidden.
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

    expect(await createCampaignNpc(PLAYER, CAMPAIGN_ID, { name: 'Vane' })).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed campaign id as a miss', async () => {
    expect(await createCampaignNpc(DM, 'not-a-uuid', { name: 'Vane' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('updateCampaignNpc', () => {
  it('carries the DM, the campaign and the npc in one statement', async () => {
    mockRows = [npcDriverRow({ ...NPC, secrets: null })]

    const npc = await updateCampaignNpc(DM, CAMPAIGN_ID, NPC_ID, { secrets: null })

    const [update] = mockCalls
    expect(update.sql).toContain('update "campaign_npcs"')
    expect(update.sql).toContain('exists')
    expect(update.sql).toContain('"dm_user_id"')
    expect(update.params).toEqual(expect.arrayContaining([NPC_ID, CAMPAIGN_ID, DM]))

    expect(npc?.secrets).toBeNull()
  })

  it('is a miss when the statement changed nothing', async () => {
    mockRows = []

    expect(await updateCampaignNpc(PLAYER, CAMPAIGN_ID, NPC_ID, { name: 'Mine now' })).toBeNull()
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await updateCampaignNpc(DM, CAMPAIGN_ID, 'nope', { name: 'Vane' })).toBeNull()
    expect(await updateCampaignNpc(DM, 'nope', NPC_ID, { name: 'Vane' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteCampaignNpc', () => {
  it('deletes only within a campaign this DM runs', async () => {
    mockRows = [[NPC_ID]]

    expect(await deleteCampaignNpc(DM, CAMPAIGN_ID, NPC_ID)).toBe(true)

    const [remove] = mockCalls
    expect(remove.sql).toContain('delete from "campaign_npcs"')
    expect(remove.sql).toContain('"dm_user_id"')
    expect(remove.params).toEqual(expect.arrayContaining([NPC_ID, CAMPAIGN_ID, DM]))
  })

  it('is false when there was nothing this DM could delete', async () => {
    mockRows = []

    expect(await deleteCampaignNpc(PLAYER, CAMPAIGN_ID, NPC_ID)).toBe(false)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await deleteCampaignNpc(DM, CAMPAIGN_ID, 'nope')).toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})
