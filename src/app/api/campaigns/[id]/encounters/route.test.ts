import { GET, POST } from './route'

// A campaign's encounters (DND-031). Authority lives in the data layer's
// queries; these tests pin the status matrix, that the session user is who
// reaches the scoped calls, and that a foreign campaign stays a 404.
//
// Plus the builder's seed (`dm-prep-suite/encounter-builder`): a create may
// arrive carrying the party and the monster lines, and the order and shape of
// the adds that follow are what the tracker inherits.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignForDm: jest.fn(),
}))

jest.mock('@/lib/db/encounters', () => ({
  createEncounter: jest.fn(),
  listEncounters: jest.fn(),
  addCharacterCombatants: jest.fn(),
  addMonsterCombatants: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  addCharacterCombatants,
  addMonsterCombatants,
  createEncounter,
  listEncounters,
  type Encounter,
} from '@/lib/db/encounters'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockGetCampaignForDm = getCampaignForDm as jest.MockedFunction<typeof getCampaignForDm>
const mockCreateEncounter = createEncounter as jest.MockedFunction<typeof createEncounter>
const mockListEncounters = listEncounters as jest.MockedFunction<typeof listEncounters>
const mockAddCharacters = addCharacterCombatants as jest.MockedFunction<
  typeof addCharacterCombatants
>
const mockAddMonsters = addMonsterCombatants as jest.MockedFunction<typeof addMonsterCombatants>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '11111111-1111-4111-8111-111111111111'

const ENCOUNTER: Encounter = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  name: 'Ambush at the bridge',
  round: 1,
  activeTurn: 0,
  shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  completedAt: null,
  createdAt: new Date('2026-08-15T12:00:00.000Z'),
  updatedAt: new Date('2026-08-15T12:00:00.000Z'),
}

const params = Promise.resolve({ id: CAMPAIGN_ID })

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
  mockGetCampaignForDm.mockResolvedValue({ id: CAMPAIGN_ID } as unknown as Awaited<
    ReturnType<typeof getCampaignForDm>
  >)
  mockListEncounters.mockResolvedValue([ENCOUNTER])
  mockCreateEncounter.mockResolvedValue(ENCOUNTER)
  mockAddCharacters.mockClear()
  mockAddMonsters.mockClear()
  mockAddCharacters.mockResolvedValue([])
  mockAddMonsters.mockResolvedValue([])
})

describe('GET /api/campaigns/[id]/encounters', () => {
  it('answers 401 when signed out', async () => {
    const response = await GET({} as Request, { params })

    expect(response.status).toBe(401)
    expect(mockListEncounters).not.toHaveBeenCalled()
  })

  it('answers 404 for a campaign someone else runs, before listing anything', async () => {
    signedIn()
    mockGetCampaignForDm.mockResolvedValue(null)

    const response = await GET({} as Request, { params })

    expect(response.status).toBe(404)
    expect(mockListEncounters).not.toHaveBeenCalled()
  })

  it('lists the campaign’s encounters, scoped to the session user', async () => {
    signedIn()

    const response = await GET({} as Request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListEncounters).toHaveBeenCalledWith(DM, CAMPAIGN_ID)
    expect(body.encounters).toEqual([ENCOUNTER])
  })
})

describe('POST /api/campaigns/[id]/encounters', () => {
  it('answers 401 when signed out', async () => {
    const response = await POST(jsonRequest({ name: 'Ambush' }), { params })

    expect(response.status).toBe(401)
    expect(mockCreateEncounter).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ name: 'Ambush' }), { params })

    expect(response.status).toBe(503)
  })

  it('refuses a blank name', async () => {
    signedIn()

    const response = await POST(jsonRequest({ name: '   ' }), { params })

    expect(response.status).toBe(400)
    expect(mockCreateEncounter).not.toHaveBeenCalled()
  })

  it('refuses a non-JSON body', async () => {
    signedIn()

    const response = await POST(
      { json: async () => Promise.reject(new Error('nope')) } as unknown as Request,
      { params },
    )

    expect(response.status).toBe(400)
  })

  it('creates the encounter scoped to the session user and answers 201', async () => {
    signedIn()

    const response = await POST(jsonRequest({ name: 'Ambush at the bridge' }), { params })
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockCreateEncounter).toHaveBeenCalledWith(DM, CAMPAIGN_ID, 'Ambush at the bridge')
    expect(body.encounter).toEqual(ENCOUNTER)
  })

  it('answers 404 when the campaign is not the session user’s to run', async () => {
    signedIn()
    mockCreateEncounter.mockResolvedValue(null)

    const response = await POST(jsonRequest({ name: 'Ambush' }), { params })

    expect(response.status).toBe(404)
  })

  it('adds nothing when the create carries no seed', async () => {
    signedIn()

    await POST(jsonRequest({ name: 'Ambush' }), { params })

    expect(mockAddCharacters).not.toHaveBeenCalled()
    expect(mockAddMonsters).not.toHaveBeenCalled()
  })

  it('seeds the party and each monster line into the encounter it just made', async () => {
    signedIn()
    const calls: string[] = []
    mockAddCharacters.mockImplementation(async () => {
      calls.push('party')
      return []
    })
    mockAddMonsters.mockImplementation(async (_dm, _id, input) => {
      calls.push(input.monsterIndex)
      return []
    })

    const response = await POST(
      jsonRequest({
        name: 'Ambush at the bridge',
        characterIds: [CHARACTER_ID],
        monsters: [
          { monsterIndex: 'goblin-warrior', name: 'Goblin Warrior', count: 4, maxHitPoints: 7 },
          { monsterIndex: 'ogre', name: 'Ogre', count: 1, maxHitPoints: 68 },
        ],
      }),
      { params },
    )

    expect(response.status).toBe(201)
    expect(mockAddCharacters).toHaveBeenCalledWith(DM, ENCOUNTER.id, [CHARACTER_ID])
    expect(mockAddMonsters).toHaveBeenCalledWith(DM, ENCOUNTER.id, {
      monsterIndex: 'goblin-warrior',
      name: 'Goblin Warrior',
      count: 4,
      maxHitPoints: 7,
    })
    // The party first, then the lines in the order the builder listed them —
    // that ordering is the tracker's insertion order before initiative is rolled.
    expect(calls).toEqual(['party', 'goblin-warrior', 'ogre'])
  })

  it('never seeds a campaign it could not create in', async () => {
    signedIn()
    mockCreateEncounter.mockResolvedValue(null)

    const response = await POST(
      jsonRequest({
        name: 'Ambush',
        characterIds: [CHARACTER_ID],
        monsters: [{ monsterIndex: 'ogre', name: 'Ogre', count: 1, maxHitPoints: 68 }],
      }),
      { params },
    )

    expect(response.status).toBe(404)
    expect(mockAddCharacters).not.toHaveBeenCalled()
    expect(mockAddMonsters).not.toHaveBeenCalled()
  })

  it('refuses a seed the data layer would have to clamp', async () => {
    signedIn()

    const tooMany = await POST(
      jsonRequest({
        name: 'Ambush',
        monsters: [{ monsterIndex: 'ogre', name: 'Ogre', count: 40, maxHitPoints: 68 }],
      }),
      { params },
    )

    expect(tooMany.status).toBe(400)
    expect(mockCreateEncounter).not.toHaveBeenCalled()

    const notACharacter = await POST(
      jsonRequest({ name: 'Ambush', characterIds: ['not-a-uuid'] }),
      { params },
    )

    expect(notACharacter.status).toBe(400)
    expect(mockCreateEncounter).not.toHaveBeenCalled()
  })
})
