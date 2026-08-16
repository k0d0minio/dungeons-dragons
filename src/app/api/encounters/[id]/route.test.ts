import { DELETE, GET, PATCH } from './route'

// One encounter (DND-031). Authority is in the data layer's WHERE clause;
// these tests pin the status matrix and the strict PATCH shape.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/encounters', () => ({
  deleteEncounter: jest.fn(),
  getEncounterForDm: jest.fn(),
  patchEncounter: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  deleteEncounter,
  getEncounterForDm,
  patchEncounter,
  type Encounter,
} from '@/lib/db/encounters'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockGetEncounterForDm = getEncounterForDm as jest.MockedFunction<typeof getEncounterForDm>
const mockPatchEncounter = patchEncounter as jest.MockedFunction<typeof patchEncounter>
const mockDeleteEncounter = deleteEncounter as jest.MockedFunction<typeof deleteEncounter>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const ENCOUNTER: Encounter = {
  id: ID,
  campaignId: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  name: 'Ambush at the bridge',
  round: 2,
  activeTurn: 0,
  shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  createdAt: new Date('2026-08-15T12:00:00.000Z'),
  updatedAt: new Date('2026-08-15T12:00:00.000Z'),
}

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
  mockGetEncounterForDm.mockResolvedValue({ encounter: ENCOUNTER, combatants: [] })
  mockPatchEncounter.mockResolvedValue(ENCOUNTER)
  mockDeleteEncounter.mockResolvedValue(true)
})

describe('GET /api/encounters/[id]', () => {
  it('answers 401 when signed out', async () => {
    const response = await GET({} as Request, { params })

    expect(response.status).toBe(401)
    expect(mockGetEncounterForDm).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await GET({} as Request, { params })

    expect(response.status).toBe(503)
  })

  it('answers the encounter and combatants, scoped to the session user', async () => {
    signedIn()

    const response = await GET({} as Request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetEncounterForDm).toHaveBeenCalledWith(DM, ID)
    expect(body.encounter).toEqual(ENCOUNTER)
    expect(body.combatants).toEqual([])
  })

  it('answers 404 for an encounter someone else runs', async () => {
    signedIn()
    mockGetEncounterForDm.mockResolvedValue(null)

    const response = await GET({} as Request, { params })

    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/encounters/[id]', () => {
  it('steps round and turn through the scoped data layer', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ round: 2, activeTurn: 0 }), { params })

    expect(response.status).toBe(200)
    expect(mockPatchEncounter).toHaveBeenCalledWith(DM, ID, { round: 2, activeTurn: 0 })
  })

  it('refuses a field the tracker does not send', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ shareToken: 'stolen' }), { params })

    expect(response.status).toBe(400)
    expect(mockPatchEncounter).not.toHaveBeenCalled()
  })

  it('refuses an empty patch', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({}), { params })

    expect(response.status).toBe(400)
  })

  it('answers 404 for an encounter someone else runs', async () => {
    signedIn()
    mockPatchEncounter.mockResolvedValue(null)

    const response = await PATCH(jsonRequest({ round: 3 }), { params })

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/encounters/[id]', () => {
  it('deletes scoped to the session user', async () => {
    signedIn()

    const response = await DELETE({} as Request, { params })

    expect(response.status).toBe(200)
    expect(mockDeleteEncounter).toHaveBeenCalledWith(DM, ID)
  })

  it('answers 404 when there was nothing this user could delete', async () => {
    signedIn()
    mockDeleteEncounter.mockResolvedValue(false)

    const response = await DELETE({} as Request, { params })

    expect(response.status).toBe(404)
  })
})
