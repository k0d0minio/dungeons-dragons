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

import { getSessionUser } from '@/lib/auth/server'
import { createCharacter, listCharacters, type Character } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreateCharacter = createCharacter as jest.MockedFunction<typeof createCharacter>
const mockListCharacters = listCharacters as jest.MockedFunction<typeof listCharacters>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

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
}

const STORED: Character = {
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
  preparedSpellIndexes: [],
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
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
    expect(mockCreateCharacter).toHaveBeenCalledWith(OWNER, VALID_BODY)
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
