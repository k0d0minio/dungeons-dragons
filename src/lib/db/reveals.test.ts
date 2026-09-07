import { listHiddenReveals, summariseHidden } from './reveals'

// The Play tab's reveal sheet reads this (`dm-chronology/play-tab`), and what
// makes it safe to hand to a browser is the *projection*: an id and a name per
// row, never the secret half of an NPC or the body of a handout. The same
// real-Drizzle-over-a-stub-driver pattern as `locations.test.ts`, asking two
// things of the SQL — which columns it selects, and that every statement folds
// `campaigns.dm_user_id` into its WHERE.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRowsBySql: ((sql: string) => unknown[][]) | undefined

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRowsBySql ? mockRowsBySql(sql) : [] }
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

beforeEach(() => {
  mockCalls.length = 0
  mockRowsBySql = undefined
})

/** The three statements go out in parallel, so answer them by table name. */
function answerByTable(rows: {
  npcs?: unknown[][]
  locations?: unknown[][]
  handouts?: unknown[][]
}) {
  mockRowsBySql = (sql) => {
    if (sql.includes('campaign_npcs')) return rows.npcs ?? []
    if (sql.includes('campaign_locations')) return rows.locations ?? []
    if (sql.includes('campaign_handouts')) return rows.handouts ?? []
    return []
  }
}

describe('listHiddenReveals', () => {
  it('selects an id and a name per row and nothing behind it', async () => {
    answerByTable({})

    await listHiddenReveals(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(3)

    for (const call of mockCalls) {
      // The property, stated in the shape the sheet depends on: nothing that a
      // DM turns his phone away for is named by these statements.
      expect(call.sql).not.toMatch(/"secrets"|"dm_notes"|"description"|"body"|"summary"/)
    }
  })

  it('folds the DM into every statement, alongside the campaign and the reveal stamp', async () => {
    answerByTable({})

    await listHiddenReveals(DM, CAMPAIGN_ID)

    for (const call of mockCalls) {
      expect(call.sql).toContain('"dm_user_id"')
      expect(call.sql).toContain('"revealed_at" is null')
      expect(call.params).toContain(DM)
      expect(call.params).toContain(CAMPAIGN_ID)
    }
  })

  it('returns NPCs, then places, then handouts, each tagged with its kind', async () => {
    answerByTable({
      npcs: [['npc-1', 'Bram the innkeeper']],
      locations: [['loc-1', 'Kelp Harbour']],
      handouts: [['out-1', 'The smuggler’s ledger']],
    })

    await expect(listHiddenReveals(DM, CAMPAIGN_ID)).resolves.toEqual([
      { kind: 'npc', id: 'npc-1', name: 'Bram the innkeeper' },
      { kind: 'location', id: 'loc-1', name: 'Kelp Harbour' },
      { kind: 'handout', id: 'out-1', name: 'The smuggler’s ledger' },
    ])
  })

  it('answers nothing, and asks nothing, for an id that is not row-shaped', async () => {
    await expect(listHiddenReveals(DM, 'not-a-uuid')).resolves.toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('summariseHidden', () => {
  it('writes the reveal row’s own sentence', () => {
    const hidden = [
      { kind: 'npc' as const, id: '1', name: 'a' },
      { kind: 'npc' as const, id: '2', name: 'b' },
      { kind: 'npc' as const, id: '3', name: 'c' },
      { kind: 'location' as const, id: '4', name: 'd' },
      { kind: 'handout' as const, id: '5', name: 'e' },
      { kind: 'handout' as const, id: '6', name: 'f' },
    ]

    expect(summariseHidden(hidden)).toBe('3 NPCs, 1 place and 2 handouts still hidden')
  })

  it('drops the kinds with nothing in them, and singularises the rest', () => {
    expect(summariseHidden([{ kind: 'npc', id: '1', name: 'a' }])).toBe('1 NPC still hidden')
    expect(
      summariseHidden([
        { kind: 'location', id: '1', name: 'a' },
        { kind: 'handout', id: '2', name: 'b' },
      ]),
    ).toBe('1 place and 1 handout still hidden')
  })

  it('is empty when nothing is hidden — the row says its own thing then', () => {
    expect(summariseHidden([])).toBe('')
  })
})
