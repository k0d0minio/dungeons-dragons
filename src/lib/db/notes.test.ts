import { getTableColumns } from 'drizzle-orm'

import {
  appendToSessionNote,
  createCampaignNote,
  deleteCampaignNote,
  getCharacterNotes,
  getLastSessionClose,
  getOpenSessionNote,
  listCampaignRecaps,
  publishSessionRecap,
  listCampaignNotes,
  listSharedNotesForCharacter,
  saveCharacterNotes,
  updateCampaignNote,
  type CampaignNote,
} from './notes'
import { campaignNotes } from './schema'

// The same real-Drizzle-over-a-stub-driver pattern as `campaigns.test.ts`. The
// property under test is the visibility rule DND-058 inherits from the register
// — a DM's notes are theirs unless shared, a player's are theirs full stop —
// which lives entirely in the WHERE clauses these tests read back off the SQL.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
// Each statement consumes the next result in turn — several of these functions
// issue more than one.
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
const NOTE_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const NOTE: CampaignNote = {
  id: NOTE_ID,
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-08-15',
  body: 'The party bribed the harbourmaster.',
  sharedWithPlayers: false,
  sessionClosedAt: null,
  createdAt: new Date('2026-08-15T20:00:00.000Z'),
  updatedAt: new Date('2026-08-15T20:00:00.000Z'),
}

/** A note row, positionally, as the Neon HTTP driver hands it back. */
function noteDriverRow(note: CampaignNote): unknown[] {
  return Object.keys(getTableColumns(campaignNotes)).map((column) => {
    const value = note[column as keyof CampaignNote]
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

describe('listCampaignNotes', () => {
  it('scopes to the DM and orders newest session first', async () => {
    mockRowsQueue = [EXISTS_ROW, [noteDriverRow(NOTE)]]

    const notes = await listCampaignNotes(DM, CAMPAIGN_ID)

    const [authority, list] = mockCalls

    // Authority first, and it is the DM column that carries it. The trailing
    // 1 is the bound `limit 1`, which the driver takes as a parameter.
    expect(authority.sql).toContain('from "campaigns"')
    expect(authority.params).toEqual([CAMPAIGN_ID, DM, 1])

    expect(list.sql).toContain('from "campaign_notes"')
    expect(list.sql).toContain('exists')
    expect(list.sql).toContain('"dm_user_id"')
    expect(list.sql).toMatch(/order by .*"session_date" desc.*"created_at" desc/)
    expect(list.params).toEqual([CAMPAIGN_ID, DM])

    expect(notes).toEqual([NOTE])
  })

  it('is a miss for a campaign this DM does not run — nothing is read', async () => {
    mockRowsQueue = [[]]

    expect(await listCampaignNotes(PLAYER, CAMPAIGN_ID)).toBeNull()

    // One statement: the authority read failed, so no note was ever selected.
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await listCampaignNotes(DM, 'not-a-uuid')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createCampaignNote', () => {
  it('settles authority before inserting, and defaults to unshared', async () => {
    mockRowsQueue = [EXISTS_ROW, [noteDriverRow(NOTE)]]

    const note = await createCampaignNote(DM, CAMPAIGN_ID, { body: 'They met a dragon.' })

    const [authority, insert] = mockCalls
    expect(authority.params).toEqual([CAMPAIGN_ID, DM, 1])

    expect(insert.sql).toContain('insert into "campaign_notes"')
    // campaign_id, body, shared_with_players — and shared is false, because a
    // note is the DM's until they say otherwise.
    expect(insert.params).toEqual([CAMPAIGN_ID, 'They met a dragon.', false])

    expect(note).toEqual(NOTE)
  })

  it('passes a given session date through, so a write-up can be back-dated', async () => {
    mockRowsQueue = [EXISTS_ROW, [noteDriverRow(NOTE)]]

    await createCampaignNote(DM, CAMPAIGN_ID, {
      body: 'Written up later.',
      sessionDate: '2026-08-01',
    })

    expect(mockCalls[1].params).toContain('2026-08-01')
  })

  it('refuses to write into a campaign this DM does not run', async () => {
    mockRowsQueue = [[]]

    expect(await createCampaignNote(PLAYER, CAMPAIGN_ID, { body: 'Not mine.' })).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })
})

describe('appendToSessionNote', () => {
  it('appends to tonight’s note in SQL, so two devices do not overwrite each other', async () => {
    mockRowsQueue = [EXISTS_ROW, [noteDriverRow(NOTE)], [noteDriverRow(NOTE)]]

    const note = await appendToSessionNote(DM, CAMPAIGN_ID, 'Innkeeper is called Bram')

    const [authority, find, update] = mockCalls
    expect(authority.params).toEqual([CAMPAIGN_ID, DM, 1])

    // "Tonight" is the database's own date, not the app server's clock.
    expect(find.sql).toContain('current_date')
    expect(find.sql).toContain('limit')

    // And "tonight" is an *open* note: a published recap is what the party is
    // reading, and a line typed after the close would edit it under them
    // (`dm-run-suite/session-log-recap`). Both statements carry the arm.
    expect(find.sql).toContain('"session_closed_at" is null')
    expect(update.sql).toContain('"session_closed_at" is null')

    // Concatenated in SQL, and targeted at one id — a WHERE on session_date
    // alone would append to every note dated today, since UPDATE has no LIMIT.
    expect(update.sql).toContain('update "campaign_notes"')
    expect(update.sql).toContain('"body" ||')
    expect(update.params).toContain('\nInnkeeper is called Bram')
    expect(update.params).toContain(NOTE_ID)

    expect(note).toEqual(NOTE)
  })

  it('starts tonight’s note when there is not one yet', async () => {
    mockRowsQueue = [EXISTS_ROW, [], [noteDriverRow(NOTE)]]

    await appendToSessionNote(DM, CAMPAIGN_ID, 'First line of the night')

    const [, , insert] = mockCalls
    expect(insert.sql).toContain('insert into "campaign_notes"')
    expect(insert.params).toEqual([CAMPAIGN_ID, 'First line of the night'])
  })

  it('refuses a campaign this DM does not run, before looking for a note', async () => {
    mockRowsQueue = [[]]

    expect(await appendToSessionNote(PLAYER, CAMPAIGN_ID, 'sneaky')).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })
})

describe('getOpenSessionNote', () => {
  it('reads tonight’s open note in one statement, with the DM predicate in it', async () => {
    mockRows = [noteDriverRow(NOTE)]

    const note = await getOpenSessionNote(DM, CAMPAIGN_ID)

    // One statement: the session log runs this beside its five derived reads,
    // so a second authority round trip in front of it would cost a page load.
    expect(mockCalls).toHaveLength(1)

    const [find] = mockCalls
    expect(find.sql).toContain('current_date')
    expect(find.sql).toContain('"session_closed_at" is null')
    expect(find.sql).toContain('"dm_user_id"')
    expect(find.sql).toContain('order by')
    expect(find.params).toContain(DM)
    expect(note).toEqual(NOTE)
  })

  it('reads as no note for a campaign this DM does not run', async () => {
    mockRows = []

    expect(await getOpenSessionNote(PLAYER, CAMPAIGN_ID)).toBeNull()
  })
})

describe('getLastSessionClose', () => {
  it('is the newest close, scoped to the DM — the log’s window starts there', async () => {
    mockRows = [['2026-09-03T22:40:00.000Z']]

    const since = await getLastSessionClose(DM, CAMPAIGN_ID)

    const [read] = mockCalls
    expect(read.sql).toContain('"session_closed_at" is not null')
    expect(read.sql).toContain('exists')
    expect(read.sql).toContain('"dm_user_id"')
    expect(read.params).toContain(DM)
    expect(since).toEqual(new Date('2026-09-03T22:40:00.000Z'))
  })

  it('is null for a campaign that has never closed a session', async () => {
    mockRows = []

    expect(await getLastSessionClose(DM, CAMPAIGN_ID)).toBeNull()
  })
})

describe('publishSessionRecap', () => {
  it('writes one shared, closed note — the recap is a campaign note (D41)', async () => {
    const recap = { ...NOTE, sharedWithPlayers: true, sessionClosedAt: new Date() }
    mockRowsQueue = [EXISTS_ROW, [], [noteDriverRow(recap)]]

    const published = await publishSessionRecap(DM, CAMPAIGN_ID, 'They burned the shrine.')

    const [authority, latest, insert] = mockCalls
    expect(authority.sql).toContain('from "campaigns"')
    // The one read before the write: this campaign's newest published recap.
    expect(latest.sql).toContain('"session_closed_at" is not null')
    expect(latest.sql).toContain('order by "campaign_notes"."session_closed_at" desc')

    // One statement, one row, and both consequences of closing in it: the
    // party can read it, and the log's window has moved.
    expect(insert.sql).toContain('insert into "campaign_notes"')
    expect(insert.params).toContain('They burned the shrine.')
    expect(insert.params).toContain(true)
    // The close stamp: an ISO timestamp by the time the driver sees it.
    expect(insert.params.at(-1)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(published?.sharedWithPlayers).toBe(true)
  })

  it('never overwrites the note the DM captured into — there is no UPDATE', async () => {
    mockRowsQueue = [EXISTS_ROW, [], [noteDriverRow(NOTE)]]

    await publishSessionRecap(DM, CAMPAIGN_ID, 'Trimmed.')

    expect(mockCalls.some((call) => call.sql.includes('update "campaign_notes"'))).toBe(false)
  })

  it('refuses a campaign this DM does not run, before the insert', async () => {
    mockRowsQueue = [[]]

    expect(await publishSessionRecap(PLAYER, CAMPAIGN_ID, 'sneaky')).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('answers the recap already published with these words instead of a second row', async () => {
    // A close pressed again after its second write failed: same box, same text.
    const published = {
      ...NOTE,
      body: 'They burned the shrine.',
      sharedWithPlayers: true,
      sessionClosedAt: new Date('2026-09-10T22:30:00.000Z'),
    }
    mockRowsQueue = [EXISTS_ROW, [noteDriverRow(published)]]

    const recap = await publishSessionRecap(DM, CAMPAIGN_ID, 'They burned the shrine.')

    expect(recap?.id).toBe(NOTE_ID)
    expect(mockCalls).toHaveLength(2)
    expect(mockCalls.some((call) => call.sql.includes('insert into'))).toBe(false)
  })
})

describe('listCampaignRecaps', () => {
  it('carries all three arms: seated, shared, and closed', async () => {
    mockRows = [[NOTE_ID, '2026-08-15', 'Previously…']]

    const recaps = await listCampaignRecaps(PLAYER, CAMPAIGN_ID)

    const [read] = mockCalls

    // Membership — never `campaign_members.role`, which grants nothing.
    expect(read.sql).toContain('"campaign_members"')
    expect(read.params).toContain(PLAYER)

    // The DM said so, and it is a recap rather than any shared note.
    expect(read.sql).toContain('"shared_with_players" = $')
    expect(read.sql).toContain('"session_closed_at" is not null')
    expect(read.params).toContain(true)

    expect(recaps).toEqual([{ id: NOTE_ID, sessionDate: '2026-08-15', body: 'Previously…' }])
  })

  it('selects three columns and no unshared body could ride along', async () => {
    mockRows = []

    await listCampaignRecaps(PLAYER, CAMPAIGN_ID)

    const [read] = mockCalls
    expect(read.sql).toContain('"campaign_notes"."id"')
    expect(read.sql).toContain('"campaign_notes"."session_date"')
    expect(read.sql).toContain('"campaign_notes"."body"')
    expect(read.sql).not.toContain('"dm_user_id"')
  })

  it('is empty for a malformed campaign id, without a statement', async () => {
    expect(await listCampaignRecaps(PLAYER, 'not-an-id')).toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('updateCampaignNote', () => {
  it('carries the DM predicate, so a foreign note is a miss and not a 403', async () => {
    mockRows = []

    expect(
      await updateCampaignNote(PLAYER, CAMPAIGN_ID, NOTE_ID, { sharedWithPlayers: true }),
    ).toBeNull()

    const [update] = mockCalls
    expect(update.sql).toContain('update "campaign_notes"')
    expect(update.sql).toContain('exists')
    expect(update.sql).toContain('"dm_user_id"')
    expect(update.params).toContain(PLAYER)
  })

  it('shares a note when the DM asks', async () => {
    mockRows = [noteDriverRow({ ...NOTE, sharedWithPlayers: true })]

    const note = await updateCampaignNote(DM, CAMPAIGN_ID, NOTE_ID, { sharedWithPlayers: true })

    expect(mockCalls[0].params[0]).toBe(true)
    expect(note?.sharedWithPlayers).toBe(true)
  })
})

describe('deleteCampaignNote', () => {
  it('deletes only within a campaign this DM runs', async () => {
    mockRows = [[NOTE_ID]]

    expect(await deleteCampaignNote(DM, CAMPAIGN_ID, NOTE_ID)).toBe(true)

    const [remove] = mockCalls
    expect(remove.sql).toContain('delete from "campaign_notes"')
    expect(remove.sql).toContain('"dm_user_id"')
    expect(remove.params).toEqual([NOTE_ID, CAMPAIGN_ID, DM])
  })

  it('is false when there was nothing this DM could delete', async () => {
    mockRows = []
    expect(await deleteCampaignNote(PLAYER, CAMPAIGN_ID, NOTE_ID)).toBe(false)
  })
})

describe('listSharedNotesForCharacter', () => {
  it('never returns an unshared note, and only through a character the player owns', async () => {
    mockRows = [[NOTE_ID, 'The Rime of the Frostmaiden', '2026-08-15', 'They found the map.']]

    const notes = await listSharedNotesForCharacter(PLAYER, CHARACTER_ID)

    const [query] = mockCalls

    // All three arms of the rule, in one statement: it is their character, the
    // note's campaign is one that character plays in, and the DM shared it.
    expect(query.sql).toContain('"owner_id"')
    expect(query.sql).toContain('"character_campaigns"')
    expect(query.sql).toContain('"shared_with_players"')
    expect(query.params).toEqual([CHARACTER_ID, PLAYER, true])

    expect(notes).toEqual([
      {
        id: NOTE_ID,
        campaignName: 'The Rime of the Frostmaiden',
        sessionDate: '2026-08-15',
        body: 'They found the map.',
      },
    ])
  })

  it('is empty for a malformed character id', async () => {
    expect(await listSharedNotesForCharacter(PLAYER, 'nope')).toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('character notes are the owner’s alone', () => {
  it('reads through owner_id, not the DND-027 viewer predicate a DM would pass', async () => {
    mockRows = [['Owe 50gp to the smith.']]

    expect(await getCharacterNotes(PLAYER, CHARACTER_ID)).toBe('Owe 50gp to the smith.')

    const [query] = mockCalls
    expect(query.sql).toContain('from "character_notes"')
    expect(query.sql).toContain('"owner_id"')
    // The tell that this is *not* `viewableBy`: no campaign join, so a DM has
    // no arm of this WHERE clause that could ever match.
    expect(query.sql).not.toContain('"campaigns"')
    expect(query.params).toEqual([CHARACTER_ID, PLAYER, 1])
  })

  it('reads as empty for a character the user does not own', async () => {
    mockRows = []
    expect(await getCharacterNotes(DM, CHARACTER_ID)).toBe('')
  })

  it('checks ownership before upserting, and upserts a single row', async () => {
    mockRowsQueue = [
      EXISTS_ROW,
      [
        [
          CHARACTER_ID,
          'Do not trust the mayor.',
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      ],
    ]

    const saved = await saveCharacterNotes(PLAYER, CHARACTER_ID, 'Do not trust the mayor.')

    const [ownership, upsert] = mockCalls
    expect(ownership.sql).toContain('from "characters"')
    expect(ownership.params).toEqual([CHARACTER_ID, PLAYER, 1])

    expect(upsert.sql).toContain('insert into "character_notes"')
    expect(upsert.sql).toContain('on conflict')
    expect(saved?.body).toBe('Do not trust the mayor.')
  })

  it('refuses to write notes onto someone else’s character — including their DM’s', async () => {
    mockRowsQueue = [[]]

    expect(await saveCharacterNotes(DM, CHARACTER_ID, 'the DM was here')).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })
})
