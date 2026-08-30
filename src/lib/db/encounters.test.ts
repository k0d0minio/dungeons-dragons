import { getTableColumns } from 'drizzle-orm'

import {
  addCharacterCombatants,
  addMonsterCombatants,
  createEncounter,
  deleteEncounter,
  generateShareToken,
  getEncounterByShareToken,
  getEncounterForDm,
  listEncounters,
  patchEncounter,
  regenerateShareToken,
  removeCombatant,
  updateCombatant,
  type Encounter,
  type EncounterCombatant,
} from './encounters'
import { characters, encounterCombatants, encounters, type Character } from './schema'

// The same real-Drizzle-over-a-stub-driver pattern as `campaigns.test.ts`.
// The properties under test: every statement folds `campaigns.dm_user_id`
// into its WHERE clause (a foreign encounter is indistinguishable from a
// fictional one), PC rows never take hit points (the character row is the
// source of truth, D13), and the share-token view is sanitized — monster HP
// and monster identity never cross that boundary (D24).
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
const OTHER_DM = 'user_9zQw1nBvRt'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const MONSTER_COMBATANT_ID = '9d0e1f2a-3b4c-4d5e-8f9a-0b1c2d3e4f5a'
const PC_COMBATANT_ID = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e'
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

const ENCOUNTER: Encounter = {
  id: ENCOUNTER_ID,
  campaignId: CAMPAIGN_ID,
  name: 'Ambush at the bridge',
  round: 1,
  activeTurn: 0,
  shareToken: TOKEN,
  createdAt: new Date('2026-08-15T12:00:00.000Z'),
  updatedAt: new Date('2026-08-15T12:00:00.000Z'),
}

const MONSTER_COMBATANT: EncounterCombatant = {
  id: MONSTER_COMBATANT_ID,
  encounterId: ENCOUNTER_ID,
  characterId: null,
  monsterIndex: 'goblin',
  label: 'Goblin 1',
  initiative: 17,
  sortOrder: 1,
  maxHitPoints: 7,
  currentHitPoints: 7,
  temporaryHitPoints: 0,
  conditions: [],
  createdAt: new Date('2026-08-15T12:05:00.000Z'),
  updatedAt: new Date('2026-08-15T12:05:00.000Z'),
}

const PC_COMBATANT: EncounterCombatant = {
  id: PC_COMBATANT_ID,
  encounterId: ENCOUNTER_ID,
  characterId: CHARACTER_ID,
  monsterIndex: null,
  label: 'Vex Ashbrand',
  initiative: 15,
  sortOrder: 0,
  maxHitPoints: null,
  currentHitPoints: null,
  temporaryHitPoints: 0,
  conditions: [],
  createdAt: new Date('2026-08-15T12:04:00.000Z'),
  updatedAt: new Date('2026-08-15T12:04:00.000Z'),
}

const CHARACTER_FIXTURE: Character = {
  id: CHARACTER_ID,
  ownerId: OTHER_DM,
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
  temporaryHitPoints: 3,
  armorClass: 12,
  speed: 30,
  spellSlots: { '1': { max: 4, used: 2 } },
  conditions: ['prone'],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 4,
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
}

/** Encode an encounter the way the Neon HTTP driver hands rows back. */
function encounterDriverRow(encounter: Encounter): unknown[] {
  return Object.keys(getTableColumns(encounters)).map((column) => {
    const value = encounter[column as keyof Encounter]
    return value instanceof Date ? value.toISOString() : value
  })
}

/** A combatant row, positionally, with Postgres' text encodings. */
function combatantDriverRow(combatant: EncounterCombatant): unknown[] {
  return Object.keys(getTableColumns(encounterCombatants)).map((column) => {
    const value = combatant[column as keyof EncounterCombatant]
    if (value instanceof Date) return value.toISOString()
    if (Array.isArray(value)) return `{${value.join(',')}}`
    return value
  })
}

/** A character row, positionally, as in `campaigns.test.ts`. */
function characterDriverRow(character: Character): unknown[] {
  return Object.entries(getTableColumns(characters)).map(([column, definition]) => {
    const value = character[column as keyof Character]
    if (value instanceof Date) return value.toISOString()
    if ((definition as { columnType?: string }).columnType === 'PgJsonb') {
      return JSON.stringify(value)
    }
    if (Array.isArray(value)) return `{${value.join(',')}}`
    if (value !== null && typeof value === 'object') return JSON.stringify(value)
    return value
  })
}

/** All-null character columns — the left-join miss behind a monster row. */
const NULL_CHARACTER = Object.keys(getTableColumns(characters)).map(() => null)

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('generateShareToken', () => {
  it('is 128 bits of base64url — the join-code pattern, reused', () => {
    const token = generateShareToken()

    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(generateShareToken()).not.toBe(token)
  })
})

describe('createEncounter', () => {
  it('checks the campaign is the DM’s, then inserts with a live share token', async () => {
    mockRowsQueue = [[[CAMPAIGN_ID]], [encounterDriverRow(ENCOUNTER)]]

    const result = await createEncounter(DM, CAMPAIGN_ID, '  Ambush at the bridge  ')

    expect(mockCalls).toHaveLength(2)
    const [scope, insert] = mockCalls

    // Authority first, on the campaign row itself.
    expect(scope.sql).toContain('"campaigns"."id" = $1')
    expect(scope.sql).toContain('"campaigns"."dm_user_id" = $2')
    expect(scope.params).toEqual([CAMPAIGN_ID, DM, 1])

    expect(insert.sql).toContain('insert into "encounters"')
    expect(insert.sql).toContain('returning')
    expect(insert.params[0]).toBe(CAMPAIGN_ID)
    expect(insert.params[1]).toBe('Ambush at the bridge')
    expect(insert.params[2]).toMatch(/^[A-Za-z0-9_-]{22}$/)

    expect(result).toEqual(ENCOUNTER)
  })

  it('answers null for a campaign someone else runs, inserting nothing', async () => {
    const result = await createEncounter(OTHER_DM, CAMPAIGN_ID, 'Ambush')

    expect(result).toBeNull()
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].params).toEqual([CAMPAIGN_ID, OTHER_DM, 1])
  })

  it('treats a malformed campaign id as a miss without querying', async () => {
    await expect(createEncounter(DM, 'not-a-uuid', 'Ambush')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('listEncounters', () => {
  it('joins campaigns to fold the DM into the WHERE clause, newest first', async () => {
    mockRows = [encounterDriverRow(ENCOUNTER)]

    const result = await listEncounters(DM, CAMPAIGN_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('inner join "campaigns"')
    expect(sql).toContain('"encounters"."campaign_id" = $1')
    expect(sql).toContain('"campaigns"."dm_user_id" = $2')
    expect(sql).toContain('order by "encounters"."created_at" desc')
    expect(params).toEqual([CAMPAIGN_ID, DM])
    expect(result).toEqual([ENCOUNTER])
  })

  it('treats a malformed campaign id as empty without querying', async () => {
    await expect(listEncounters(DM, 'not-a-uuid')).resolves.toEqual([])
    expect(mockCalls).toHaveLength(0)
  })
})

describe('getEncounterForDm', () => {
  it('returns the encounter with combatants in initiative order, PCs carrying their character', async () => {
    mockRowsQueue = [
      [encounterDriverRow(ENCOUNTER)],
      [
        [...combatantDriverRow(MONSTER_COMBATANT), ...NULL_CHARACTER],
        [...combatantDriverRow(PC_COMBATANT), ...characterDriverRow(CHARACTER_FIXTURE)],
      ],
    ]

    const result = await getEncounterForDm(DM, ENCOUNTER_ID)

    expect(mockCalls).toHaveLength(2)
    const [scope, list] = mockCalls

    // The encounter read carries the authority: EXISTS against the campaign
    // this encounter belongs to, owned by this DM.
    expect(scope.sql).toContain('"encounters"."id" = $1')
    expect(scope.sql).toContain(
      'exists (select 1 from "campaigns" where ("campaigns"."id" = "encounters"."campaign_id" and "campaigns"."dm_user_id" = $2))',
    )
    expect(scope.params).toEqual([ENCOUNTER_ID, DM, 1])

    expect(list.sql).toContain('left join "characters"')
    expect(list.sql).toContain('"encounter_combatants"."initiative" desc nulls last')
    expect(list.sql).toContain('"encounter_combatants"."sort_order"')
    expect(list.params).toEqual([ENCOUNTER_ID])

    expect(result).toEqual({
      encounter: ENCOUNTER,
      combatants: [
        { combatant: MONSTER_COMBATANT, character: null },
        { combatant: PC_COMBATANT, character: CHARACTER_FIXTURE },
      ],
    })
  })

  it('answers null for an encounter in a campaign someone else runs', async () => {
    const result = await getEncounterForDm(OTHER_DM, ENCOUNTER_ID)

    expect(result).toBeNull()
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].params).toEqual([ENCOUNTER_ID, OTHER_DM, 1])
  })
})

describe('addCharacterCombatants', () => {
  it('adds only characters from the encounter’s own campaign, labelled by name', async () => {
    const inserted = { ...PC_COMBATANT, initiative: null }

    mockRowsQueue = [
      [encounterDriverRow(ENCOUNTER)],
      [[CHARACTER_ID, 'Vex Ashbrand']], // the campaign-membership check
      [], // no combatants yet
      [combatantDriverRow(inserted)],
    ]

    const result = await addCharacterCombatants(DM, ENCOUNTER_ID, [CHARACTER_ID])

    expect(mockCalls).toHaveLength(4)
    const [, membership, , insert] = mockCalls

    // Membership is re-checked in SQL against the encounter's campaign —
    // whatever ids arrive, only characters at this table come back.
    expect(membership.sql).toContain('inner join "character_campaigns"')
    expect(membership.sql).toContain('"character_campaigns"."campaign_id" = $1')
    expect(membership.sql).toContain('"characters"."id" in ($2)')
    expect(membership.params).toEqual([CAMPAIGN_ID, CHARACTER_ID])

    expect(insert.sql).toContain('insert into "encounter_combatants"')
    expect(insert.params).toEqual(expect.arrayContaining([CHARACTER_ID, 'Vex Ashbrand']))

    expect(result).toEqual([inserted])
  })

  it('skips characters already in the encounter — adding the party twice is adding it once', async () => {
    mockRowsQueue = [
      [encounterDriverRow(ENCOUNTER)],
      [[CHARACTER_ID, 'Vex Ashbrand']],
      [[CHARACTER_ID, 0]], // already a combatant
    ]

    const result = await addCharacterCombatants(DM, ENCOUNTER_ID, [CHARACTER_ID])

    expect(result).toEqual([])
    expect(mockCalls).toHaveLength(3) // no insert
  })

  it('answers null for an encounter someone else runs, writing nothing', async () => {
    const result = await addCharacterCombatants(OTHER_DM, ENCOUNTER_ID, [CHARACTER_ID])

    expect(result).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('drops malformed character ids before they reach a query', async () => {
    mockRowsQueue = [[encounterDriverRow(ENCOUNTER)]]

    const result = await addCharacterCombatants(DM, ENCOUNTER_ID, ['not-a-uuid'])

    expect(result).toEqual([])
    expect(mockCalls).toHaveLength(1)
  })
})

describe('addMonsterCombatants', () => {
  it('labels the instances "Goblin 1..3" and seeds each one’s HP (D17)', async () => {
    const goblins = [1, 2, 3].map((n) => ({
      ...MONSTER_COMBATANT,
      label: `Goblin ${n}`,
      initiative: null,
      sortOrder: n - 1,
    }))

    mockRowsQueue = [
      [encounterDriverRow(ENCOUNTER)],
      [], // no combatants yet
      goblins.map(combatantDriverRow),
    ]

    const result = await addMonsterCombatants(DM, ENCOUNTER_ID, {
      monsterIndex: 'goblin',
      name: 'Goblin',
      count: 3,
      maxHitPoints: 7,
    })

    expect(mockCalls).toHaveLength(3)
    const insert = mockCalls[2]

    expect(insert.sql).toContain('insert into "encounter_combatants"')
    expect(insert.params).toEqual(expect.arrayContaining(['Goblin 1', 'Goblin 2', 'Goblin 3']))
    // Each instance starts at full HP — current seeded equal to max.
    expect(insert.params.filter((param) => param === 7)).toHaveLength(6)

    expect(result).toHaveLength(3)
    expect(result?.map((combatant) => combatant.label)).toEqual([
      'Goblin 1',
      'Goblin 2',
      'Goblin 3',
    ])
  })

  it('continues numbering past instances of the same monster already in', async () => {
    mockRowsQueue = [
      [encounterDriverRow(ENCOUNTER)],
      [
        ['goblin', 0],
        ['goblin', 1],
        [null, 2],
      ],
      [combatantDriverRow({ ...MONSTER_COMBATANT, label: 'Goblin 3', sortOrder: 3 })],
    ]

    await addMonsterCombatants(DM, ENCOUNTER_ID, {
      monsterIndex: 'goblin',
      name: 'Goblin',
      count: 1,
      maxHitPoints: 7,
    })

    const insert = mockCalls[2]
    expect(insert.params).toEqual(expect.arrayContaining(['Goblin 3']))
    expect(insert.params).not.toEqual(expect.arrayContaining(['Goblin 1']))
  })

  it('answers null for an encounter someone else runs', async () => {
    const result = await addMonsterCombatants(OTHER_DM, ENCOUNTER_ID, {
      monsterIndex: 'goblin',
      name: 'Goblin',
      count: 3,
      maxHitPoints: 7,
    })

    expect(result).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })
})

describe('updateCombatant', () => {
  it('writes a monster’s HP clamped to its own maximum, scope folded into both statements', async () => {
    const updated = { ...MONSTER_COMBATANT, currentHitPoints: 7 }

    mockRowsQueue = [[combatantDriverRow(MONSTER_COMBATANT)], [combatantDriverRow(updated)]]

    const result = await updateCombatant(DM, ENCOUNTER_ID, MONSTER_COMBATANT_ID, {
      currentHitPoints: 25, // above the goblin's max of 7
    })

    expect(mockCalls).toHaveLength(2)
    const [read, write] = mockCalls

    const scope =
      'exists (select 1 from "encounters" inner join "campaigns" on "encounters"."campaign_id" = "campaigns"."id" ' +
      'where ("encounters"."id" = "encounter_combatants"."encounter_id" and "campaigns"."dm_user_id" = $'

    expect(read.sql).toContain(scope)
    expect(read.params).toEqual([MONSTER_COMBATANT_ID, ENCOUNTER_ID, DM, 1])

    expect(write.sql).toContain('update "encounter_combatants" set')
    expect(write.sql).toContain(scope)
    // Clamped to the instance's stored maximum, not the zod ceiling.
    expect(write.params[0]).toBe(7)

    expect(result).toEqual(updated)
  })

  it('strips HP from a patch aimed at a PC row — the character is the source of truth (D13)', async () => {
    const updated = { ...PC_COMBATANT, initiative: 12 }

    mockRowsQueue = [[combatantDriverRow(PC_COMBATANT)], [combatantDriverRow(updated)]]

    const result = await updateCombatant(DM, ENCOUNTER_ID, PC_COMBATANT_ID, {
      initiative: 12,
      currentHitPoints: 5,
      temporaryHitPoints: 9,
    })

    expect(mockCalls).toHaveLength(2)
    const write = mockCalls[1]
    expect(write.sql).not.toContain('"current_hit_points" = ')
    expect(write.sql).not.toContain('"temporary_hit_points" = ')
    expect(write.sql).toContain('"initiative" = ')

    expect(result).toEqual(updated)
  })

  it('returns the row untouched when the whole patch was stripped', async () => {
    mockRowsQueue = [[combatantDriverRow(PC_COMBATANT)]]

    const result = await updateCombatant(DM, ENCOUNTER_ID, PC_COMBATANT_ID, {
      currentHitPoints: 5,
    })

    expect(result).toEqual(PC_COMBATANT)
    expect(mockCalls).toHaveLength(1) // no UPDATE issued
  })

  it('answers null for a combatant in someone else’s encounter, writing nothing', async () => {
    const result = await updateCombatant(OTHER_DM, ENCOUNTER_ID, MONSTER_COMBATANT_ID, {
      currentHitPoints: 3,
    })

    expect(result).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })
})

describe('removeCombatant', () => {
  it('deletes scoped to the DM and answers true on a hit', async () => {
    mockRows = [[MONSTER_COMBATANT_ID]]

    const result = await removeCombatant(DM, ENCOUNTER_ID, MONSTER_COMBATANT_ID)

    expect(result).toBe(true)
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('delete from "encounter_combatants"')
    expect(mockCalls[0].sql).toContain('"campaigns"."dm_user_id" = $3')
    expect(mockCalls[0].params).toEqual([MONSTER_COMBATANT_ID, ENCOUNTER_ID, DM])
  })

  it('answers false when there was nothing this DM could remove', async () => {
    await expect(removeCombatant(OTHER_DM, ENCOUNTER_ID, MONSTER_COMBATANT_ID)).resolves.toBe(false)
  })
})

describe('patchEncounter', () => {
  it('steps the round and turn in one scoped update', async () => {
    const stepped = { ...ENCOUNTER, round: 2, activeTurn: 0 }
    mockRows = [encounterDriverRow(stepped)]

    const result = await patchEncounter(DM, ENCOUNTER_ID, { round: 2, activeTurn: 0 })

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "encounters" set')
    expect(sql).toContain('"round"')
    expect(sql).toContain('"active_turn"')
    expect(sql).toContain('"campaigns"."dm_user_id"')
    expect(params).toContain(2)
    expect(result).toEqual(stepped)
  })

  it('answers null for an encounter someone else runs', async () => {
    await expect(patchEncounter(OTHER_DM, ENCOUNTER_ID, { round: 2 })).resolves.toBeNull()
  })

  it('falls back to a scoped read when the patch holds nothing to write', async () => {
    mockRows = [encounterDriverRow(ENCOUNTER)]

    const result = await patchEncounter(DM, ENCOUNTER_ID, {})

    expect(result).toEqual(ENCOUNTER)
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('select')
    expect(mockCalls[0].sql).not.toContain('update "encounters"')
  })
})

describe('regenerateShareToken', () => {
  it('replaces the token, scoped to the DM who runs the campaign', async () => {
    const rotated = { ...ENCOUNTER, shareToken: 'aaaaaaaaaaaaaaaaaaaaaa' }
    mockRows = [encounterDriverRow(rotated)]

    const result = await regenerateShareToken(DM, ENCOUNTER_ID)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "encounters" set')
    expect(sql).toContain('"share_token" = $1')
    expect(sql).toContain('"campaigns"."dm_user_id"')
    expect(params[0]).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(result).toEqual(rotated)
  })

  it('answers null for an encounter someone else runs, rotating nothing', async () => {
    await expect(regenerateShareToken(OTHER_DM, ENCOUNTER_ID)).resolves.toBeNull()
  })
})

describe('deleteEncounter', () => {
  it('deletes scoped to the DM and answers true on a hit', async () => {
    mockRows = [[ENCOUNTER_ID]]

    const result = await deleteEncounter(DM, ENCOUNTER_ID)

    expect(result).toBe(true)
    expect(mockCalls[0].sql).toContain('delete from "encounters"')
    expect(mockCalls[0].sql).toContain('"campaigns"."dm_user_id"')
  })

  it('answers false for an encounter someone else runs', async () => {
    await expect(deleteEncounter(OTHER_DM, ENCOUNTER_ID)).resolves.toBe(false)
  })

  it('treats a malformed id as a miss without querying', async () => {
    await expect(deleteEncounter(DM, 'not-a-uuid')).resolves.toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})

describe('getEncounterByShareToken', () => {
  // The custom column list of the combatant query, in select order.
  function tableRow(combatant: EncounterCombatant, character: Character | null): unknown[] {
    return [
      combatant.id,
      combatant.label,
      combatant.characterId,
      combatant.initiative,
      `{${combatant.conditions.join(',')}}`,
      character?.currentHitPoints ?? null,
      character?.maxHitPoints ?? null,
      character?.temporaryHitPoints ?? null,
      character ? `{${character.conditions.join(',')}}` : null,
    ]
  }

  it('answers the sanitized view: PC HP present, monster HP and identity absent (D24)', async () => {
    const bloodiedGoblin = { ...MONSTER_COMBATANT, currentHitPoints: 2, conditions: ['prone'] }

    mockRowsQueue = [
      [[...encounterDriverRow(ENCOUNTER), 'The Rime of the Frostmaiden']],
      [tableRow(bloodiedGoblin, null), tableRow(PC_COMBATANT, CHARACTER_FIXTURE)],
    ]

    const result = await getEncounterByShareToken(TOKEN)

    expect(mockCalls).toHaveLength(2)
    expect(mockCalls[0].sql).toContain('"encounters"."share_token" = $1')
    expect(mockCalls[0].params).toEqual([TOKEN, 1])

    // The exact shapes prove what is absent, not just what is present: no
    // monster HP, no monsterIndex, no character id — nothing beyond the label.
    expect(result).toEqual({
      encounterName: 'Ambush at the bridge',
      campaignName: 'The Rime of the Frostmaiden',
      round: 1,
      activeTurn: 0,
      combatants: [
        {
          id: MONSTER_COMBATANT_ID,
          label: 'Goblin 1',
          isCharacter: false,
          initiative: 17,
          conditions: ['prone'],
        },
        {
          id: PC_COMBATANT_ID,
          label: 'Vex Ashbrand',
          isCharacter: true,
          initiative: 15,
          conditions: ['prone'],
          characterHp: { current: 21, max: 32, temp: 3 },
        },
      ],
    })

    // Belt and braces: the goblin's hit points appear nowhere in the payload.
    expect(JSON.stringify(result)).not.toContain('goblin')
    expect(result?.combatants[0]).not.toHaveProperty('characterHp')
  })

  it('answers null to a dead token', async () => {
    await expect(getEncounterByShareToken(TOKEN)).resolves.toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it.each([
    ['too short', 'shortcode'],
    ['not base64url', 'kfEbCq3vX9pLm2Rt8sWz1A!!'],
    ['empty', ''],
  ])('rejects a malformed token (%s) without querying', async (_label, token) => {
    await expect(getEncounterByShareToken(token)).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})
