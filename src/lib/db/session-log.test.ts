import { getTableColumns } from 'drizzle-orm'

import { todaySessionDate } from '@/lib/notes/schema'

import { entriesInWindow, getSessionLog, getSessionLogWindow, listNights } from './session-log'
import { campaignNotes, type CampaignNote } from './schema'

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

/** A note row, positionally, as the Neon HTTP driver hands it back. */
function noteRow(note: Partial<CampaignNote> = {}): unknown[] {
  const row: CampaignNote = {
    id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
    campaignId: CAMPAIGN_ID,
    sessionDate: '2026-09-03',
    body: 'Innkeeper is called Bram',
    sharedWithPlayers: false,
    sessionClosedAt: null,
    planId: null,
    createdAt: new Date('2026-09-03T19:00:00.000Z'),
    updatedAt: new Date('2026-09-03T19:00:00.000Z'),
    ...note,
  }

  return Object.keys(getTableColumns(campaignNotes)).map((column) => {
    const value = row[column as keyof CampaignNote]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** A plan row as `listNights` selects it: public columns, plus `created_at`. */
function planRow(plan: {
  id: string
  title: string
  sessionDate: string | null
  createdAt?: string
}): unknown[] {
  return [
    plan.id,
    CAMPAIGN_ID,
    plan.title,
    plan.sessionDate,
    null,
    plan.createdAt ?? '2026-09-01T10:00:00.000Z',
  ]
}

/**
 * The eight statements `listNights` makes, in order: authority, the five
 * derived reads — which run over the whole campaign once and are cut into
 * nights in TypeScript — then the notes and the plans. The five lead because
 * `readEntries` is a plain async call and Drizzle's builders are lazy.
 */
function nightRows(
  options: {
    notes?: unknown[][]
    plans?: unknown[][]
    fights?: unknown[][]
    npcs?: unknown[][]
    locations?: unknown[][]
    handouts?: unknown[][]
    checked?: unknown[][]
  } = {},
): unknown[][][] {
  return [
    EXISTS_ROW,
    options.fights ?? [],
    options.npcs ?? [],
    options.locations ?? [],
    options.handouts ?? [],
    options.checked ?? [],
    options.notes ?? [],
    options.plans ?? [],
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
      note: [
        noteRow({ id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d', body: 'Innkeeper is called Bram' }),
      ],
    })

    const log = await getSessionLog(DM, CAMPAIGN_ID)

    expect(log?.note?.body).toBe('Innkeeper is called Bram')
  })
})

// The night a close stamp belongs to (`dm-chronology/session-chain`). The
// window is `(since, until]`, and these are the two assertions that say so —
// one in SQL, one in TypeScript, because the two spellings have to agree about
// the boundary or a night's last act turns up at the top of the next one.
describe('getSessionLogWindow', () => {
  const SINCE = new Date('2026-09-03T22:40:00.000Z')
  const UNTIL = new Date('2026-09-10T23:15:00.000Z')

  it('refuses a campaign this DM does not run, before reading anything', async () => {
    mockRowsQueue = [[]]

    expect(await getSessionLogWindow(PLAYER, CAMPAIGN_ID, SINCE, UNTIL)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('bounds every read at both ends, and writes nothing', async () => {
    mockRowsQueue = [EXISTS_ROW, [], [], [], [], []]

    await getSessionLogWindow(DM, CAMPAIGN_ID, SINCE, UNTIL)

    const derived = mockCalls.slice(1)
    expect(derived).toHaveLength(5)

    for (const call of derived) {
      expect(call.sql).toContain('>')
      expect(call.sql).toContain('<=')
      expect(call.params).toContain(SINCE.toISOString())
      expect(call.params).toContain(UNTIL.toISOString())
      expect(call.sql).toContain('"dm_user_id"')
      expect(call.sql).not.toMatch(/^insert |^update |^delete /)
    }
  })

  it('reaches back to the beginning of the campaign on its first night', async () => {
    mockRowsQueue = [EXISTS_ROW, [], [], [], [], []]

    await getSessionLogWindow(DM, CAMPAIGN_ID, null, UNTIL)

    for (const call of mockCalls.slice(1)) {
      expect(call.params).not.toContain(SINCE.toISOString())
      expect(call.params).toContain(UNTIL.toISOString())
    }
  })

  it('reads the open window when there is no close ahead of it yet', async () => {
    mockRowsQueue = [EXISTS_ROW, [], [], [], [], []]

    await getSessionLogWindow(DM, CAMPAIGN_ID, SINCE, null)

    for (const call of mockCalls.slice(1)) {
      expect(call.sql).not.toContain('<=')
      expect(call.params).toContain(SINCE.toISOString())
    }
  })
})

describe('entriesInWindow', () => {
  const entry = (at: string) => ({
    kind: 'npc' as const,
    id: at,
    title: 'Bram',
    at: new Date(at),
  })

  const CLOSE = new Date('2026-09-10T23:00:00.000Z')
  const NEXT_CLOSE = new Date('2026-09-17T23:00:00.000Z')

  it('gives an act stamped exactly at the close to the night it ended', () => {
    const acts = [entry('2026-09-10T23:00:00.000Z')]

    expect(entriesInWindow(acts, null, CLOSE)).toHaveLength(1)
    expect(entriesInWindow(acts, CLOSE, NEXT_CLOSE)).toHaveLength(0)
  })

  it('gives an act a second later to the night after it', () => {
    const acts = [entry('2026-09-10T23:00:01.000Z')]

    expect(entriesInWindow(acts, null, CLOSE)).toHaveLength(0)
    expect(entriesInWindow(acts, CLOSE, NEXT_CLOSE)).toHaveLength(1)
  })

  it('is unbounded on the side that is null', () => {
    const acts = [entry('2020-01-01T00:00:00.000Z'), entry('2099-01-01T00:00:00.000Z')]

    expect(entriesInWindow(acts, null, null)).toHaveLength(2)
    expect(entriesInWindow(acts, CLOSE, null)).toHaveLength(1)
    expect(entriesInWindow(acts, null, CLOSE)).toHaveLength(1)
  })
})

// The timeline (`dm-chronology/session-chain`): a recap is a night that was
// played, the plan it points at is what was written for it, and the window
// between two closes is what happened while it ran.
describe('listNights', () => {
  const PLAN_ID = '9c8d7e6f-5a4b-4c3d-2e1f-0a9b8c7d6e5f'
  const OTHER_PLAN_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
  const FIRST_CLOSE = '2026-08-27T22:30:00.000Z'
  const SECOND_CLOSE = '2026-09-03T22:40:00.000Z'

  it('refuses a campaign this DM does not run, before reading anything', async () => {
    mockRowsQueue = [[]]

    expect(await listNights(PLAYER, CAMPAIGN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('has no nights at all for a campaign nothing has happened in', async () => {
    mockRowsQueue = nightRows()

    expect(await listNights(DM, CAMPAIGN_ID)).toEqual([])
  })

  it('writes nothing, and no statement selects a plan’s DM-only half', async () => {
    mockRowsQueue = nightRows()

    await listNights(DM, CAMPAIGN_ID)

    for (const call of mockCalls) {
      expect(call.sql).not.toMatch(/^insert |^update |^delete /)
      expect(call.sql).not.toContain('"strong_start"')
      expect(call.sql).not.toContain('"treasure"')
      expect(call.sql).toContain('"dm_user_id"')
    }
  })

  it('reads one played night as the plan, the acts and the recap together', async () => {
    mockRowsQueue = nightRows({
      notes: [
        noteRow({
          id: 'recap-1',
          sessionDate: '2026-09-03',
          body: 'They burned the shrine.',
          sharedWithPlayers: true,
          sessionClosedAt: new Date(SECOND_CLOSE),
          planId: PLAN_ID,
        }),
        // The DM's own capture from that night — dated it, and never closed.
        noteRow({ id: 'note-1', sessionDate: '2026-09-03', body: 'Bram is lying' }),
      ],
      plans: [planRow({ id: PLAN_ID, title: 'Session 4 — the shrine', sessionDate: '2026-09-03' })],
      fights: [['e1', 'Ambush at the ford', '2026-09-03T20:10:00.000Z']],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)

    expect(nights).toHaveLength(1)
    const [night] = nights ?? []
    expect(night.kind).toBe('played')
    expect(night.date).toBe('2026-09-03')
    expect(night.since).toBeNull()
    expect(night.until).toEqual(new Date(SECOND_CLOSE))
    expect(night.plan?.title).toBe('Session 4 — the shrine')
    expect(night.recap?.body).toBe('They burned the shrine.')
    expect(night.entries.map((entry) => entry.title)).toEqual(['Ambush at the ford'])
    expect(night.notes.map((note) => note.body)).toEqual(['Bram is lying'])
  })

  it('files each act under the night whose window it falls in', async () => {
    mockRowsQueue = nightRows({
      notes: [
        noteRow({
          id: 'recap-1',
          sessionDate: '2026-08-27',
          sharedWithPlayers: true,
          sessionClosedAt: new Date(FIRST_CLOSE),
        }),
        noteRow({
          id: 'recap-2',
          sessionDate: '2026-09-03',
          sharedWithPlayers: true,
          sessionClosedAt: new Date(SECOND_CLOSE),
        }),
      ],
      npcs: [
        ['n1', 'Bram', '2026-08-27T19:30:00.000Z'],
        // Exactly on the first close: the last act of the night it ended.
        ['n2', 'The harbourmaster', FIRST_CLOSE],
        ['n3', 'The cultist', '2026-09-03T20:00:00.000Z'],
      ],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)

    // Newest first.
    expect(nights?.map((night) => night.date)).toEqual(['2026-09-03', '2026-08-27'])
    expect(nights?.[1].entries.map((entry) => entry.title)).toEqual(['Bram', 'The harbourmaster'])
    expect(nights?.[1].since).toBeNull()
    expect(nights?.[0].entries.map((entry) => entry.title)).toEqual(['The cultist'])
    expect(nights?.[0].since).toEqual(new Date(FIRST_CLOSE))
  })

  it('reads a recap with no plan behind it as a night that just happened', async () => {
    mockRowsQueue = nightRows({
      notes: [
        noteRow({
          id: 'recap-1',
          sessionDate: '2026-09-03',
          sharedWithPlayers: true,
          sessionClosedAt: new Date(SECOND_CLOSE),
          planId: null,
        }),
      ],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)

    expect(nights?.[0].kind).toBe('played')
    expect(nights?.[0].plan).toBeNull()
  })

  it('leaves a recap standing when the plan it pointed at is gone', async () => {
    // `ON DELETE SET NULL` is the database's half of this; a plan id that
    // resolves to nothing is the same answer read back.
    mockRowsQueue = nightRows({
      notes: [
        noteRow({
          id: 'recap-1',
          sharedWithPlayers: true,
          sessionClosedAt: new Date(SECOND_CLOSE),
          planId: OTHER_PLAN_ID,
        }),
      ],
      plans: [planRow({ id: PLAN_ID, title: 'Session 4 — the shrine', sessionDate: '2026-09-03' })],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)
    const played = nights?.find((night) => night.kind === 'played')

    expect(played?.recap).not.toBeNull()
    expect(played?.plan).toBeNull()
  })

  it('reads a plan no recap points at as a night still ahead', async () => {
    mockRowsQueue = nightRows({
      plans: [
        planRow({ id: PLAN_ID, title: 'Session 5 — the road north', sessionDate: '2026-09-24' }),
      ],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)

    expect(nights).toHaveLength(1)
    expect(nights?.[0]).toMatchObject({
      kind: 'upcoming',
      id: PLAN_ID,
      date: '2026-09-24',
      entries: [],
      recap: null,
    })
  })

  it('puts three nights in order: what is ahead, tonight, then what is behind', async () => {
    const today = todaySessionDate()

    mockRowsQueue = nightRows({
      notes: [
        noteRow({
          id: 'recap-1',
          sessionDate: '2026-08-27',
          sharedWithPlayers: true,
          sessionClosedAt: new Date(FIRST_CLOSE),
          planId: PLAN_ID,
        }),
      ],
      plans: [
        planRow({
          id: OTHER_PLAN_ID,
          title: 'Session 6 — the road north',
          sessionDate: '2099-01-01',
        }),
        planRow({ id: 'plan-tonight', title: 'Session 5 — the vault', sessionDate: today }),
        planRow({ id: PLAN_ID, title: 'Session 4 — the shrine', sessionDate: '2026-08-27' }),
      ],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)

    expect(nights?.map((night) => night.kind)).toEqual(['upcoming', 'tonight', 'played'])
    expect(nights?.[1].plan?.title).toBe('Session 5 — the vault')
    // The plan the played night ran from is not offered again as a night to
    // come: one plan, one night, and the link is what says which.
    expect(nights?.[2].plan?.id).toBe(PLAN_ID)
    expect(nights?.filter((night) => night.plan?.id === PLAN_ID)).toHaveLength(1)
  })

  it('leads with a night nobody has dated — that is the one being written', async () => {
    mockRowsQueue = nightRows({
      plans: [
        planRow({ id: OTHER_PLAN_ID, title: 'Something with a cult', sessionDate: null }),
        planRow({ id: PLAN_ID, title: 'Session 5 — the road north', sessionDate: '2026-09-24' }),
      ],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)

    expect(nights?.map((night) => night.plan?.id)).toEqual([OTHER_PLAN_ID, PLAN_ID])
    expect(nights?.[0].date).toBeNull()
  })

  it('gives a line typed after the close to tonight, not to the night it closed', async () => {
    const today = todaySessionDate()
    const close = new Date(`${today}T22:40:00.000Z`)

    mockRowsQueue = nightRows({
      notes: [
        noteRow({
          id: 'recap-1',
          sessionDate: today,
          sharedWithPlayers: true,
          sessionClosedAt: close,
        }),
        // Captured while that session was still running.
        noteRow({
          id: 'note-1',
          sessionDate: today,
          body: 'Bram is lying',
          createdAt: new Date(`${today}T20:00:00.000Z`),
        }),
        // Typed ten minutes after the recap published: the next night's first
        // line, which is what `appendToSessionNote` makes it.
        noteRow({
          id: 'note-2',
          sessionDate: today,
          body: 'Ask about the vault next time',
          createdAt: new Date(`${today}T22:50:00.000Z`),
        }),
      ],
    })

    const nights = await listNights(DM, CAMPAIGN_ID)

    expect(nights?.map((night) => night.kind)).toEqual(['tonight', 'played'])
    expect(nights?.[0].notes.map((note) => note.body)).toEqual(['Ask about the vault next time'])
    expect(nights?.[1].notes.map((note) => note.body)).toEqual(['Bram is lying'])
  })

  it('shows tonight once anything has happened, plan or no plan', async () => {
    mockRowsQueue = nightRows({ handouts: [['h1', 'The torn letter', '2099-01-01T19:45:00.000Z']] })

    const nights = await listNights(DM, CAMPAIGN_ID)

    expect(nights).toHaveLength(1)
    expect(nights?.[0]).toMatchObject({ kind: 'tonight', id: 'tonight', plan: null, since: null })
    expect(nights?.[0].entries.map((entry) => entry.title)).toEqual(['The torn letter'])
  })
})
