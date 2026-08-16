import { getTableColumns } from 'drizzle-orm'

import {
  createCampaign,
  generateJoinCode,
  getCampaignByJoinCode,
  getCampaignForDm,
  getCampaignRoster,
  joinCampaignByCode,
  listCampaignsForDm,
  regenerateJoinCode,
  type Campaign,
  type CampaignMember,
} from './campaigns'
import { campaignMembers, campaigns, characters, type Character } from './schema'

// The same real-Drizzle-over-a-stub-driver pattern as `characters.test.ts`.
// The property under test is the authority model: `dm_user_id` folded into
// every DM-scoped WHERE clause, ownership re-checked in SQL before a character
// is linked, and a foreign campaign indistinguishable from a fictional one.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
// Each statement consumes the next result in turn — these functions issue
// several statements per call.
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
const JOIN_CODE = 'kfEbCq3vX9pLm2Rt8sWz1A'

const FIXTURE: Campaign = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: JOIN_CODE,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const SECOND_CAMPAIGN: Campaign = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  dmUserId: DM,
  name: 'Storm of the Thursday Table',
  joinCode: null,
  createdAt: new Date('2026-08-10T12:00:00.000Z'),
  updatedAt: new Date('2026-08-10T12:00:00.000Z'),
}

const DM_SEAT: CampaignMember = {
  campaignId: CAMPAIGN_ID,
  userId: DM,
  role: 'dm',
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
}

const PLAYER_SEAT: CampaignMember = {
  campaignId: CAMPAIGN_ID,
  userId: PLAYER,
  role: 'player',
  createdAt: new Date('2026-08-14T13:00:00.000Z'),
}

const CHARACTER_FIXTURE: Character = {
  id: CHARACTER_ID,
  ownerId: PLAYER,
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 5,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 21,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: { '1': { max: 4, used: 2 } },
  conditions: ['prone'],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  knownSpellIndexes: ['fireball'],
  preparedSpellIndexes: ['fireball'],
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  skillProficiencies: [],
  skillExpertise: [],
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  updatedAt: new Date('2026-08-13T09:30:00.000Z'),
}

/** Encode a campaign the way the Neon HTTP driver hands rows back. */
function driverRow(campaign: Campaign): unknown[] {
  return Object.keys(getTableColumns(campaigns)).map((column) => {
    const value = campaign[column as keyof Campaign]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** A roster row, positionally, as the driver returns it. */
function memberDriverRow(member: CampaignMember): unknown[] {
  return Object.keys(getTableColumns(campaignMembers)).map((column) => {
    const value = member[column as keyof CampaignMember]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** A character row, positionally, with Postgres' text encodings (as in characters.test.ts). */
function characterDriverRow(character: Character): unknown[] {
  return Object.entries(getTableColumns(characters)).map(([column, definition]) => {
    const value = character[column as keyof Character]
    if (value instanceof Date) return value.toISOString()
    // jsonb before the array check: a jsonb column holding an array (e.g.
    // class_resources) comes back as JSON, not as a Postgres array literal.
    if ((definition as { columnType?: string }).columnType === 'PgJsonb') {
      return JSON.stringify(value)
    }
    if (Array.isArray(value)) return `{${value.join(',')}}`
    if (value !== null && typeof value === 'object') return JSON.stringify(value)
    return value
  })
}

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('generateJoinCode', () => {
  it('is 128 bits of base64url — code-shaped and unguessable', () => {
    const code = generateJoinCode()

    expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(generateJoinCode()).not.toBe(code)
  })
})

describe('createCampaign', () => {
  it('inserts the campaign with its DM and a live join code, then the DM roster row', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], []]

    const result = await createCampaign(DM, '  The Rime of the Frostmaiden  ')

    expect(mockCalls).toHaveLength(2)

    const [insert, member] = mockCalls
    expect(insert.sql).toContain('insert into "campaigns"')
    expect(insert.sql).toContain('returning')
    // dm_user_id, the trimmed name, and a generated code — nothing else varies.
    expect(insert.params[0]).toBe(DM)
    expect(insert.params[1]).toBe('The Rime of the Frostmaiden')
    expect(insert.params[2]).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(insert.params).toHaveLength(3)

    // Jamie plays at his own table: the DM lands on the roster, as a label,
    // idempotently — the schema's warning says this row grants nothing.
    expect(member.sql).toContain('insert into "campaign_members"')
    expect(member.sql).toContain('on conflict do nothing')
    expect(member.params).toEqual([CAMPAIGN_ID, DM, 'dm'])

    expect(result).toEqual(FIXTURE)
  })
})

describe('listCampaignsForDm', () => {
  it('lists the DM’s campaigns newest first with counts computed per campaign', async () => {
    mockRowsQueue = [
      // The scoped campaign list, then the two count selects Promise.all fires
      // in construction order: members first, character links second.
      [driverRow(FIXTURE), driverRow(SECOND_CAMPAIGN)],
      [[CAMPAIGN_ID], [CAMPAIGN_ID], [SECOND_CAMPAIGN.id]],
      [[CAMPAIGN_ID]],
    ]

    const result = await listCampaignsForDm(DM)

    expect(mockCalls).toHaveLength(3)
    const [list, members, links] = mockCalls

    // Scoped to the DM and newest first — the shape the /dm list renders.
    expect(list.sql).toContain('"campaigns"."dm_user_id" = $1')
    expect(list.sql).toContain('order by "campaigns"."created_at" desc')
    expect(list.params).toEqual([DM])

    // Both count queries cover exactly the listed campaigns, in one round trip each.
    expect(members.sql).toContain('from "campaign_members"')
    expect(members.sql).toContain('"campaign_members"."campaign_id" in ($1, $2)')
    expect(members.params).toEqual([CAMPAIGN_ID, SECOND_CAMPAIGN.id])

    expect(links.sql).toContain('from "character_campaigns"')
    expect(links.sql).toContain('"character_campaigns"."campaign_id" in ($1, $2)')
    expect(links.params).toEqual([CAMPAIGN_ID, SECOND_CAMPAIGN.id])

    // Counts land on the campaign they belong to; absence counts as zero.
    expect(result).toEqual([
      { ...FIXTURE, memberCount: 2, characterCount: 1 },
      { ...SECOND_CAMPAIGN, memberCount: 1, characterCount: 0 },
    ])
  })

  it('short-circuits an empty list without issuing the count queries', async () => {
    const result = await listCampaignsForDm(DM)

    expect(result).toEqual([])
    expect(mockCalls).toHaveLength(1)
  })
})

describe('getCampaignForDm', () => {
  it('filters on both id and dm_user_id', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await getCampaignForDm(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('"campaigns"."id" = $1')
    expect(sql).toContain('"campaigns"."dm_user_id" = $2')
    expect(params).toEqual([CAMPAIGN_ID, DM, 1])
    expect(result).toEqual(FIXTURE)
  })

  it('returns null for a campaign someone else runs', async () => {
    // A foreign campaign matches nothing — indistinguishable from one that
    // does not exist, exactly like a foreign character id.
    await expect(getCampaignForDm(PLAYER, CAMPAIGN_ID)).resolves.toBeNull()
    expect(mockCalls[0].params).toEqual([CAMPAIGN_ID, PLAYER, 1])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(getCampaignForDm(DM, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('getCampaignByJoinCode', () => {
  it('looks the code up when it is code-shaped', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await getCampaignByJoinCode(JOIN_CODE)

    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('"campaigns"."join_code" = $1')
    expect(mockCalls[0].params).toEqual([JOIN_CODE, 1])
    expect(result).toEqual(FIXTURE)
  })

  it.each([
    ['too short', 'shortcode'],
    ['not base64url', 'kfEbCq3vX9pLm2Rt8sWz1A!!'],
    ['sql-ish garbage off a url', "' or 1=1 --------------"],
    ['empty', ''],
  ])('rejects a malformed code (%s) without querying', async (_label, code) => {
    await expect(getCampaignByJoinCode(code)).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('joinCampaignByCode', () => {
  it('answers null to a dead code and writes nothing', async () => {
    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, [CHARACTER_ID])

    expect(result).toBeNull()
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('select')
    expect(mockCalls[0].sql).not.toContain('insert')
  })

  it('seats the joiner as a player and links only characters they own', async () => {
    mockRowsQueue = [
      [driverRow(FIXTURE)], // the campaign behind the code
      [], // member upsert
      [[CHARACTER_ID]], // the ownership-scoped character select
      [], // the link insert
    ]

    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, [CHARACTER_ID])

    expect(mockCalls).toHaveLength(4)
    const [, member, owned, link] = mockCalls

    expect(member.sql).toContain('insert into "campaign_members"')
    expect(member.sql).toContain('on conflict do nothing')
    expect(member.params).toEqual([CAMPAIGN_ID, PLAYER, 'player'])

    // Ownership is re-checked in SQL before anything is linked: whatever ids
    // arrive, only rows with this joiner's owner_id come back.
    expect(owned.sql).toContain('from "characters"')
    expect(owned.sql).toContain('"characters"."id" in ($1)')
    expect(owned.sql).toContain('"characters"."owner_id" = $2')
    expect(owned.params).toEqual([CHARACTER_ID, PLAYER])

    expect(link.sql).toContain('insert into "character_campaigns"')
    expect(link.sql).toContain('on conflict do nothing')
    expect(link.params).toEqual([CHARACTER_ID, CAMPAIGN_ID])

    expect(result).toEqual(FIXTURE)
  })

  it('seats the DM as dm when they join their own table', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], []]

    await joinCampaignByCode(DM, JOIN_CODE, [])

    expect(mockCalls[1].params).toEqual([CAMPAIGN_ID, DM, 'dm'])
  })

  it('links nothing when the owner check returns no rows', async () => {
    // The select found none of the requested ids under this owner — a
    // tampered request dies quietly, with no character_campaigns insert.
    mockRowsQueue = [[driverRow(FIXTURE)], [], []]

    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, [CHARACTER_ID])

    expect(mockCalls).toHaveLength(3)
    expect(result).toEqual(FIXTURE)
  })

  it('drops malformed character ids before they reach a query', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], []]

    const result = await joinCampaignByCode(PLAYER, JOIN_CODE, ['not-a-uuid'])

    // The member row lands; the character select never happens.
    expect(mockCalls).toHaveLength(2)
    expect(result).toEqual(FIXTURE)
  })
})

describe('getCampaignRoster', () => {
  it('returns the members and the characters at the table, ordered by name', async () => {
    mockRowsQueue = [
      [driverRow(FIXTURE)], // the DM-scoped campaign lookup
      [memberDriverRow(DM_SEAT), memberDriverRow(PLAYER_SEAT)],
      [characterDriverRow(CHARACTER_FIXTURE)],
    ]

    const result = await getCampaignRoster(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(3)
    const [scope, members, roster] = mockCalls

    // The authority check happens first, on the campaign row itself.
    expect(scope.sql).toContain('"campaigns"."id" = $1')
    expect(scope.sql).toContain('"campaigns"."dm_user_id" = $2')
    expect(scope.params).toEqual([CAMPAIGN_ID, DM, 1])

    expect(members.sql).toContain('from "campaign_members"')
    expect(members.sql).toContain('"campaign_members"."campaign_id" = $1')
    expect(members.params).toEqual([CAMPAIGN_ID])

    // Characters come through the join table, alphabetised for the roster view.
    expect(roster.sql).toContain('from "character_campaigns"')
    expect(roster.sql).toContain('inner join "characters"')
    expect(roster.sql).toContain('order by "characters"."name"')
    expect(roster.params).toEqual([CAMPAIGN_ID])

    expect(result).toEqual({
      campaign: FIXTURE,
      members: [DM_SEAT, PLAYER_SEAT],
      characters: [CHARACTER_FIXTURE],
    })
  })

  it('answers null for a campaign someone else runs, before any roster query', async () => {
    const result = await getCampaignRoster(PLAYER, CAMPAIGN_ID)

    expect(result).toBeNull()
    // Only the scoped campaign lookup ran — the roster of a foreign campaign
    // is never even queried.
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].params).toEqual([CAMPAIGN_ID, PLAYER, 1])
  })
})

describe('regenerateJoinCode', () => {
  it('replaces the code, scoped to the DM who runs the campaign', async () => {
    const rotated = { ...FIXTURE, joinCode: 'aaaaaaaaaaaaaaaaaaaaaa' }
    mockRows = [driverRow(rotated)]

    const result = await regenerateJoinCode(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "campaigns" set')
    expect(sql).toContain('"join_code" = $1')
    expect(sql).toContain('"updated_at" = $2')
    expect(sql).toContain('"campaigns"."id" = $3')
    expect(sql).toContain('"campaigns"."dm_user_id" = $4')
    expect(params[0]).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(params.slice(2)).toEqual([CAMPAIGN_ID, DM])
    expect(result).toEqual(rotated)
  })

  it('returns null for a campaign someone else runs, having rotated nothing', async () => {
    await expect(regenerateJoinCode(PLAYER, CAMPAIGN_ID)).resolves.toBeNull()
    expect(mockCalls[0].params.slice(2)).toEqual([CAMPAIGN_ID, PLAYER])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(regenerateJoinCode(DM, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})
