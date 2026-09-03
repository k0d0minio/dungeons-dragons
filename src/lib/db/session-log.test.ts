import { getSessionLog } from './session-log'

// The derived session log (`dm-run-suite/session-log-recap`, D41).
//
// The same real-Drizzle-over-a-stub-driver pattern as `notes.test.ts`, and what
// it is here to hold up is the register's amendment: **the log is a query, not
// a table**. So the assertions are about the statements — that there are five
// of them and none is an INSERT, that each carries the DM predicate and the
// window, and that none of them selects a DM-only column into a draft the DM
// then publishes to the party.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRowsQueue: unknown[][][] | undefined

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRowsQueue ? (mockRowsQueue.shift() ?? []) : [] }
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
const CLOSED_AT = '2026-09-02T22:40:00.000Z'

/** One row saying "yes, this exists" — what the authority pre-read selects. */
const EXISTS_ROW = [[1]]

/**
 * The eight statements a full log run makes, in order: authority, the last
 * close, tonight's open note, then the five derived reads.
 *
 * The last six run in one `Promise.all` and the stub answers in call order —
 * the note read leads because it is a plain async call rather than one of
 * Drizzle's lazy builders, which is why `getSessionLog` lists it first.
 */
function logRows(
  options: {
    since?: string | null
    fights?: unknown[][]
    npcs?: unknown[][]
    locations?: unknown[][]
    handouts?: unknown[][]
    checked?: unknown[][]
    note?: unknown[][]
  } = {},
): unknown[][][] {
  return [
    EXISTS_ROW,
    options.since === undefined || options.since === null ? [] : [[options.since]],
    options.note ?? [],
    options.fights ?? [],
    options.npcs ?? [],
    options.locations ?? [],
    options.handouts ?? [],
    options.checked ?? [],
  ]
}

beforeEach(() => {
  mockCalls.length = 0
  mockRowsQueue = undefined
})

describe('getSessionLog', () => {
  it('refuses a campaign this DM does not run, before reading anything', async () => {
    mockRowsQueue = [[]]

    expect(await getSessionLog(PLAYER, CAMPAIGN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('is a miss for a malformed campaign id, without a statement', async () => {
    expect(await getSessionLog(DM, 'not-an-id')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })

  it('writes nothing — a log is derived, never a row', async () => {
    mockRowsQueue = logRows()

    await getSessionLog(DM, CAMPAIGN_ID)

    for (const call of mockCalls) {
      expect(call.sql).not.toMatch(/^insert |^update |^delete /)
    }
  })

  it('reads the five stamps, each scoped to a campaign this DM runs', async () => {
    mockRowsQueue = logRows()

    await getSessionLog(DM, CAMPAIGN_ID)

    const derived = mockCalls.slice(3)

    expect(derived).toHaveLength(5)
    expect(derived[0].sql).toContain('from "encounters"')
    expect(derived[0].sql).toContain('"completed_at" is not null')
    expect(derived[1].sql).toContain('from "campaign_npcs"')
    expect(derived[2].sql).toContain('from "campaign_locations"')
    expect(derived[3].sql).toContain('from "campaign_handouts"')
    expect(derived[4].sql).toContain('from "session_plan_items"')
    expect(derived[4].sql).toContain('"checked_at" is not null')

    for (const call of derived) {
      // The one arm that decides whose table this is, on every statement.
      expect(call.sql).toContain('"dm_user_id"')
      expect(call.params).toContain(DM)
      expect(call.params).toContain(CAMPAIGN_ID)
    }

    for (const call of derived.slice(1, 4)) {
      expect(call.sql).toContain('"revealed_at" is not null')
    }
  })

  it('selects public columns only — a draft cannot be pre-filled with a secret', async () => {
    mockRowsQueue = logRows()

    await getSessionLog(DM, CAMPAIGN_ID)

    for (const call of mockCalls.slice(3)) {
      expect(call.sql).not.toContain('"secrets"')
      expect(call.sql).not.toContain('"twist"')
      expect(call.sql).not.toContain('"dm_notes"')
      expect(call.sql).not.toContain('"treasure"')
      expect(call.sql).not.toContain('"image"')
    }
  })

  it('windows every read on the last close, so a closed session is not logged twice', async () => {
    mockRowsQueue = logRows({ since: CLOSED_AT })

    const log = await getSessionLog(DM, CAMPAIGN_ID)

    expect(log?.since).toEqual(new Date(CLOSED_AT))

    for (const call of mockCalls.slice(3)) {
      expect(call.sql).toContain('>')
      expect(call.params).toContain(CLOSED_AT)
    }
  })

  it('logs everything when the campaign has never closed a session', async () => {
    mockRowsQueue = logRows({ since: null })

    const log = await getSessionLog(DM, CAMPAIGN_ID)

    expect(log?.since).toBeNull()

    // "Stamped" alone, with no lower bound: a table writing its first recap
    // after weeks of play gets the lot, and trims.
    for (const call of mockCalls.slice(3)) {
      expect(call.params).not.toContain(CLOSED_AT)
    }
  })

  it('merges the five sources into one line of history, oldest first', async () => {
    mockRowsQueue = logRows({
      fights: [['e1', 'Ambush at the ford', '2026-09-03T20:10:00.000Z']],
      npcs: [['n1', 'Bram', '2026-09-03T19:30:00.000Z']],
      locations: [['l1', 'The drowned shrine', '2026-09-03T21:00:00.000Z']],
      handouts: [['h1', 'The torn letter', '2026-09-03T19:45:00.000Z']],
      checked: [['i1', 'The mayor is lying', '2026-09-03T20:40:00.000Z', 'secret']],
    })

    const log = await getSessionLog(DM, CAMPAIGN_ID)

    expect(log?.entries.map((entry) => [entry.kind, entry.title])).toEqual([
      ['npc', 'Bram'],
      ['handout', 'The torn letter'],
      ['encounter', 'Ambush at the ford'],
      ['secret', 'The mayor is lying'],
      ['location', 'The drowned shrine'],
    ])
  })

  it('tells a scene from a secret by the column, not by position', async () => {
    mockRowsQueue = logRows({
      checked: [
        ['i1', 'They reach the docks', '2026-09-03T20:00:00.000Z', 'scene'],
        ['i2', 'The mayor is lying', '2026-09-03T20:10:00.000Z', 'secret'],
      ],
    })

    const log = await getSessionLog(DM, CAMPAIGN_ID)

    expect(log?.entries.map((entry) => entry.kind)).toEqual(['scene', 'secret'])
  })

  it('carries tonight’s open note beside the derived facts', async () => {
    mockRowsQueue = logRows({
      // Column order as the table declares it: id, campaign, date, body,
      // shared, closed, created, updated.
      note: [
        [
          '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
          CAMPAIGN_ID,
          '2026-09-03',
          'Innkeeper is called Bram',
          false,
          null,
          '2026-09-03T19:00:00.000Z',
          '2026-09-03T19:00:00.000Z',
        ],
      ],
    })

    const log = await getSessionLog(DM, CAMPAIGN_ID)

    expect(log?.note?.body).toBe('Innkeeper is called Bram')
  })
})
