import { getTableColumns } from 'drizzle-orm'

import { ALL_GATES_OFF, ALL_GATES_ON } from '@/lib/campaigns/gates'

import {
  closeCampaign,
  createCampaign,
  gatesForCharacter,
  milestoneForCharacter,
  generateJoinCode,
  getCampaignByJoinCode,
  getCampaignForDm,
  getCampaignRoster,
  joinCampaignByCode,
  listCampaignsForCharacter,
  listCampaignsRunByForCharacter,
  listCampaignsForDm,
  listCampaignsForMember,
  listPartyClassIndexes,
  regenerateJoinCode,
  setCampaignGates,
  setCampaignMilestone,
  setCampaignSessionZero,
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
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const SECOND_CAMPAIGN: Campaign = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  dmUserId: DM,
  name: 'Storm of the Thursday Table',
  joinCode: null,
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
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
  portrait: null,
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
  concentration: null,
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
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
  featChoices: null,
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
      [
        [CHARACTER_FIXTURE.id, 'chain-mail'],
        [CHARACTER_FIXTURE.id, 'shield'],
      ], // worn armour
    ]

    const result = await getCampaignRoster(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(4)
    const [scope, members, roster, armor] = mockCalls

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

    // The worn armour of exactly the characters the roster settled on
    // (`first-table/glance-derived-ac`), so the glance derives AC the way the
    // sheet does.
    expect(armor.sql).toContain('from "character_items"')
    expect(armor.params).toEqual(expect.arrayContaining([CHARACTER_FIXTURE.id, true]))

    expect(result).toEqual({
      campaign: FIXTURE,
      members: [DM_SEAT, PLAYER_SEAT],
      characters: [CHARACTER_FIXTURE],
      armor: {
        [CHARACTER_FIXTURE.id]: [
          expect.objectContaining({ index: 'chain-mail' }),
          expect.objectContaining({ index: 'shield' }),
        ],
      },
    })
  })

  it('asks about nobody’s armour when nobody is on the roster', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], [memberDriverRow(DM_SEAT)], []]

    const result = await getCampaignRoster(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(3)
    expect(result?.armor).toEqual({})
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

describe('listPartyClassIndexes', () => {
  it("reads the roster's classes with membership folded into the join", async () => {
    mockRows = [['rogue'], ['cleric']]

    const result = await listPartyClassIndexes(PLAYER, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]

    // One statement: the seat is proven by the join, not by a prior lookup, so
    // there is no window in which the campaign is read without the membership.
    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('inner join "campaign_members"')
    expect(sql).toContain('"campaign_members"."user_id" = $1')
    expect(sql).toContain('"character_campaigns"."campaign_id" = $2')
    expect(params).toEqual([PLAYER, CAMPAIGN_ID])

    // Class indexes and nothing else — no names, no hit points, no ids.
    expect(sql).toContain('"class_index"')
    expect(sql).not.toContain('"current_hit_points"')
    expect(result).toEqual(['rogue', 'cleric'])
  })

  it('answers an empty party for a campaign the reader does not sit at', async () => {
    // The join matches nothing, which is the same answer a campaign that does
    // not exist gives — the caller says nothing either way.
    mockRows = []

    await expect(listPartyClassIndexes(PLAYER, SECOND_CAMPAIGN.id)).resolves.toEqual([])
  })

  it('treats a malformed id as an empty party without querying', async () => {
    await expect(listPartyClassIndexes(PLAYER, 'not-a-uuid')).resolves.toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('listCampaignsForCharacter', () => {
  it('needs the character to be yours and the table to be one you sit at', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await listCampaignsForCharacter(PLAYER, CHARACTER_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]

    // Both arms in one statement: ownership of the character, and a seat at
    // the campaign. Either alone would label somebody else's table "yours".
    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('inner join "campaign_members"')
    expect(sql).toContain('"characters"."owner_id"')
    expect(params).toEqual(expect.arrayContaining([PLAYER, CHARACTER_ID]))

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe(FIXTURE.name)
  })

  it('is empty for a DM reading a party member sheet', async () => {
    // D13 lets a DM open a character they do not own. The owner arm makes this
    // an empty list for them, so the sheet never offers a DM a link labelled
    // "your campaign" to a table they run rather than play at.
    mockRows = []

    await expect(listCampaignsForCharacter(DM, CHARACTER_ID)).resolves.toEqual([])
  })

  it('treats a malformed id as no campaigns without querying', async () => {
    await expect(listCampaignsForCharacter(PLAYER, 'not-a-uuid')).resolves.toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

// The DM's way back from a party member's sheet (`first-table/dm-front-door`):
// the campaigns this DM runs that the character is on, and nothing for a
// player asking about a table they merely sit at.
describe('listCampaignsRunByForCharacter', () => {
  it('needs the campaign to be run by the asker', async () => {
    mockRows = [driverRow(FIXTURE)]

    const result = await listCampaignsRunByForCharacter(DM, CHARACTER_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('"campaigns"."dm_user_id" = $')
    expect(sql).not.toContain('campaign_members')
    expect(params).toEqual(expect.arrayContaining([DM, CHARACTER_ID]))
    expect(result[0].name).toBe(FIXTURE.name)
  })

  it('treats a malformed id as no campaigns without querying', async () => {
    await expect(listCampaignsRunByForCharacter(DM, 'not-a-uuid')).resolves.toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

// The feature gates (D40, `dm-prep-suite/campaign-feature-gates`). Two
// properties: the write is DM-scoped like everything else in this module, and
// the read fails towards *more* surface — a character nobody may see, or on no
// campaign, gets the whole sheet rather than a blank one.
describe('setCampaignGates', () => {
  it('writes the whole set, scoped to the DM who runs the campaign', async () => {
    const gated = { ...FIXTURE, gates: { conditions: true } }
    mockRows = [driverRow(gated)]

    const result = await setCampaignGates(DM, CAMPAIGN_ID, { conditions: true })

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "campaigns" set')
    expect(sql).toContain('"gates" = $1')
    expect(sql).toContain('"campaigns"."id" = $3')
    expect(sql).toContain('"campaigns"."dm_user_id" = $4')
    expect(params[0]).toBe(JSON.stringify({ conditions: true }))
    expect(params.slice(2)).toEqual([CAMPAIGN_ID, DM])
    expect(result).toEqual(gated)
  })

  it('stores an empty object as "everything off" rather than refusing it', async () => {
    mockRows = [driverRow({ ...FIXTURE, gates: {} })]

    await setCampaignGates(DM, CAMPAIGN_ID, {})

    expect(mockCalls[0].params[0]).toBe('{}')
  })

  it('returns null for a campaign someone else runs, having written nothing', async () => {
    await expect(setCampaignGates(PLAYER, CAMPAIGN_ID, { currency: true })).resolves.toBeNull()
    expect(mockCalls[0].params.slice(2)).toEqual([CAMPAIGN_ID, PLAYER])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(setCampaignGates(DM, 'not-a-uuid', {})).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('gatesForCharacter', () => {
  it('reads the campaigns a character is on through the D13 viewer predicate', async () => {
    mockRows = [[{ conditions: true }, null]]

    const result = await gatesForCharacter(PLAYER, CHARACTER_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]

    // One statement, and it selects the gates and the closed stamp and nothing
    // else about the campaign or the character.
    expect(sql).toContain('select "campaigns"."gates", "campaigns"."closed_at"')
    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('inner join "campaigns"')
    // The viewer arm: the character is theirs, or they run a campaign it is on.
    expect(sql).toContain('"character_campaigns"."character_id" = $1')
    expect(sql).toContain('"characters"."owner_id" = $2')
    expect(sql).toContain('"campaigns"."dm_user_id" = $3')
    expect(params).toEqual([CHARACTER_ID, PLAYER, PLAYER])

    expect(result).toEqual({ ...ALL_GATES_OFF, conditions: true })
  })

  it('gives a character on no campaign the whole sheet', async () => {
    mockRows = []

    await expect(gatesForCharacter(PLAYER, CHARACTER_ID)).resolves.toEqual(ALL_GATES_ON)
  })

  it('gives a character nobody may see the whole sheet too — a gate is not an access rule', async () => {
    // The predicate returns no rows for a stranger, which is the same answer as
    // "on no campaign". Hiding cards from someone who cannot open the sheet at
    // all would protect nothing.
    mockRows = []

    await expect(gatesForCharacter('user_stranger', CHARACTER_ID)).resolves.toEqual(ALL_GATES_ON)
  })

  it('treats a malformed id as no campaigns, without querying', async () => {
    await expect(gatesForCharacter(PLAYER, 'not-a-uuid')).resolves.toEqual(ALL_GATES_ON)
    expect(mockCalls).toHaveLength(0)
  })

  it('takes the union across the tables a character sits at', async () => {
    mockRows = [
      [{ currency: true }, null],
      [null, null],
      [{ conditions: true, currency: false }, null],
    ]

    await expect(gatesForCharacter(PLAYER, CHARACTER_ID)).resolves.toEqual({
      ...ALL_GATES_OFF,
      currency: true,
      conditions: true,
    })
  })

  it('lets a closed campaign keep steering the sheet until an open one exists', async () => {
    // The night the tutorial closes, before the real campaign is made: the
    // closed table is the only one, and the sheet must not flip to everything.
    const closed = '2026-09-10T22:30:00.000Z'
    mockRows = [[{ currency: true }, closed]]

    await expect(gatesForCharacter(PLAYER, CHARACTER_ID)).resolves.toEqual({
      ...ALL_GATES_OFF,
      currency: true,
    })

    // Once an open table exists, the closed one's gates no longer count.
    mockRows = [
      [{ currency: true }, closed],
      [{ conditions: true }, null],
    ]

    await expect(gatesForCharacter(PLAYER, CHARACTER_ID)).resolves.toEqual({
      ...ALL_GATES_OFF,
      conditions: true,
    })
  })
})

// Milestone levelling (D35, `dm-run-suite/milestone-leveling`). Two properties,
// and the first is the whole design: the write touches **one row and one
// column**, never a character — `neon-http` has no transactions, and a party
// loop is the thing this feature exists to avoid.
describe('setCampaignMilestone', () => {
  it('writes the level to the campaign and to nothing else', async () => {
    const called = { ...FIXTURE, milestoneLevel: 4 }
    mockRows = [driverRow(called)]

    const result = await setCampaignMilestone(DM, CAMPAIGN_ID, 4)

    // One statement. Not "one per character" — that is the point of D35.
    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "campaigns" set')
    expect(sql).toContain('"milestone_level" = $1')
    expect(sql).not.toContain('"characters"')
    expect(params[0]).toBe(4)
    expect(params.slice(2)).toEqual([CAMPAIGN_ID, DM])
    expect(result).toEqual(called)
  })

  it('stores null, because a table that goes back to XP has to be able to say so', async () => {
    mockRows = [driverRow({ ...FIXTURE, milestoneLevel: null })]

    await setCampaignMilestone(DM, CAMPAIGN_ID, null)

    expect(mockCalls[0].params[0]).toBeNull()
  })

  it('refuses a level off the table without writing anything', async () => {
    await expect(setCampaignMilestone(DM, CAMPAIGN_ID, 40)).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })

  it('returns null for a campaign someone else runs, having written nothing', async () => {
    await expect(setCampaignMilestone(PLAYER, CAMPAIGN_ID, 3)).resolves.toBeNull()
    expect(mockCalls[0].params.slice(2)).toEqual([CAMPAIGN_ID, PLAYER])
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(setCampaignMilestone(DM, 'not-a-uuid', 3)).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('milestoneForCharacter', () => {
  it('reads the campaigns a character is on through the D13 viewer predicate', async () => {
    mockRows = [[4]]

    const result = await milestoneForCharacter(PLAYER, CHARACTER_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]

    // One statement, one column — nothing else about the campaign travels to a
    // player's sheet.
    expect(sql).toContain('select "campaigns"."milestone_level"')
    expect(sql).toContain('from "character_campaigns"')
    expect(sql).toContain('"character_campaigns"."character_id" = $1')
    expect(sql).toContain('"characters"."owner_id" = $2')
    expect(sql).toContain('"campaigns"."dm_user_id" = $3')
    expect(params).toEqual([CHARACTER_ID, PLAYER, PLAYER])

    expect(result).toBe(4)
  })

  it('answers null for a character on no campaign — no milestone, no prompt', async () => {
    mockRows = []

    await expect(milestoneForCharacter(PLAYER, CHARACTER_ID)).resolves.toBeNull()
  })

  it('answers null for a table that has never called a level', async () => {
    mockRows = [[null]]

    await expect(milestoneForCharacter(PLAYER, CHARACTER_ID)).resolves.toBeNull()
  })

  it('takes the highest across the tables a character sits at', async () => {
    mockRows = [[3], [null], [5]]

    await expect(milestoneForCharacter(PLAYER, CHARACTER_ID)).resolves.toBe(5)
  })

  it('treats a malformed id as no campaigns, without querying', async () => {
    await expect(milestoneForCharacter(PLAYER, 'not-a-uuid')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

// A campaign that ends, and the table that carries on
// (`first-table/one-night-campaign`). Three properties: closing is one stamp
// that keeps its first value, the carry-forward is three ordered idempotent
// passes, and the reads that steer a *sheet* stop answering for a closed
// campaign while the DM's own reads keep it.
describe('closeCampaign', () => {
  it('stamps closed_at once, scoped to the DM, and touches nothing else', async () => {
    const closedAt = new Date('2026-09-10T22:30:00.000Z')
    mockRows = [driverRow({ ...FIXTURE, closedAt })]

    const result = await closeCampaign(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "campaigns"')
    expect(sql).toContain('"campaigns"."dm_user_id" = $4')
    // Only an open campaign is stamped — the first close is the one that counts.
    expect(sql).toContain('"campaigns"."closed_at" is null')
    expect(params).toEqual(expect.arrayContaining([CAMPAIGN_ID, DM]))

    const [assignments] = sql.split(' set ')[1].split(' where ')
    expect(assignments).toContain('"closed_at"')
    for (const column of ['name', 'join_code', 'gates', 'milestone_level', 'session_zero']) {
      expect(assignments).not.toContain(column)
    }

    expect(result?.closedAt).toEqual(closedAt)
  })

  it('keeps the first stamp when closed twice — the re-read is the answer', async () => {
    const closedAt = new Date('2026-09-10T22:30:00.000Z')
    mockRowsQueue = [[], [driverRow({ ...FIXTURE, closedAt })]]

    const result = await closeCampaign(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(2)
    expect(mockCalls[1].sql).toContain('select')
    expect(mockCalls[1].params).toEqual([CAMPAIGN_ID, DM, 1])
    expect(result?.closedAt).toEqual(closedAt)
  })

  it('answers null for a campaign someone else runs, having written nothing', async () => {
    mockRowsQueue = [[], []]

    expect(await closeCampaign(PLAYER, CAMPAIGN_ID)).toBeNull()
  })

  it('treats a malformed id as a miss without querying', async () => {
    expect(await closeCampaign(DM, 'not-a-uuid')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createCampaign with carryFrom', () => {
  const NEW_ID = SECOND_CAMPAIGN.id
  const OTHER_CHARACTER_ID = '6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d'

  it('seats the members, then attaches the characters, then copies the gates', async () => {
    const source = { ...FIXTURE, gates: { conditions: true }, milestoneLevel: 3 }
    const created = { ...SECOND_CAMPAIGN, id: NEW_ID }

    mockRowsQueue = [
      [driverRow(created)], // the campaign
      [], // the DM seat
      [driverRow(source)], // the source, re-read under the DM's authority
      [
        [DM, 'dm'],
        [PLAYER, 'player'],
      ], // its members
      [], // seated
      [[CHARACTER_ID], [OTHER_CHARACTER_ID]], // its characters
      [], // attached
      [], // the gates
    ]

    const result = await createCampaign(DM, 'Storm of the Thursday Table', CAMPAIGN_ID)

    expect(result).toEqual(created)
    expect(mockCalls.map((call) => call.sql.split(' ').slice(0, 3).join(' '))).toEqual([
      'insert into "campaigns"',
      'insert into "campaign_members"',
      'select "id", "dm_user_id",',
      'select "user_id", "role"',
      'insert into "campaign_members"',
      'select "character_id" from',
      'insert into "character_campaigns"',
      'update "campaigns" set',
    ])

    const [, , sourceRead, , members, , links, gates] = mockCalls

    // A pointer, never a permission: the source is read under the DM's id.
    expect(sourceRead.params).toEqual([CAMPAIGN_ID, DM, 1])

    // Every seat, same role, onto the new table — idempotent on the key.
    expect(members.sql).toContain('on conflict do nothing')
    expect(members.params).toEqual([NEW_ID, DM, 'dm', NEW_ID, PLAYER, 'player'])

    // Every character, onto the new table — idempotent on the key.
    expect(links.sql).toContain('on conflict do nothing')
    expect(links.params).toEqual([CHARACTER_ID, NEW_ID, OTHER_CHARACTER_ID, NEW_ID])

    // The gates, and only the gates: no milestone, no one page.
    expect(gates.params[0]).toBe('{"conditions":true}')
    const [assignments] = gates.sql.split(' set ')[1].split(' where ')
    expect(assignments).not.toContain('milestone_level')
    expect(assignments).not.toContain('session_zero')
    expect(gates.params).toEqual(expect.arrayContaining([NEW_ID, DM]))
  })

  it('creates the campaign and copies nothing when carryFrom is not the DM’s', async () => {
    mockRowsQueue = [[driverRow(SECOND_CAMPAIGN)], [], []]

    const result = await createCampaign(DM, 'Storm of the Thursday Table', CAMPAIGN_ID)

    expect(result).toEqual(SECOND_CAMPAIGN)
    // Campaign, seat, the source read that came back empty — and no more.
    expect(mockCalls).toHaveLength(3)
  })

  it('skips the gates write when the source has none set', async () => {
    mockRowsQueue = [[driverRow(SECOND_CAMPAIGN)], [], [driverRow(FIXTURE)], [], [], [], []]

    await createCampaign(DM, 'Storm of the Thursday Table', CAMPAIGN_ID)

    // Campaign, seat, source, members read (empty), characters read (empty).
    expect(mockCalls).toHaveLength(5)
    expect(mockCalls.some((call) => call.sql.startsWith('update'))).toBe(false)
  })

  it('makes exactly the two statements it always made when nothing is carried', async () => {
    mockRowsQueue = [[driverRow(FIXTURE)], []]

    await createCampaign(DM, 'The Rime of the Frostmaiden')

    expect(mockCalls).toHaveLength(2)
  })
})

describe('what a closed campaign stops answering', () => {
  it('is not one of the campaigns on a character’s sheet', async () => {
    await listCampaignsForCharacter(PLAYER, CHARACTER_ID)

    expect(mockCalls[0].sql).toContain('"campaigns"."closed_at" is null')
  })

  it('is not a table a new character is made for', async () => {
    await listCampaignsForMember(PLAYER)

    expect(mockCalls[0].sql).toContain('"campaigns"."closed_at" is null')
  })

  it('calls no more levels — its milestone no longer counts', async () => {
    await milestoneForCharacter(PLAYER, CHARACTER_ID)

    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('"campaigns"."closed_at" is null')
  })

  it('still steers the sheet while it is the only table the character has', async () => {
    // The gates read carries no closed arm in SQL: it reads the stamp and
    // decides in code, so the closed table answers only when no open one does.
    await gatesForCharacter(PLAYER, CHARACTER_ID)

    expect(mockCalls[0].sql).not.toContain('"closed_at" is null')
    expect(mockCalls[0].sql).toContain('"campaigns"."closed_at"')
  })

  it('has a dead join code', async () => {
    mockRows = []

    expect(await getCampaignByJoinCode(JOIN_CODE)).toBeNull()
    expect(mockCalls[0].sql).toContain('"campaigns"."closed_at" is null')
  })

  it('still answers to its DM', async () => {
    mockRows = [driverRow({ ...FIXTURE, closedAt: new Date('2026-09-10T22:30:00.000Z') })]

    const campaign = await getCampaignForDm(DM, CAMPAIGN_ID)

    expect(campaign?.closedAt).toEqual(new Date('2026-09-10T22:30:00.000Z'))
    expect(mockCalls[0].sql).not.toContain('"closed_at" is null')
  })
})

// The one page (`first-table/session-zero-one-pager`): a plain, DM-scoped save
// of the one column the players read directly.
describe('setCampaignSessionZero', () => {
  it('writes the page, scoped to the DM who runs the campaign', async () => {
    const body = 'The pitch — a lighthouse that should not be lit.\n\nPhones — face down.'
    mockRows = [driverRow({ ...FIXTURE, sessionZero: body })]

    const result = await setCampaignSessionZero(DM, CAMPAIGN_ID, body)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "campaigns"')
    expect(sql).toContain('"campaigns"."dm_user_id" = $4')
    expect(params[0]).toBe(body)
    expect(params).toEqual(expect.arrayContaining([CAMPAIGN_ID, DM]))
    expect(result?.sessionZero).toBe(body)
  })

  it('collapses an emptied page to null, so cleared and never-written read the same', async () => {
    mockRows = [driverRow(FIXTURE)]

    await setCampaignSessionZero(DM, CAMPAIGN_ID, '   \n  ')
    await setCampaignSessionZero(DM, CAMPAIGN_ID, null)

    expect(mockCalls[0].params[0]).toBeNull()
    expect(mockCalls[1].params[0]).toBeNull()
  })

  it('returns null for a campaign someone else runs, having written nothing', async () => {
    mockRows = []
    expect(await setCampaignSessionZero(PLAYER, CAMPAIGN_ID, 'x')).toBeNull()
  })

  it('treats a malformed id as a miss without querying', async () => {
    expect(await setCampaignSessionZero(DM, 'not-a-uuid', 'x')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})
