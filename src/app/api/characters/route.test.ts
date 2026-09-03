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

import { getSessionUser } from '@/lib/auth/server'
import { attachCharacterToCampaign } from '@/lib/db/campaigns'
import { createCharacter, listCharacters, type Character } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'
import { addStartingItems } from '@/lib/db/items'

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
