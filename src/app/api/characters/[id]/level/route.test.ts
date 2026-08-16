import { POST } from './route'

// Ownership lives in the query, not in this route — these tests exist to prove
// the session user is what reaches it, and that a level change is bounded.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/characters', () => ({
  getCharacter: jest.fn(),
  updateCharacter: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { getCharacter, updateCharacter, type Character } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockGetCharacter = getCharacter as jest.MockedFunction<typeof getCharacter>
const mockUpdateCharacter = updateCharacter as jest.MockedFunction<typeof updateCharacter>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const OWNER = 'user_2mFq8xKpLd'
const ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const STORED: Character = {
  id: ID,
  ownerId: OWNER,
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 4,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 26,
  currentHitPoints: 26,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: { '1': { max: 4, used: 2 }, '2': { max: 3, used: 0 } },
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
  knownSpellIndexes: ['fireball'],
  preparedSpellIndexes: [],
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const params = Promise.resolve({ id: ID })

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: OWNER } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockGetCharacter.mockResolvedValue(STORED)
  mockUpdateCharacter.mockImplementation(async (_owner, _id, patch) => ({
    outcome: 'updated',
    character: { ...STORED, ...patch, version: STORED.version + 1 },
  }))
})

describe('POST /api/characters/[id]/level', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await POST(jsonRequest({ level: 5, maxHitPoints: 32 }), { params })

    expect(response.status).toBe(401)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('writes level, maximum and slots in one update, scoped to the session user', async () => {
    signedIn()

    const response = await POST(
      jsonRequest({
        level: 5,
        maxHitPoints: 32,
        spellSlots: {
          '1': { max: 4, used: 2 },
          '2': { max: 3, used: 0 },
          '3': { max: 2, used: 0 },
        },
      }),
      { params },
    )

    expect(response.status).toBe(200)
    expect(mockUpdateCharacter).toHaveBeenCalledWith(
      OWNER,
      ID,
      expect.objectContaining({ level: 5, maxHitPoints: 32 }),
    )
    expect(mockUpdateCharacter.mock.calls[0][2].spellSlots).toEqual({
      '1': { max: 4, used: 2 },
      '2': { max: 3, used: 0 },
      '3': { max: 2, used: 0 },
    })
  })

  it('brings current hit points down when levelling down lowers the maximum', async () => {
    signedIn()

    await POST(jsonRequest({ level: 2, maxHitPoints: 14 }), { params })

    expect(mockUpdateCharacter).toHaveBeenCalledWith(
      OWNER,
      ID,
      expect.objectContaining({ level: 2, maxHitPoints: 14, currentHitPoints: 14 }),
    )
  })

  it('leaves spell slots alone when the change does not name them', async () => {
    signedIn()

    await POST(jsonRequest({ level: 5, maxHitPoints: 32 }), { params })

    expect(mockUpdateCharacter.mock.calls[0][2]).not.toHaveProperty('spellSlots')
  })

  it('refuses a body that reaches for a column a level change does not own', async () => {
    signedIn()

    const response = await POST(jsonRequest({ level: 5, maxHitPoints: 32, name: 'Someone Else' }), {
      params,
    })

    expect(response.status).toBe(400)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('refuses a level 5e does not define', async () => {
    signedIn()

    const response = await POST(jsonRequest({ level: 21, maxHitPoints: 32 }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: 'That level change is not valid' }),
    )
  })

  it('answers 409 with the current row when the update reports a conflict (DND-028)', async () => {
    signedIn()
    mockUpdateCharacter.mockResolvedValue({ outcome: 'conflict', character: STORED })

    const response = await POST(jsonRequest({ level: 5, maxHitPoints: 32 }), { params })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.character).toEqual(STORED)
  })

  it('answers 404 for a character that is not the session user’s', async () => {
    signedIn()
    mockGetCharacter.mockResolvedValue(null)

    const response = await POST(jsonRequest({ level: 5, maxHitPoints: 32 }), { params })

    expect(response.status).toBe(404)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('answers 400 for a body that is not JSON at all', async () => {
    signedIn()

    const response = await POST(
      {
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Request,
      { params },
    )

    expect(response.status).toBe(400)
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ level: 5, maxHitPoints: 32 }), { params })

    expect(response.status).toBe(503)
  })
})
