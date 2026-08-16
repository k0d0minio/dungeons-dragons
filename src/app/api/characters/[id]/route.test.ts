import { DELETE, GET, PATCH } from './route'

// Ownership lives in the query, not in this route — these tests exist to prove
// the session user is what reaches it, and that the patch is bounded.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/characters', () => ({
  deleteCharacter: jest.fn(),
  getCharacter: jest.fn(),
  updateCharacter: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { deleteCharacter, getCharacter, updateCharacter, type Character } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockGetCharacter = getCharacter as jest.MockedFunction<typeof getCharacter>
const mockUpdateCharacter = updateCharacter as jest.MockedFunction<typeof updateCharacter>
const mockDeleteCharacter = deleteCharacter as jest.MockedFunction<typeof deleteCharacter>
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
  level: 5,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 32,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
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
  mockUpdateCharacter.mockImplementation(async (_owner, _id, patch) => ({ ...STORED, ...patch }))
  mockDeleteCharacter.mockResolvedValue(true)
})

describe('GET /api/characters/[id]', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await GET(jsonRequest(null), { params })

    expect(response.status).toBe(401)
    expect(mockGetCharacter).not.toHaveBeenCalled()
  })

  it('scopes the read to the signed-in owner', async () => {
    signedIn()

    const response = await GET(jsonRequest(null), { params })

    expect(response.status).toBe(200)
    expect(mockGetCharacter).toHaveBeenCalledWith(OWNER, ID)
  })

  it('is a 404 for a character belonging to someone else', async () => {
    signedIn()
    mockGetCharacter.mockResolvedValue(null)

    const response = await GET(jsonRequest(null), { params })

    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/characters/[id]', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await PATCH(jsonRequest({ currentHitPoints: 5 }), { params })

    expect(response.status).toBe(401)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await PATCH(jsonRequest({ currentHitPoints: 5 }), { params })

    expect(response.status).toBe(503)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('writes the tracked change against the session owner', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ currentHitPoints: 14, conditions: ['prone'] }), {
      params,
    })

    expect(response.status).toBe(200)
    expect(mockUpdateCharacter).toHaveBeenCalledWith(OWNER, ID, {
      currentHitPoints: 14,
      conditions: ['prone'],
    })
  })

  it('clamps healing to the character’s own maximum', async () => {
    signedIn()

    await PATCH(jsonRequest({ currentHitPoints: 500 }), { params })

    expect(mockUpdateCharacter.mock.calls[0][2].currentHitPoints).toBe(32)
  })

  it('refuses to change anything the sheet does not track', async () => {
    signedIn()

    const response = await PATCH(
      jsonRequest({ currentHitPoints: 10, name: 'Someone Else', maxHitPoints: 999 }),
      { params },
    )

    expect(response.status).toBe(400)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('is a 404 for a character belonging to someone else, without writing', async () => {
    signedIn()
    mockGetCharacter.mockResolvedValue(null)

    const response = await PATCH(jsonRequest({ currentHitPoints: 5 }), { params })

    expect(response.status).toBe(404)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('rejects an empty patch and a body that is not JSON', async () => {
    signedIn()

    expect((await PATCH(jsonRequest({}), { params })).status).toBe(400)

    const unparseable = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    expect((await PATCH(unparseable, { params })).status).toBe(400)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('answers with the stored row, so the sheet can reconcile against it', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ currentHitPoints: 900 }), { params })
    const data = await response.json()

    expect(data.character.currentHitPoints).toBe(32)
  })
})

describe('PATCH /api/characters/[id] — editing the build (DND-018)', () => {
  it('writes an edited field against the session owner', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ name: 'Vex the Second', level: 6 }), { params })

    expect(response.status).toBe(200)
    expect(mockUpdateCharacter).toHaveBeenCalledWith(OWNER, ID, {
      name: 'Vex the Second',
      level: 6,
    })
  })

  it('accepts the whole form, which is what the edit page sends', async () => {
    signedIn()

    const response = await PATCH(
      jsonRequest({
        name: 'Vex Ashbrand',
        classIndex: 'wizard',
        speciesIndex: 'half-elf',
        level: 6,
        strength: 8,
        dexterity: 14,
        constitution: 14,
        intelligence: 18,
        wisdom: 12,
        charisma: 10,
        maxHitPoints: 38,
        armorClass: 12,
        speed: 30,
        knownSpellIndexes: ['fireball'],
      }),
      { params },
    )

    expect(response.status).toBe(200)
    expect(mockUpdateCharacter.mock.calls[0][2].maxHitPoints).toBe(38)
  })

  it('holds an edit to the same bounds the creation form enforces', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ level: 21 }), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.fieldErrors.level).toContain('between 1 and 20')
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('brings current hit points down with a lowered maximum', async () => {
    signedIn()

    await PATCH(jsonRequest({ maxHitPoints: 12 }), { params })

    // Stored at 32/32, so a maximum of 12 cannot leave 32 on the sheet.
    expect(mockUpdateCharacter.mock.calls[0][2]).toEqual({
      maxHitPoints: 12,
      currentHitPoints: 12,
    })
  })

  it('is a 404 for a character belonging to someone else, without writing', async () => {
    signedIn()
    mockGetCharacter.mockResolvedValue(null)

    const response = await PATCH(jsonRequest({ name: 'Not Mine' }), { params })

    expect(response.status).toBe(404)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('refuses a field that belongs to neither shape', async () => {
    signedIn()

    // Unknown keys fall through to the strict combat schema rather than being
    // quietly stripped by the partial one.
    expect((await PATCH(jsonRequest({ ownerId: 'someone-else' }), { params })).status).toBe(400)
    expect((await PATCH(jsonRequest({ name: 'Vex', ownerId: 'x' }), { params })).status).toBe(400)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })

  it('refuses to mix a build edit with live combat state', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ name: 'Vex', currentHitPoints: 1 }), { params })

    expect(response.status).toBe(400)
    expect(mockUpdateCharacter).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/characters/[id]', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await DELETE(jsonRequest(null), { params })

    expect(response.status).toBe(401)
    expect(mockDeleteCharacter).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await DELETE(jsonRequest(null), { params })

    expect(response.status).toBe(503)
    expect(mockDeleteCharacter).not.toHaveBeenCalled()
  })

  it('scopes the delete to the signed-in owner', async () => {
    signedIn()

    const response = await DELETE(jsonRequest(null), { params })

    expect(response.status).toBe(200)
    expect(mockDeleteCharacter).toHaveBeenCalledWith(OWNER, ID)
  })

  it('is a 404 for a character belonging to someone else', async () => {
    signedIn()
    // Nothing of this owner's matched, which is what a foreign id looks like
    // from in here — indistinguishable from an id that was never real.
    mockDeleteCharacter.mockResolvedValue(false)

    const response = await DELETE(jsonRequest(null), { params })

    expect(response.status).toBe(404)
  })
})
