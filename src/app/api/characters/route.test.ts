import { GET, POST } from './route'

// The owner never comes from the request body — it comes from the session — so
// these tests mostly exist to prove that one thing stays true.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/characters', () => ({
  createCharacter: jest.fn(),
  listCharacters: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  attachCharacterToCampaign: jest.fn(),
}))

jest.mock('@/lib/db/items', () => ({
  addStartingItems: jest.fn(),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { attachCharacterToCampaign } from '@/lib/db/campaigns'
import { createCharacter, listCharacters, type Character } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'
import { addStartingItems } from '@/lib/db/items'
import { isDm } from '@/lib/db/roles'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreateCharacter = createCharacter as jest.MockedFunction<typeof createCharacter>
const mockListCharacters = listCharacters as jest.MockedFunction<typeof listCharacters>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>
const mockAttach = attachCharacterToCampaign as jest.MockedFunction<
  typeof attachCharacterToCampaign
>
const mockAddStartingItems = addStartingItems as jest.MockedFunction<typeof addStartingItems>
const mockIsDm = isDm as jest.MockedFunction<typeof isDm>

const CAMPAIGN = 'a1b2c3d4-0000-4000-8000-000000000001'

const OWNER = 'user_2mFq8xKpLd'

const VALID_BODY = {
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
  armorClass: 12,
  speed: 30,
  knownSpellIndexes: ['fireball', 'magic-missile'],
  skillProficiencies: [],
  skillExpertise: [],
}

/**
 * What the 2024 origin columns come out as for a body that names none of them —
 * which is the body above, and every body written before those columns existed.
 * `null` across the board, never `undefined`: the route always decides the six.
 */
const NO_ORIGIN = {
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
}

const STORED: Character = {
  portrait: null,
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: OWNER,
  ...VALID_BODY,
  currentHitPoints: 32,
  temporaryHitPoints: 0,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
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
  preparedSpellIndexes: [],
  concentration: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
  featChoices: null,
}

/** A stand-in for the Request the route actually receives. */
function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

/** A Request whose body will not parse — a truncated POST, a proxy mangling it. */
function unparseableRequest(): Request {
  return {
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input')
    },
  } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: OWNER } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
  mockIsDm.mockResolvedValue(false)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockListCharacters.mockResolvedValue([])
  mockCreateCharacter.mockImplementation(async (ownerId) => ({ ...STORED, ownerId }))
  mockAttach.mockResolvedValue(true)
  mockAddStartingItems.mockResolvedValue([])
})

describe('GET /api/characters', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await GET()

    expect(response.status).toBe(401)
    expect(mockListCharacters).not.toHaveBeenCalled()
  })

  it('lists only the signed-in owner’s characters', async () => {
    signedIn()

    const response = await GET()

    expect(response.status).toBe(200)
    expect(mockListCharacters).toHaveBeenCalledWith(OWNER)
  })
})

describe('POST /api/characters', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await POST(jsonRequest(VALID_BODY))

    expect(response.status).toBe(401)
    expect(mockCreateCharacter).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest(VALID_BODY))

    expect(response.status).toBe(503)
    expect(mockCreateCharacter).not.toHaveBeenCalled()
  })

  // `first-table/dm-front-door`: the DM does not play a character, and the
  // refusal is the route's so the wizard's own request cannot make him one.
  it('answers 403 for the DM, before reading the body', async () => {
    signedIn()
    mockIsDm.mockResolvedValue(true)

    const response = await POST(jsonRequest(VALID_BODY))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toMatch(/does not play a character/)
    expect(mockCreateCharacter).not.toHaveBeenCalled()
  })

  it('stores the character against the session owner', async () => {
    signedIn()

    const response = await POST(jsonRequest(VALID_BODY))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(mockCreateCharacter).toHaveBeenCalledWith(OWNER, { ...VALID_BODY, ...NO_ORIGIN })
    expect(data.character.ownerId).toBe(OWNER)
  })

  it('ignores an owner supplied in the body', async () => {
    signedIn()

    await POST(jsonRequest({ ...VALID_BODY, ownerId: 'user_someone_else', id: 'forged' }))

    const [ownerId, input] = mockCreateCharacter.mock.calls[0]
    expect(ownerId).toBe(OWNER)
    expect(input).not.toHaveProperty('ownerId')
    expect(input).not.toHaveProperty('id')
  })

  it('de-duplicates spell indexes', async () => {
    signedIn()

    await POST(jsonRequest({ ...VALID_BODY, knownSpellIndexes: ['fireball', 'fireball'] }))

    expect(mockCreateCharacter.mock.calls[0][1].knownSpellIndexes).toEqual(['fireball'])
  })

  // The one-page form sends none of the wizard's four extra fields, and must go
  // on creating exactly the character it always did.
  it('leaves a body that names no wizard fields entirely alone', async () => {
    signedIn()

    await POST(jsonRequest(VALID_BODY))

    const input = mockCreateCharacter.mock.calls[0][1]
    expect(input).not.toHaveProperty('preparedSpellIndexes')
    expect(input).not.toHaveProperty('gp')
    expect(mockAddStartingItems).not.toHaveBeenCalled()
    expect(mockAttach).not.toHaveBeenCalled()
  })

  it('stores the day-one prepared spells the wizard sends, de-duplicated', async () => {
    signedIn()

    await POST(
      jsonRequest({ ...VALID_BODY, preparedSpellIndexes: ['magic-missile', 'magic-missile'] }),
    )

    expect(mockCreateCharacter.mock.calls[0][1].preparedSpellIndexes).toEqual(['magic-missile'])
  })

  // Derived from the SRD data on this side of the wire, never taken from the
  // body: an equipment *choice* cannot smuggle in an item the class never had.
  it('derives the starting inventory and purse from the chosen clause', async () => {
    signedIn()

    await POST(
      jsonRequest({
        ...VALID_BODY,
        classIndex: 'fighter',
        backgroundIndex: 'soldier',
        backgroundAbilitySpread: 'two-and-one',
        backgroundAbilities: ['strength', 'constitution'],
        classEquipmentOption: 0,
        backgroundEquipmentOption: 0,
      }),
    )

    // Fighter clause (a) is 4 gp; Soldier clause (A) is 14 gp.
    expect(mockCreateCharacter.mock.calls[0][1].gp).toBe(18)

    const [characterId, items] = mockAddStartingItems.mock.calls[0]
    expect(characterId).toBe(STORED.id)
    expect(items).toContainEqual({
      equipmentIndex: 'chain-mail',
      customName: null,
      quantity: 1,
      equipped: true,
    })
  })

  // `first-table/creation-readiness`: a wizard-made character walks in able to
  // attack, cast and master from the first tap. All three are derived on this
  // side of the wire from the same kit the items came from.
  describe('readying the kit', () => {
    const FIGHTER_BODY = {
      ...VALID_BODY,
      classIndex: 'fighter',
      level: 1,
      strength: 16,
      dexterity: 12,
      backgroundIndex: 'soldier',
      backgroundAbilitySpread: 'two-and-one',
      backgroundAbilities: ['strength', 'constitution'],
      classEquipmentOption: 0,
      backgroundEquipmentOption: 0,
    }

    it('equips the kit’s best melee weapon and its ranged one, and leaves the rest packed', async () => {
      signedIn()

      await POST(jsonRequest(FIGHTER_BODY))

      const [, items] = mockAddStartingItems.mock.calls[0]
      const equippedIndexes = items
        .filter((item) => item.equipped)
        .map((item) => item.equipmentIndex)
        .sort()

      expect(equippedIndexes).toEqual(['chain-mail', 'greatsword', 'shortbow'])
      expect(items).toContainEqual({
        equipmentIndex: 'javelin',
        customName: null,
        quantity: 8,
        equipped: false,
      })
    })

    it('readies one row per weapon when the class and the background hand out the same one', async () => {
      signedIn()

      // The bard's kit and the criminal's are both "2 Daggers": two rows of
      // the same index, and the sheet prints an attack line per readied row.
      await POST(
        jsonRequest({
          ...FIGHTER_BODY,
          classIndex: 'bard',
          dexterity: 16,
          backgroundIndex: 'criminal',
          backgroundAbilities: ['dexterity', 'constitution'],
        }),
      )

      const [, items] = mockAddStartingItems.mock.calls[0]
      const daggers = items.filter((item) => item.equipmentIndex === 'dagger')
      expect(daggers).toHaveLength(2)
      expect(daggers.map((item) => item.equipped)).toEqual([true, false])
    })

    it('picks the masteries from the kit, readied weapons first, within the class’s count', async () => {
      signedIn()

      await POST(jsonRequest(FIGHTER_BODY))

      expect(mockCreateCharacter.mock.calls[0][1].masteredWeaponIndexes).toEqual([
        'greatsword',
        'shortbow',
        'flail',
      ])
    })

    it('keeps masteries a body names itself', async () => {
      signedIn()

      await POST(jsonRequest({ ...FIGHTER_BODY, masteredWeaponIndexes: ['flail'] }))

      expect(mockCreateCharacter.mock.calls[0][1].masteredWeaponIndexes).toEqual(['flail'])
    })

    it('seeds the standard slot table for a caster, and an empty one for a fighter', async () => {
      signedIn()

      await POST(jsonRequest(FIGHTER_BODY))
      expect(mockCreateCharacter.mock.calls[0][1].spellSlots).toEqual({})

      await POST(
        jsonRequest({
          ...FIGHTER_BODY,
          classIndex: 'paladin',
          backgroundIndex: 'acolyte',
          backgroundAbilities: ['strength', 'charisma'],
        }),
      )
      expect(mockCreateCharacter.mock.calls[1][1].spellSlots).toEqual({
        '1': { max: 2, used: 0 },
      })
      // The paladin's kit has a shield, so the shortbow stays in the pack and
      // the javelins are what gets thrown.
      const [, items] = mockAddStartingItems.mock.calls[1]
      expect(items.filter((item) => item.equipped).map((item) => item.equipmentIndex)).toEqual(
        expect.arrayContaining(['chain-mail', 'shield', 'longsword', 'javelin']),
      )
      expect(items.find((item) => item.equipmentIndex === 'shortbow')).toBeUndefined()
    })

    it('leaves a one-page body without slots or masteries of its own', async () => {
      signedIn()

      await POST(jsonRequest(VALID_BODY))

      const input = mockCreateCharacter.mock.calls[0][1]
      expect(input).not.toHaveProperty('spellSlots')
      expect(input.masteredWeaponIndexes).toBeNull()
    })
  })

  it('writes no items for a clause that is only coin', async () => {
    signedIn()

    await POST(jsonRequest({ ...VALID_BODY, classIndex: 'fighter', classEquipmentOption: 2 }))

    expect(mockCreateCharacter.mock.calls[0][1].gp).toBe(155)
    expect(mockAddStartingItems).not.toHaveBeenCalled()
  })

  it('attaches the character to the campaign it was made for', async () => {
    signedIn()

    await POST(jsonRequest({ ...VALID_BODY, campaignId: CAMPAIGN }))

    expect(mockAttach).toHaveBeenCalledWith(OWNER, STORED.id, CAMPAIGN)
  })

  it('attaches nothing when the wizard carried no campaign', async () => {
    signedIn()

    await POST(jsonRequest({ ...VALID_BODY, campaignId: null }))

    expect(mockAttach).not.toHaveBeenCalled()
  })

  it('rejects a campaign id that is not one', async () => {
    signedIn()

    const response = await POST(jsonRequest({ ...VALID_BODY, campaignId: 'not-a-campaign' }))

    expect(response.status).toBe(400)
    expect(mockCreateCharacter).not.toHaveBeenCalled()
  })

  it('rejects an invalid character with per-field messages', async () => {
    signedIn()

    const response = await POST(jsonRequest({ ...VALID_BODY, name: '', level: 99 }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.fieldErrors.name).toBe('Give your character a name')
    expect(data.fieldErrors.level).toContain('between 1 and 20')
    expect(mockCreateCharacter).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    signedIn()

    const response = await POST(unparseableRequest())

    expect(response.status).toBe(400)
    expect(mockCreateCharacter).not.toHaveBeenCalled()
  })
})
