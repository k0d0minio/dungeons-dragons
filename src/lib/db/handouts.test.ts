import { getTableColumns } from 'drizzle-orm'

import {
  createCampaignHandout,
  deleteCampaignHandout,
  handoutPublicColumns,
  listCampaignHandouts,
  loadHandoutImage,
  setHandoutImage,
  updateCampaignHandout,
  type CampaignHandout,
} from './handouts'
import { campaignHandouts } from './schema'

// The third revealable entity, and the one carrying an image
// (`dm-prep-suite/locations-handouts`). Two properties are under test:
//
// - D38's, as on the other two tables — every statement folds
//   `campaigns.dm_user_id` into its WHERE, and the public layer is a named
//   selection.
// - The redaction. `image` holds a key into a *private* blob store, so every
//   read out of this module reduces it to metadata and exactly one function
//   hands back the key itself.
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
const HANDOUT_ID = '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f'

const IMAGE = {
  pathname: 'campaigns/7b2e4f1a/handouts/6d1e2f30-x1y2.jpg',
  contentType: 'image/jpeg',
  bytes: 120_000,
  uploadedAt: '2026-09-03T10:00:00.000Z',
}

const HANDOUT: CampaignHandout = {
  id: HANDOUT_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'The pressed-flower letter',
  body: 'Dearest Mira — do not come back for me.',
  image: null,
  provenance: 'Written by the harbourmaster, in a hand that is not his.',
  dmNotes: 'Produce it only after they have searched the room twice.',
}

/** A handout row, positionally, as the Neon HTTP driver hands it back. */
function driverRow(handout: CampaignHandout): unknown[] {
  return Object.keys(getTableColumns(campaignHandouts)).map((column) => {
    const value = handout[column as keyof CampaignHandout]
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

describe('handoutPublicColumns', () => {
  it('names the public layer and nothing else', () => {
    expect(Object.keys(handoutPublicColumns).sort()).toEqual([
      'body',
      'campaignId',
      'id',
      'revealedAt',
      'title',
    ])
  })

  it('carries no DM-only column, and not the store key either', () => {
    expect(handoutPublicColumns).not.toHaveProperty('provenance')
    expect(handoutPublicColumns).not.toHaveProperty('dmNotes')
    expect(handoutPublicColumns).not.toHaveProperty('image')
  })
})

describe('listCampaignHandouts', () => {
  it('scopes to the DM and orders by title', async () => {
    mockRowsQueue = [EXISTS_ROW, [driverRow(HANDOUT)]]

    const handouts = await listCampaignHandouts(DM, CAMPAIGN_ID)

    const [authority, list] = mockCalls

    expect(authority.sql).toContain('from "campaigns"')
    expect(authority.params).toEqual([CAMPAIGN_ID, DM, 1])

    expect(list.sql).toContain('from "campaign_handouts"')
    expect(list.sql).toContain('exists')
    expect(list.sql).toContain('"dm_user_id"')
    expect(list.sql).toMatch(/order by .*"title" asc.*"created_at" asc/)

    expect(handouts).toEqual([HANDOUT])
  })

  it('is a miss for a campaign this DM does not run — nothing is read', async () => {
    mockRowsQueue = [[]]

    expect(await listCampaignHandouts(PLAYER, CAMPAIGN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await listCampaignHandouts(DM, 'not-a-uuid')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createCampaignHandout', () => {
  it('settles authority before inserting', async () => {
    mockRowsQueue = [EXISTS_ROW, [driverRow(HANDOUT)]]

    const handout = await createCampaignHandout(DM, CAMPAIGN_ID, { title: 'A letter' })

    const [authority, insert] = mockCalls
    expect(authority.sql).toContain('from "campaigns"')
    expect(insert.sql).toContain('insert into "campaign_handouts"')

    expect(handout).toEqual(HANDOUT)
  })

  it('never writes a revealed row — campaign content starts hidden', async () => {
    mockRowsQueue = [EXISTS_ROW, [driverRow(HANDOUT)]]

    await createCampaignHandout(DM, CAMPAIGN_ID, { title: 'A letter' })

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

    expect(await createCampaignHandout(PLAYER, CAMPAIGN_ID, { title: 'Mine now' })).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed campaign id as a miss', async () => {
    expect(await createCampaignHandout(DM, 'nope', { title: 'A letter' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('updateCampaignHandout', () => {
  it('carries the DM, the campaign and the handout in one statement', async () => {
    mockRows = [driverRow({ ...HANDOUT, provenance: null })]

    const handout = await updateCampaignHandout(DM, CAMPAIGN_ID, HANDOUT_ID, { provenance: null })

    const [update] = mockCalls
    expect(update.sql).toContain('update "campaign_handouts"')
    expect(update.sql).toContain('"dm_user_id"')
    expect(update.params).toEqual(expect.arrayContaining([HANDOUT_ID, CAMPAIGN_ID, DM]))

    expect(handout?.provenance).toBeNull()
  })

  it('is a miss when the statement changed nothing', async () => {
    mockRows = []

    expect(
      await updateCampaignHandout(PLAYER, CAMPAIGN_ID, HANDOUT_ID, { title: 'Mine now' }),
    ).toBeNull()
  })

  it('treats a malformed id as a miss', async () => {
    expect(await updateCampaignHandout(DM, CAMPAIGN_ID, 'nope', { title: 'x' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteCampaignHandout', () => {
  it('deletes only within a campaign this DM runs, and hands back the image', async () => {
    mockRows = [[HANDOUT_ID, IMAGE]]

    expect(await deleteCampaignHandout(DM, CAMPAIGN_ID, HANDOUT_ID)).toEqual({
      deleted: true,
      image: IMAGE,
    })

    const [remove] = mockCalls
    expect(remove.sql).toContain('delete from "campaign_handouts"')
    expect(remove.sql).toContain('"dm_user_id"')
  })

  // "Deleted, and it had no picture" must not read as "nothing was deleted".
  it('separates the delete from the image it did or did not carry', async () => {
    mockRows = [[HANDOUT_ID, null]]

    expect(await deleteCampaignHandout(DM, CAMPAIGN_ID, HANDOUT_ID)).toEqual({
      deleted: true,
      image: null,
    })
  })

  it('is not a delete when there was nothing this DM could delete', async () => {
    mockRows = []

    expect(await deleteCampaignHandout(PLAYER, CAMPAIGN_ID, HANDOUT_ID)).toEqual({
      deleted: false,
      image: null,
    })
  })

  it('treats a malformed id as a miss', async () => {
    expect(await deleteCampaignHandout(DM, CAMPAIGN_ID, 'nope')).toEqual({
      deleted: false,
      image: null,
    })
    expect(mockCalls).toHaveLength(0)
  })
})

// The redaction, which is what keeps a private store private.
describe('the image', () => {
  it('never leaves on a listed row — only its size, type and date do', async () => {
    mockRowsQueue = [EXISTS_ROW, [driverRow({ ...HANDOUT, image: IMAGE })]]

    const [handout] = (await listCampaignHandouts(DM, CAMPAIGN_ID)) ?? []

    expect(handout?.image).toEqual({
      contentType: IMAGE.contentType,
      bytes: IMAGE.bytes,
      uploadedAt: IMAGE.uploadedAt,
    })
    expect(JSON.stringify(handout)).not.toContain('campaigns/7b2e4f1a')
  })

  it('is readable in full through `loadHandoutImage`, scoped to the DM', async () => {
    mockRows = [[IMAGE]]

    expect(await loadHandoutImage(DM, CAMPAIGN_ID, HANDOUT_ID)).toEqual({ image: IMAGE })

    const [read] = mockCalls
    expect(read.sql).toContain('"dm_user_id"')
    expect(read.params).toEqual(expect.arrayContaining([HANDOUT_ID, CAMPAIGN_ID, DM]))
  })

  // Two different answers, and the image route sends two different statuses.
  it('tells "no such handout" apart from "that handout has no picture"', async () => {
    mockRows = []
    expect(await loadHandoutImage(PLAYER, CAMPAIGN_ID, HANDOUT_ID)).toBeNull()

    mockCalls.length = 0
    mockRows = [[null]]
    expect(await loadHandoutImage(DM, CAMPAIGN_ID, HANDOUT_ID)).toEqual({ image: null })
  })

  it('is set by a DM-scoped update, and comes back redacted', async () => {
    mockRows = [driverRow({ ...HANDOUT, image: IMAGE })]

    const handout = await setHandoutImage(DM, CAMPAIGN_ID, HANDOUT_ID, IMAGE)

    const [update] = mockCalls
    expect(update.sql).toContain('update "campaign_handouts"')
    expect(update.sql).toContain('"dm_user_id"')
    expect(handout?.image).not.toHaveProperty('pathname')
  })

  it('is a miss for a malformed id, before any statement runs', async () => {
    expect(await loadHandoutImage(DM, CAMPAIGN_ID, 'nope')).toBeNull()
    expect(await setHandoutImage(DM, 'nope', HANDOUT_ID, null)).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})
