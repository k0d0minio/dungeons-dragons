import { getTableColumns } from 'drizzle-orm'

import {
  generateTableToken,
  getTableView,
  loadSpotlightImage,
  regenerateTableToken,
  setCampaignSpotlight,
  spotlightOf,
} from './table'
import { campaigns, type Campaign } from './schema'

// The same real-Drizzle-over-a-stub-driver pattern the rest of `src/lib/db`
// uses, against the one boundary in this app with **no session behind it at
// all** (`dm-run-suite/table-screen-cast`). The properties under test:
//
//  - the token is the only way in, and every read is scoped to the campaign it
//    resolved — never to an id from anywhere else;
//  - `revealed_at is not null` rides on every prep read, so a handout the DM
//    hid again stops being on the screen and stops being fetchable;
//  - a cast sheet carries no coins, no bags and no notes;
//  - casting reveals, and re-casting does not restamp;
//  - a pointer that no longer resolves fails closed and silently.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
let mockRowsQueue: unknown[][][] | undefined
let mockRowsBySql: ((sql: string) => unknown[][]) | undefined

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  if (mockRowsBySql) return { rows: mockRowsBySql(sql) }
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
const OTHER_DM = 'user_9zQw1nBvRt'
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NPC_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const HANDOUT_ID = '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const CHARACTER_ID = '9f8e7d6c-5b4a-4392-8172-6a5b4c3d2e1f'
const AT = '2026-09-07T19:00:00.000Z'

const CAMPAIGN: Campaign = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'aGVsbG8gdGhlcmUgZnJpZW5k',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  tableToken: TOKEN,
  tableSpotlight: null,
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:00:00.000Z'),
}

/** A campaign row, positionally, as the Neon HTTP driver hands it back. */
function campaignRow(campaign: Campaign): unknown[] {
  return Object.keys(getTableColumns(campaigns)).map((column) => {
    const value = campaign[column as keyof Campaign]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** The statement that read (or wrote) this table, if one did. */
function callFor(fragment: string): DriverCall | undefined {
  return mockCalls.find((made) => made.sql.includes(fragment))
}

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
  mockRowsBySql = undefined
})

describe('generateTableToken', () => {
  it('is 128 bits of base64url — the join code’s shape, a third time', () => {
    const token = generateTableToken()

    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(generateTableToken()).not.toBe(token)
  })
})

describe('getTableView', () => {
  /**
   * Answer each statement by which table it names — the spotlight read, the
   * fight and the featured reveal all run in parallel, and which reaches the
   * driver first is the runtime's business, not this suite's.
   *
   * The three prep tables are read *twice* per view: once by the pointer (`id =
   * $1`) and once by `latestReveal` (`revealed_at > $2`). The `id =` arm is
   * what tells them apart, and the reveal reads answer empty unless a test
   * asks otherwise.
   */
  function respondWith({
    campaign = [campaignRow(CAMPAIGN)],
    npcs = [] as unknown[][],
    locations = [] as unknown[][],
    handouts = [] as unknown[][],
    encounters = [] as unknown[][],
    combatants = [] as unknown[][],
    characters = [] as unknown[][],
    items = [] as unknown[][],
  }) {
    mockRowsBySql = (sql) => {
      if (sql.includes('from "campaigns"')) return campaign
      if (sql.includes('"campaign_npcs"."id" =')) return npcs
      if (sql.includes('"campaign_locations"."id" =')) return locations
      if (sql.includes('"campaign_handouts"."id" =')) return handouts
      if (sql.includes('from "encounter_combatants"')) return combatants
      if (sql.includes('from "encounters"')) return encounters
      if (sql.includes('from "character_items"')) return items
      if (sql.includes('from "characters"')) return characters
      // The three `latestReveal` statements — nothing recent.
      return []
    }
  }

  /** The pointer's own read of a prep table, told apart from `latestReveal`. */
  function spotlightCall(table: string): DriverCall | undefined {
    return mockCalls.find((made) => made.sql.includes(`"${table}"."id" =`))
  }

  it('is the only way in: a token that is not token-shaped is never queried', async () => {
    await expect(getTableView('../../etc/passwd')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })

  it('answers null for a token no campaign holds', async () => {
    respondWith({ campaign: [] })

    await expect(getTableView(TOKEN)).resolves.toBeNull()
    expect(callFor('"campaigns"."table_token" = $1')?.params).toEqual([TOKEN, 1])
  })

  it('answers the campaign with nothing on the screen and no fight', async () => {
    respondWith({})

    await expect(getTableView(TOKEN)).resolves.toEqual({
      campaignName: 'The Rime of the Frostmaiden',
      spotlight: null,
      encounter: null,
    })
  })

  it('resolves a cast NPC through the public columns, revealed only', async () => {
    respondWith({
      campaign: [campaignRow({ ...CAMPAIGN, tableSpotlight: { kind: 'npc', id: NPC_ID, at: AT } })],
      npcs: [
        [
          NPC_ID,
          CAMPAIGN_ID,
          'Harbourmaster Vane',
          'Runs the docks, and is bought',
          'A wet coat.',
          AT,
          null,
        ],
      ],
    })

    const view = await getTableView(TOKEN)

    expect(view?.spotlight).toEqual({
      kind: 'npc',
      at: AT,
      name: 'Harbourmaster Vane',
      summary: 'Runs the docks, and is bought',
      description: 'A wet coat.',
      imageUploadedAt: null,
    })

    // The three arms that make this readable in one glance: this row, this
    // campaign, and the party has been shown it.
    const sql = spotlightCall('campaign_npcs')?.sql ?? ''
    expect(sql).toContain('"campaign_npcs"."id" = $1')
    expect(sql).toContain('"campaign_npcs"."campaign_id" = $2')
    expect(sql).toContain('"revealed_at" is not null')

    // Not one DM-only column is named on the statement, so there is nothing on
    // the way back that could be rendered by mistake.
    for (const column of ['motivation', 'secrets', 'twist', 'stat_reference', 'dm_notes']) {
      expect(sql).not.toContain(column)
    }
  })

  it('resolves a cast place and a cast handout through their public columns too', async () => {
    respondWith({
      campaign: [
        campaignRow({ ...CAMPAIGN, tableSpotlight: { kind: 'location', id: NPC_ID, at: AT } }),
      ],
      locations: [[NPC_ID, CAMPAIGN_ID, 'Kelp Harbour', 'No fishermen left', 'Nets rot.', AT]],
    })

    const place = await getTableView(TOKEN)

    expect(place?.spotlight).toEqual({
      kind: 'location',
      at: AT,
      name: 'Kelp Harbour',
      summary: 'No fishermen left',
      description: 'Nets rot.',
    })
    for (const column of ['secrets', 'dm_notes']) {
      expect(spotlightCall('campaign_locations')?.sql).not.toContain(column)
    }

    mockCalls.length = 0
    respondWith({
      campaign: [
        campaignRow({ ...CAMPAIGN, tableSpotlight: { kind: 'handout', id: HANDOUT_ID, at: AT } }),
      ],
      handouts: [
        [
          HANDOUT_ID,
          CAMPAIGN_ID,
          'The pressed-flower letter',
          'Come alone.',
          AT,
          {
            pathname: 'campaigns/x/handouts/y.jpg',
            contentType: 'image/jpeg',
            bytes: 9,
            uploadedAt: AT,
          },
        ],
      ],
    })

    const letter = await getTableView(TOKEN)

    expect(letter?.spotlight).toEqual({
      kind: 'handout',
      at: AT,
      title: 'The pressed-flower letter',
      body: 'Come alone.',
      // That there is a picture, and its cache key — never where it lives.
      imageUploadedAt: AT,
    })
    expect(JSON.stringify(letter)).not.toContain('pathname')
    for (const column of ['provenance', 'dm_notes']) {
      expect(spotlightCall('campaign_handouts')?.sql).not.toContain(column)
    }
  })

  it('falls back to the fight, silently, when the pointer no longer resolves', async () => {
    // The handout was hidden again, or deleted. Six people are watching this
    // screen and the DM’s hands are elsewhere, so it fails closed and quiet.
    respondWith({
      campaign: [
        campaignRow({ ...CAMPAIGN, tableSpotlight: { kind: 'handout', id: HANDOUT_ID, at: AT } }),
      ],
      handouts: [],
    })

    const view = await getTableView(TOKEN)

    expect(view?.spotlight).toBeNull()
    expect(view?.campaignName).toBe('The Rime of the Frostmaiden')
  })

  it('reads a stored shape it does not understand as nothing on the screen', async () => {
    respondWith({
      campaign: [
        campaignRow({
          ...CAMPAIGN,
          tableSpotlight: { kind: 'ledger', id: NPC_ID, at: AT } as never,
        }),
      ],
    })

    const view = await getTableView(TOKEN)

    expect(view?.spotlight).toBeNull()
    // Nothing was even looked up: the pointer never became a query.
    expect(spotlightCall('campaign_npcs')).toBeUndefined()
  })

  it('hands an SRD pointer straight through, unresolved', async () => {
    respondWith({
      campaign: [
        campaignRow({
          ...CAMPAIGN,
          tableSpotlight: { kind: 'monster', index: 'adult-red-dragon', at: AT },
        }),
      ],
    })

    const view = await getTableView(TOKEN)

    // The browser fetches the book’s page from the public reference endpoints,
    // so no game text — and nothing about this campaign’s fight — crosses the
    // token.
    expect(view?.spotlight).toEqual({ kind: 'monster', at: AT, index: 'adult-red-dragon' })
  })

  it('scopes a cast character to the campaign’s own roster', async () => {
    respondWith({
      campaign: [
        campaignRow({
          ...CAMPAIGN,
          tableSpotlight: { kind: 'character', id: CHARACTER_ID, at: AT },
        }),
      ],
      characters: [
        [
          CHARACTER_ID,
          'Vex Ashbrand',
          5,
          'elf',
          'rogue',
          'thief',
          'criminal',
          10,
          18,
          14,
          12,
          13,
          8,
          12,
          21,
          38,
          3,
          30,
          ['prone'],
          0,
          ['stealth'],
          ['stealth'],
          null,
        ],
      ],
    })

    const view = await getTableView(TOKEN)

    expect(view?.spotlight).toMatchObject({
      kind: 'character',
      at: AT,
      sheet: { name: 'Vex Ashbrand', hitPoints: { current: 21, max: 38, temp: 3 } },
    })

    const sql = callFor('from "characters"')?.sql ?? ''
    // A uuid off a stale pointer cannot pull a sheet in from another table.
    expect(sql).toContain('character_campaigns')
    expect(sql).toContain('"character_campaigns"."campaign_id" = $2')
    // And the selection is the projection’s, not the row’s.
    for (const column of ['"gp"', '"experience"', '"owner_id"', '"spell_slots"']) {
      expect(sql).not.toContain(column)
    }
  })
})

describe('loadSpotlightImage', () => {
  it('serves only what is on the screen right now', async () => {
    mockRowsBySql = (sql) => {
      if (sql.includes('from "campaigns"'))
        return [
          campaignRow({ ...CAMPAIGN, tableSpotlight: { kind: 'handout', id: HANDOUT_ID, at: AT } }),
        ]
      if (sql.includes('from "campaign_handouts"'))
        return [
          [
            {
              pathname: 'campaigns/x/handouts/y.jpg',
              contentType: 'image/jpeg',
              bytes: 10,
              uploadedAt: AT,
            },
          ],
        ]
      return []
    }

    await expect(loadSpotlightImage(TOKEN)).resolves.toEqual({
      image: expect.objectContaining({ pathname: 'campaigns/x/handouts/y.jpg' }),
    })

    // The gate is the same three arms, so a handout hidden again 404s from this
    // URL while the screen is still catching up.
    expect(callFor('from "campaign_handouts"')?.sql).toContain('"revealed_at" is not null')
  })

  it('serves a face and a portrait through the same one URL', async () => {
    for (const [kind, table] of [
      ['npc', 'campaign_npcs'],
      ['character', 'characters'],
    ] as const) {
      mockCalls.length = 0
      mockRowsBySql = (sql) => {
        if (sql.includes('from "campaigns"'))
          return [campaignRow({ ...CAMPAIGN, tableSpotlight: { kind, id: NPC_ID, at: AT } })]
        if (sql.includes(`from "${table}"`))
          return [
            [{ pathname: `x/${kind}.jpg`, contentType: 'image/jpeg', bytes: 9, uploadedAt: AT }],
          ]
        return []
      }

      await expect(loadSpotlightImage(TOKEN)).resolves.toEqual({
        image: expect.objectContaining({ pathname: `x/${kind}.jpg` }),
      })
    }
  })

  it('has nothing to serve for a place, which carries no picture', async () => {
    mockRowsBySql = (sql) =>
      sql.includes('from "campaigns"')
        ? [campaignRow({ ...CAMPAIGN, tableSpotlight: { kind: 'location', id: NPC_ID, at: AT } })]
        : []

    await expect(loadSpotlightImage(TOKEN)).resolves.toBeNull()
  })

  it('has nothing to serve when nothing is cast', async () => {
    mockRows = [campaignRow(CAMPAIGN)]

    await expect(loadSpotlightImage(TOKEN)).resolves.toBeNull()
  })
})

describe('regenerateTableToken', () => {
  it('replaces the token, DM-scoped, and kills the old link', async () => {
    mockRows = [campaignRow(CAMPAIGN)]

    const result = await regenerateTableToken(DM, CAMPAIGN_ID)

    expect(result?.id).toBe(CAMPAIGN_ID)
    const call = mockCalls[0]
    expect(call.sql).toContain('update "campaigns"')
    expect(call.sql).toContain('"dm_user_id" = $')
    expect(call.params).toContain(DM)
  })

  it('answers null for a campaign this user does not run', async () => {
    mockRows = []

    await expect(regenerateTableToken(OTHER_DM, CAMPAIGN_ID)).resolves.toBeNull()
  })

  it('never queries on an id that is not a uuid', async () => {
    await expect(regenerateTableToken(DM, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('setCampaignSpotlight', () => {
  it('checks the campaign really holds it, reveals it, then points the screen at it', async () => {
    mockRowsQueue = [[[NPC_ID]], [], [campaignRow(CAMPAIGN)]]

    const result = await setCampaignSpotlight(DM, CAMPAIGN_ID, { kind: 'npc', id: NPC_ID })

    expect(result?.id).toBe(CAMPAIGN_ID)
    expect(mockCalls).toHaveLength(3)

    // The order is the guarantee on a driver with no transactions: a revealed
    // thing not on the screen is a DM tapping again; a screen showing an
    // unrevealed thing is the leak.
    expect(mockCalls[0].sql).toContain('from "campaign_npcs"')
    expect(mockCalls[1].sql).toContain('update "campaign_npcs"')
    expect(mockCalls[2].sql).toContain('update "campaigns"')

    // Re-casting an NPC introduced last week must not restamp it as met
    // tonight, or the recap says the party learned it twice.
    expect(mockCalls[1].sql).toContain('"revealed_at" is null')
    expect(mockCalls[1].sql).toContain('"dm_user_id" = $')

    const stored = mockCalls[2].params.find(
      (param) => typeof param === 'string' && param.includes('"kind":"npc"'),
    )
    expect(stored).toContain(NPC_ID)
  })

  it('refuses a pointer at a row this campaign does not hold, and stores nothing', async () => {
    mockRowsQueue = [[]]

    await expect(
      setCampaignSpotlight(DM, CAMPAIGN_ID, { kind: 'handout', id: HANDOUT_ID }),
    ).resolves.toBeNull()

    // A pointer at someone else's row must never be *stored*, even for the
    // moment before a read would refuse to resolve it.
    expect(mockCalls).toHaveLength(1)
    expect(callFor('update "campaigns"')).toBeUndefined()
  })

  it('reveals nothing when the cast thing is a character', async () => {
    mockRowsQueue = [[[CHARACTER_ID]], [campaignRow(CAMPAIGN)]]

    await setCampaignSpotlight(DM, CAMPAIGN_ID, { kind: 'character', id: CHARACTER_ID })

    // A character is not prep; there is no `revealed_at` to stamp.
    expect(mockCalls).toHaveLength(2)
    expect(mockCalls[1].sql).toContain('update "campaigns"')
  })

  it('casts an SRD entry with no existence check of ours to do', async () => {
    mockRowsQueue = [[campaignRow(CAMPAIGN)]]

    await setCampaignSpotlight(DM, CAMPAIGN_ID, { kind: 'condition', index: 'prone' })

    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('update "campaigns"')
  })

  it('clears the screen with one write and no reveal', async () => {
    mockRowsQueue = [[campaignRow(CAMPAIGN)]]

    await setCampaignSpotlight(DM, CAMPAIGN_ID, null)

    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('update "campaigns"')
    expect(mockCalls[0].params).toContain(null)
  })
})

describe('spotlightOf', () => {
  it('reads the column back for the DM’s remote', () => {
    expect(spotlightOf({ tableSpotlight: { kind: 'npc', id: NPC_ID, at: AT } })).toEqual({
      kind: 'npc',
      id: NPC_ID,
      at: AT,
    })
    expect(spotlightOf({ tableSpotlight: null })).toBeNull()
  })
})
