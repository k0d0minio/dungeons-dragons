import { POST } from './route'

// Adding combatants (DND-031): the body's keys decide whether it is the
// party or a monster batch, and anything else is refused.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/encounters', () => ({
  addCharacterCombatants: jest.fn(),
  addMonsterCombatants: jest.fn(),
  MAX_MONSTER_BATCH: 20,
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { addCharacterCombatants, addMonsterCombatants } from '@/lib/db/encounters'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockAddCharacters = addCharacterCombatants as jest.MockedFunction<
  typeof addCharacterCombatants
>
const mockAddMonsters = addMonsterCombatants as jest.MockedFunction<typeof addMonsterCombatants>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const params = Promise.resolve({ id: ID })

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockAddCharacters.mockResolvedValue([])
  mockAddMonsters.mockResolvedValue([])
})

describe('POST /api/encounters/[id]/combatants', () => {
  it('answers 401 when signed out', async () => {
    const response = await POST(jsonRequest({ characterIds: [CHARACTER_ID] }), { params })

    expect(response.status).toBe(401)
    expect(mockAddCharacters).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ characterIds: [CHARACTER_ID] }), { params })

    expect(response.status).toBe(503)
  })

  it('routes a character body to the character add, scoped to the session user', async () => {
    signedIn()

    const response = await POST(jsonRequest({ characterIds: [CHARACTER_ID] }), { params })

    expect(response.status).toBe(201)
    expect(mockAddCharacters).toHaveBeenCalledWith(DM, ID, [CHARACTER_ID])
    expect(mockAddMonsters).not.toHaveBeenCalled()
  })

  it('routes a monster body to the monster add', async () => {
    signedIn()

    const response = await POST(
      jsonRequest({ monsterIndex: 'goblin', name: 'Goblin', count: 3, maxHitPoints: 7 }),
      { params },
    )

    expect(response.status).toBe(201)
    expect(mockAddMonsters).toHaveBeenCalledWith(DM, ID, {
      monsterIndex: 'goblin',
      name: 'Goblin',
      count: 3,
      maxHitPoints: 7,
    })
    expect(mockAddCharacters).not.toHaveBeenCalled()
  })

  it('refuses a body that is neither shape', async () => {
    signedIn()

    const response = await POST(jsonRequest({ label: 'Mystery guest' }), { params })

    expect(response.status).toBe(400)
    expect(mockAddCharacters).not.toHaveBeenCalled()
    expect(mockAddMonsters).not.toHaveBeenCalled()
  })

  it('refuses a monster batch beyond the cap', async () => {
    signedIn()

    const response = await POST(
      jsonRequest({ monsterIndex: 'goblin', name: 'Goblin', count: 50, maxHitPoints: 7 }),
      { params },
    )

    expect(response.status).toBe(400)
  })

  it('answers 404 for an encounter someone else runs', async () => {
    signedIn()
    mockAddCharacters.mockResolvedValue(null)

    const response = await POST(jsonRequest({ characterIds: [CHARACTER_ID] }), { params })

    expect(response.status).toBe(404)
  })
})
