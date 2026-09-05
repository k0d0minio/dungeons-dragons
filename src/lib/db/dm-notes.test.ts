import { DM_NOTE_TEMPLATE } from '@/lib/notes/dm-note'

import { appendToCharacterDmNote, getCharacterDmNote, saveCharacterDmNote } from './dm-notes'

// The DM's note on a character (first-table/dm-character-notes): the same
// real-Drizzle-over-a-stub-driver harness as notes.test.ts. What is worth
// pinning is the predicate — the campaign in the URL is the asker's AND the
// character is on its roster, in every statement, and the owner has no arm.
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
const EXISTS_ROW = [[1]]
const NOW = new Date('2026-09-05T20:00:00.000Z').toISOString()

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('getCharacterDmNote', () => {
  it('reads through the campaign in the URL and its DM, never the owner', async () => {
    mockRows = [['Sam. Nervous about talking.']]

    expect(await getCharacterDmNote(DM, CAMPAIGN_ID, CHARACTER_ID)).toBe(
      'Sam. Nervous about talking.',
    )

    const [query] = mockCalls
    expect(query.sql).toContain('from "character_dm_notes"')
    expect(query.sql).toContain('inner join "character_campaigns"')
    expect(query.sql).toContain('"campaigns"."dm_user_id" = $')
    expect(query.sql).toContain('"character_campaigns"."campaign_id" = $')
    expect(query.sql).not.toContain('owner_id')
    expect(query.params).toEqual([CHARACTER_ID, CAMPAIGN_ID, DM, 1])
  })

  it('is empty for a character the asker does not run, and for a malformed id', async () => {
    mockRows = []
    expect(await getCharacterDmNote('someone', CAMPAIGN_ID, CHARACTER_ID)).toBe('')
    expect(await getCharacterDmNote(DM, 'nope', CHARACTER_ID)).toBe('')
    expect(mockCalls).toHaveLength(1)
  })
})

describe('saveCharacterDmNote', () => {
  it('checks the two arms before upserting a single row', async () => {
    mockRowsQueue = [EXISTS_ROW, [[CHARACTER_ID, 'Owes the smith.', NOW, NOW]]]

    const saved = await saveCharacterDmNote(DM, CAMPAIGN_ID, CHARACTER_ID, 'Owes the smith.')

    const [authority, upsert] = mockCalls
    expect(authority.sql).toContain('from "character_campaigns"')
    expect(authority.sql).toContain('"campaigns"."dm_user_id" = $')
    expect(authority.params).toEqual([CHARACTER_ID, CAMPAIGN_ID, DM, 1])

    expect(upsert.sql).toContain('insert into "character_dm_notes"')
    expect(upsert.sql).toContain('on conflict')
    expect(saved?.body).toBe('Owes the smith.')
  })

  it('refuses to write for a table the asker does not run', async () => {
    mockRowsQueue = [[]]

    expect(await saveCharacterDmNote('someone', CAMPAIGN_ID, CHARACTER_ID, 'x')).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })
})

describe('appendToCharacterDmNote', () => {
  it('seeds the template and lands the block under Threads when no note exists', async () => {
    mockRowsQueue = [EXISTS_ROW, [], []]

    expect(
      await appendToCharacterDmNote(
        DM,
        CAMPAIGN_ID,
        CHARACTER_ID,
        'Threads',
        '2026-09-10 — Highlight: the shove.',
      ),
    ).toBe(true)

    const [, read, upsert] = mockCalls
    expect(read.sql).toContain('from "character_dm_notes"')
    expect(upsert.sql).toContain('insert into "character_dm_notes"')
    const body = upsert.params[1] as string
    expect(body.startsWith(DM_NOTE_TEMPLATE.split('\n')[0])).toBe(true)
    expect(body).toMatch(/Threads\n[^\n]*\n2026-09-10 — Highlight: the shove\.\n$/)
  })

  it('writes nothing when the note already carries the block', async () => {
    const existing = 'Threads\n2026-09-10 — Highlight: the shove.\n'
    mockRowsQueue = [EXISTS_ROW, [[existing]]]

    expect(
      await appendToCharacterDmNote(
        DM,
        CAMPAIGN_ID,
        CHARACTER_ID,
        'Threads',
        '2026-09-10 — Highlight: the shove.',
      ),
    ).toBe(true)
    expect(mockCalls).toHaveLength(2)
  })

  it('refuses for a table the asker does not run, and does nothing for a blank block', async () => {
    mockRowsQueue = [[]]
    expect(
      await appendToCharacterDmNote('someone', CAMPAIGN_ID, CHARACTER_ID, 'Threads', 'x'),
    ).toBe(false)
    expect(mockCalls).toHaveLength(1)

    mockCalls.length = 0
    expect(await appendToCharacterDmNote(DM, CAMPAIGN_ID, CHARACTER_ID, 'Threads', '  ')).toBe(true)
    expect(mockCalls).toHaveLength(0)
  })
})
