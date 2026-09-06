import {
  getCampaignForMember,
  listAnnouncedPlans,
  listDiscoveredHandouts,
  listDiscoveredLocations,
  listDiscoveredNpcs,
  listPartyForMember,
  loadDiscoveredHandoutImage,
  loadPartyPortrait,
  nextAnnouncedNight,
  nextAnnouncedNightsForCharacter,
} from './discovered'

// The player's campaign view (`dm-run-suite/player-campaign-view`, D38).
//
// The same real-Drizzle-over-a-stub-driver pattern as `npcs.test.ts`: the
// statements are really built and really rendered to SQL, and what is faked is
// only the wire. That matters more here than anywhere else in the data layer,
// because the property under test is a property *of the SQL* — a player-facing
// read must carry membership, must carry `revealed_at is not null`, and must
// never name a DM-only column.
//
// Asserting on the emitted SQL rather than on returned objects is deliberate.
// A stub driver decides what comes back, so a round-trip test would be checking
// the stub. The statement text is the thing the database would actually run,
// and it is the thing a future edit would break.
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

const PLAYER = 'user_9zQw1nBvRt'
const OTHER = 'user_1aBcD2eFgH'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NPC_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const HANDOUT_ID = '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f'
const CHARACTER_ID = '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c'
const NOT_AN_ID = 'not-a-uuid'

/**
 * Every column across the three prep tables that a player must never read.
 *
 * The list is the union rather than one per entity on purpose: a column moving
 * between tables should still be caught, and a statement that names any of
 * these is wrong whichever table it reads.
 */
const DM_ONLY_SQL_COLUMNS = [
  'motivation',
  'secrets',
  'twist',
  'stat_reference',
  'dm_notes',
  'provenance',
  'strong_start',
  'treasure',
] as const

/** An announced night, positionally, in `sessionPlanPublicColumns`' order. */
function announcedRow(
  id: string,
  campaignId: string,
  title: string,
  sessionDate: string | null,
  revealedAt: string,
): unknown[] {
  return [id, campaignId, title, sessionDate, revealedAt]
}

const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const OTHER_PLAN_ID = '4d0e2f1a-3b5c-4d7e-9f1a-2b3c4d5e6f7a'
const OTHER_CAMPAIGN_ID = '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e'

/** A stored image, as a column holds one — the shape that must not escape. */
const STORED_IMAGE = {
  pathname: 'campaigns/7b2e4f1a/handouts/6d1e2f30-abc123.jpg',
  contentType: 'image/jpeg',
  bytes: 24_000,
  uploadedAt: '2026-09-03T10:00:00.000Z',
}

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
})

/** The one statement a call emitted. */
function onlyCall(): DriverCall {
  expect(mockCalls).toHaveLength(1)
  return mockCalls[0]
}

describe('the three arms every player-facing read carries', () => {
  const reads = [
    { name: 'listDiscoveredNpcs', run: () => listDiscoveredNpcs(PLAYER, CAMPAIGN_ID) },
    { name: 'listDiscoveredLocations', run: () => listDiscoveredLocations(PLAYER, CAMPAIGN_ID) },
    { name: 'listDiscoveredHandouts', run: () => listDiscoveredHandouts(PLAYER, CAMPAIGN_ID) },
    {
      name: 'loadDiscoveredHandoutImage',
      run: () => loadDiscoveredHandoutImage(PLAYER, CAMPAIGN_ID, HANDOUT_ID),
    },
    { name: 'listAnnouncedPlans', run: () => listAnnouncedPlans(PLAYER, CAMPAIGN_ID) },
    {
      name: 'nextAnnouncedNightsForCharacter',
      run: () => nextAnnouncedNightsForCharacter(PLAYER, CHARACTER_ID),
    },
  ]

  it.each(reads)('$name folds membership into the statement', async ({ run }) => {
    await run()

    const { sql, params } = onlyCall()

    // Membership is an EXISTS over the roster table, in the SQL — not a check
    // somewhere above it that a later edit could return early past.
    expect(sql).toContain('exists')
    expect(sql).toContain('"campaign_members"')
    expect(sql).toContain('"user_id"')
    expect(params).toContain(PLAYER)
  })

  it.each(reads)('$name refuses to select an unrevealed row', async ({ run }) => {
    await run()

    // Null is hidden, and this is the arm that says so. A read that lost it
    // would return the DM's whole unrevealed prep.
    expect(onlyCall().sql).toContain('"revealed_at" is not null')
  })

  it.each(reads)('$name names no DM-only column', async ({ run }) => {
    await run()

    const { sql } = onlyCall()

    for (const column of DM_ONLY_SQL_COLUMNS) {
      expect(sql).not.toContain(column)
    }
  })

  it.each(reads)('$name asks the database, never a filter afterwards', async ({ run }) => {
    // A row a player may not see must be one the statement never selected. If
    // the reveal check had moved into TypeScript, the SQL would come back
    // unfiltered and this is what would catch it.
    await run()

    const { sql } = onlyCall()
    const [selectList] = sql.split(' from ')

    expect(selectList).not.toContain('"revealed_at" is not null')
    expect(sql).toMatch(/where [\s\S]*"revealed_at" is not null/)
  })
})

describe('listDiscoveredNpcs', () => {
  it('selects the public layer', async () => {
    await listDiscoveredNpcs(PLAYER, CAMPAIGN_ID)

    const { sql, params } = onlyCall()

    expect(sql).toContain('from "campaign_npcs"')
    // The public layer, in full — the columns a revealed NPC is allowed to be.
    expect(sql).toContain('"name"')
    expect(sql).toContain('"summary"')
    expect(sql).toContain('"description"')
    expect(params).toContain(CAMPAIGN_ID)
  })

  it('is newest first, so a reveal lands at the top of the list', async () => {
    // `dm-run-suite/reveal-controls`: the DM reveals someone mid-scene and the
    // party's phones refresh within a poll. Alphabetical would file the new
    // arrival eleventh under G.
    await listDiscoveredNpcs(PLAYER, CAMPAIGN_ID)

    expect(onlyCall().sql).toMatch(/order by .*"revealed_at" desc.*"name" asc/)
  })

  it('is an empty list for an id that is not id-shaped, without a query', async () => {
    expect(await listDiscoveredNpcs(PLAYER, NOT_AN_ID)).toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('listDiscoveredLocations', () => {
  it('selects the public layer, newest first like the other two', async () => {
    await listDiscoveredLocations(PLAYER, CAMPAIGN_ID)

    const { sql } = onlyCall()

    expect(sql).toContain('from "campaign_locations"')
    expect(sql).toMatch(/order by .*"revealed_at" desc.*"name" asc/)
  })

  it('is an empty list for a malformed id, without a query', async () => {
    expect(await listDiscoveredLocations(PLAYER, NOT_AN_ID)).toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('listDiscoveredHandouts', () => {
  it('takes the upload time out of the image column and nothing else', async () => {
    await listDiscoveredHandouts(PLAYER, CAMPAIGN_ID)

    const { sql } = onlyCall()
    const [selectList] = sql.split(' from ')

    // The store key is the one thing that must not cross to a browser, so the
    // column is never selected — only this scalar dug out of it in SQL.
    expect(selectList).toContain("->>'uploadedAt'")
    expect(selectList).not.toContain('pathname')

    // The image column appears exactly once, and only as the thing the JSON
    // operator reads. A bare `"image"` in the select list would be the leak.
    expect(selectList.match(/"image"/g)).toHaveLength(1)
    expect(selectList).toMatch(/"image"->>'uploadedAt'/)
  })

  it('is newest first — a handout is a stack, not a directory', async () => {
    await listDiscoveredHandouts(PLAYER, CAMPAIGN_ID)

    expect(onlyCall().sql).toMatch(/order by .*"revealed_at" desc/)
  })

  it('hands back the row as the driver gave it, image absent', async () => {
    mockRows = [[HANDOUT_ID, CAMPAIGN_ID, 'A letter', 'Come alone.', new Date(), null]]

    const [handout] = await listDiscoveredHandouts(PLAYER, CAMPAIGN_ID)

    expect(handout).not.toHaveProperty('image')
    expect(handout).not.toHaveProperty('provenance')
    expect(handout.title).toBe('A letter')
  })

  it('is an empty list for a malformed id, without a query', async () => {
    expect(await listDiscoveredHandouts(PLAYER, NOT_AN_ID)).toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('getCampaignForMember', () => {
  it('joins the roster, so a table you do not sit at reads as no table', async () => {
    await getCampaignForMember(PLAYER, CAMPAIGN_ID)

    const { sql, params } = onlyCall()

    expect(sql).toContain('from "campaigns"')
    expect(sql).toContain('"campaign_members"')
    expect(params).toEqual(expect.arrayContaining([PLAYER, CAMPAIGN_ID]))
  })

  it('is null when the join finds nothing', async () => {
    mockRows = []

    expect(await getCampaignForMember(PLAYER, CAMPAIGN_ID)).toBeNull()
  })

  it('is null for a malformed id, without a query', async () => {
    expect(await getCampaignForMember(PLAYER, NOT_AN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('listPartyForMember', () => {
  it('reads the roster through the seat the reader holds', async () => {
    await listPartyForMember(PLAYER, CAMPAIGN_ID)

    const { sql, params } = onlyCall()

    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('"campaign_members"')
    expect(sql).toMatch(/order by .*"name" asc/)
    expect(params).toEqual(expect.arrayContaining([PLAYER, CAMPAIGN_ID]))
  })

  it('selects a party list, not a character sheet', async () => {
    await listPartyForMember(PLAYER, CAMPAIGN_ID)

    const [selectList] = onlyCall().sql.split(' from ')

    // What another player is entitled to: who they are and what they are.
    expect(selectList).toContain('"name"')
    expect(selectList).toContain('"level"')
    expect(selectList).toContain('"class_index"')

    // What they are not: the owner's own business, and the DM's.
    for (const column of ['current_hit_points', 'max_hit_points', 'armor_class', 'gold']) {
      expect(selectList).not.toContain(column)
    }
  })

  it('redacts the portrait to metadata and marks the character the reader owns', async () => {
    mockRows = [
      [CHARACTER_ID, 'Vess Ondrel', 3, 'elf', 'wizard', STORED_IMAGE, PLAYER],
      [NPC_ID, 'Grud', 3, 'orc', 'fighter', null, OTHER],
    ]

    const [mine, theirs] = await listPartyForMember(PLAYER, CAMPAIGN_ID)

    // The store key never leaves the data layer — the browser is told that
    // there is a picture and how big, and gets the bytes from the authed route.
    expect(mine.portrait).toEqual({
      contentType: 'image/jpeg',
      bytes: 24_000,
      uploadedAt: '2026-09-03T10:00:00.000Z',
    })
    expect(JSON.stringify(mine)).not.toContain(STORED_IMAGE.pathname)

    expect(mine.isYours).toBe(true)
    expect(theirs.isYours).toBe(false)
    expect(theirs.portrait).toBeNull()

    // The owner id was needed to answer `isYours` and is not passed on.
    expect(mine).not.toHaveProperty('ownerId')
  })

  it('is an empty party for a malformed id, without a query', async () => {
    expect(await listPartyForMember(PLAYER, NOT_AN_ID)).toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('loadDiscoveredHandoutImage', () => {
  it('is the one unredacted read, and still carries reveal and membership', async () => {
    mockRows = [[STORED_IMAGE]]

    const row = await loadDiscoveredHandoutImage(PLAYER, CAMPAIGN_ID, HANDOUT_ID)

    expect(row).toEqual({ image: STORED_IMAGE })

    const { sql, params } = onlyCall()

    expect(sql).toContain('"revealed_at" is not null')
    expect(sql).toContain('"campaign_members"')
    expect(params).toEqual(expect.arrayContaining([HANDOUT_ID, PLAYER, CAMPAIGN_ID]))
  })

  it('separates "no such handout" from "that handout has no picture"', async () => {
    mockRows = []
    expect(await loadDiscoveredHandoutImage(PLAYER, CAMPAIGN_ID, HANDOUT_ID)).toBeNull()

    mockCalls.length = 0
    mockRows = [[null]]
    expect(await loadDiscoveredHandoutImage(PLAYER, CAMPAIGN_ID, HANDOUT_ID)).toEqual({
      image: null,
    })
  })

  it('is a miss for a malformed id, without a query', async () => {
    expect(await loadDiscoveredHandoutImage(PLAYER, CAMPAIGN_ID, NOT_AN_ID)).toBeNull()
    expect(await loadDiscoveredHandoutImage(PLAYER, NOT_AN_ID, HANDOUT_ID)).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('loadPartyPortrait', () => {
  it('requires the character to be at a table the reader sits at', async () => {
    mockRows = [[STORED_IMAGE]]

    const row = await loadPartyPortrait(PLAYER, CAMPAIGN_ID, CHARACTER_ID)

    expect(row).toEqual({ image: STORED_IMAGE })

    const { sql, params } = onlyCall()

    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('"campaign_members"')
    expect(params).toEqual(expect.arrayContaining([PLAYER, CAMPAIGN_ID, CHARACTER_ID]))
  })

  it('has no reveal arm, because a character is not prep', async () => {
    await loadPartyPortrait(PLAYER, CAMPAIGN_ID, CHARACTER_ID)

    // The roster is what stands in its place: `character_campaigns` joined to
    // the reader's own membership row.
    expect(onlyCall().sql).not.toContain('"revealed_at"')
  })

  it('separates "not at this table" from "no portrait"', async () => {
    mockRows = []
    expect(await loadPartyPortrait(PLAYER, CAMPAIGN_ID, CHARACTER_ID)).toBeNull()

    mockCalls.length = 0
    mockRows = [[null]]
    expect(await loadPartyPortrait(PLAYER, CAMPAIGN_ID, CHARACTER_ID)).toEqual({ image: null })
  })

  it('is a miss for a malformed id, without a query', async () => {
    expect(await loadPartyPortrait(PLAYER, CAMPAIGN_ID, NOT_AN_ID)).toBeNull()
    expect(await loadPartyPortrait(PLAYER, NOT_AN_ID, CHARACTER_ID)).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

// The announced nights (`first-table/announce-the-night`): the fourth
// revealable entity's player surface, and the first one read against a
// calendar rather than as a feed.
describe('listAnnouncedPlans', () => {
  it('selects the title and the date — never the strong start or the treasure', async () => {
    await listAnnouncedPlans(PLAYER, CAMPAIGN_ID)

    const { sql } = onlyCall()
    const [selectList] = sql.split(' from ')

    expect(selectList).toContain('"title"')
    expect(selectList).toContain('"session_date"')
    expect(selectList).toContain('"revealed_at"')
    expect(selectList).not.toContain('strong_start')
    expect(selectList).not.toContain('treasure')
    expect(sql).not.toContain('session_plan_items')
  })

  it('is soonest first with undated nights last — a calendar, not a feed', async () => {
    await listAnnouncedPlans(PLAYER, CAMPAIGN_ID)

    expect(onlyCall().sql).toMatch(
      /order by "campaign_session_plans"\."session_date" asc nulls last/,
    )
  })

  it('is an empty list for a malformed id, without a query', async () => {
    expect(await listAnnouncedPlans(PLAYER, NOT_AN_ID)).toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('nextAnnouncedNight', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-08T12:00:00.000Z') })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('picks the soonest night that is today or later', async () => {
    mockRows = [
      announcedRow(OTHER_PLAN_ID, CAMPAIGN_ID, 'Session 0', '2026-09-03', '2026-09-01T10:00:00Z'),
      announcedRow(PLAN_ID, CAMPAIGN_ID, 'Session 1 - Intro', '2026-09-10', '2026-09-05T10:00:00Z'),
    ]

    const night = await nextAnnouncedNight(PLAYER, CAMPAIGN_ID)

    expect(night?.id).toBe(PLAN_ID)
    expect(night?.title).toBe('Session 1 - Intro')
  })

  it('falls back to the most recently announced night when none is ahead', async () => {
    // The morning after: last night's plan still shows rather than the card
    // going blank, and a night announced without a date shows too.
    mockRows = [
      announcedRow(OTHER_PLAN_ID, CAMPAIGN_ID, 'Session 0', '2026-09-03', '2026-09-01T10:00:00Z'),
      announcedRow(PLAN_ID, CAMPAIGN_ID, 'Sometime', null, '2026-09-06T10:00:00Z'),
    ]

    expect((await nextAnnouncedNight(PLAYER, CAMPAIGN_ID))?.id).toBe(PLAN_ID)
  })

  it('is null when nothing is announced', async () => {
    mockRows = []

    expect(await nextAnnouncedNight(PLAYER, CAMPAIGN_ID)).toBeNull()
  })
})

describe('nextAnnouncedNightsForCharacter', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-08T12:00:00.000Z') })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('needs the character to be yours, the table open, and a seat at it', async () => {
    await nextAnnouncedNightsForCharacter(PLAYER, CHARACTER_ID)

    const { sql, params } = onlyCall()

    // `listCampaignsForCharacter`'s two arms plus the closed-campaign one, in
    // the statement: a DM reading a party member's sheet fails the owner arm,
    // and a finished tutorial fails the closed one.
    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('"characters"."owner_id"')
    expect(sql).toContain('"campaigns"."closed_at" is null')
    expect(sql).toContain('inner join "campaign_session_plans"')
    expect(params).toEqual(expect.arrayContaining([PLAYER, CHARACTER_ID]))
    // Never a campaign id: the character's tables are the scope.
    expect(params).not.toContain(CAMPAIGN_ID)
  })

  it('keys one night per campaign, chosen the way the campaign page chooses', async () => {
    mockRows = [
      announcedRow(OTHER_PLAN_ID, CAMPAIGN_ID, 'Session 0', '2026-09-03', '2026-09-01T10:00:00Z'),
      announcedRow(PLAN_ID, CAMPAIGN_ID, 'Session 1 - Intro', '2026-09-10', '2026-09-05T10:00:00Z'),
      announcedRow(
        '5e1f3a2b-4c6d-4e8f-a02b-3c4d5e6f7a8b',
        OTHER_CAMPAIGN_ID,
        'The Thursday one',
        null,
        '2026-09-04T10:00:00Z',
      ),
    ]

    const nights = await nextAnnouncedNightsForCharacter(PLAYER, CHARACTER_ID)

    expect(Object.keys(nights).sort()).toEqual([CAMPAIGN_ID, OTHER_CAMPAIGN_ID].sort())
    expect(nights[CAMPAIGN_ID].title).toBe('Session 1 - Intro')
    expect(nights[OTHER_CAMPAIGN_ID].title).toBe('The Thursday one')
  })

  it('is an empty record for a malformed id, without a query', async () => {
    expect(await nextAnnouncedNightsForCharacter(PLAYER, NOT_AN_ID)).toEqual({})
    expect(mockCalls).toHaveLength(0)
  })
})
