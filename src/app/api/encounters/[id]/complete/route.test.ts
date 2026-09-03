import { PUT } from './route'

// The "end fight" endpoint (`dm-run-suite/session-log-recap`).
//
// What this suite is here to hold up is that ending a fight is its own act:
// its own route, its own body shape, idempotent both ways, and never a delete.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/encounters', () => ({
  setEncounterCompleted: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setEncounterCompleted, type Encounter } from '@/lib/db/encounters'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetCompleted = setEncounterCompleted as jest.MockedFunction<typeof setEncounterCompleted>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const ENDED: Encounter = {
  id: ENCOUNTER_ID,
  campaignId: CAMPAIGN_ID,
  name: 'Ambush at the ford',
  round: 4,
  activeTurn: 0,
  shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  completedAt: new Date('2026-09-03T21:10:00.000Z'),
  createdAt: new Date('2026-09-03T19:00:00.000Z'),
  updatedAt: new Date('2026-09-03T21:10:00.000Z'),
}

const params = Promise.resolve({ id: ENCOUNTER_ID })

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockIsDatabaseConfigured.mockReturnValue(true)
})

describe('PUT /api/encounters/[id]/complete', () => {
  it('401s without a session, before anything is written', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ completed: true }), { params })

    expect(response.status).toBe(401)
    expect(mockSetCompleted).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await PUT(jsonRequest({ completed: true }), { params })

    expect(response.status).toBe(503)
    expect(mockSetCompleted).not.toHaveBeenCalled()
  })

  it('ends the fight and answers with the stamped encounter', async () => {
    signedIn()
    mockSetCompleted.mockResolvedValue(ENDED)

    const response = await PUT(jsonRequest({ completed: true }), { params })

    expect(mockSetCompleted).toHaveBeenCalledWith(DM, ENCOUNTER_ID, true)
    expect(response.status).toBe(200)

    const payload = (await response.json()) as { encounter: Encounter }
    expect(payload.encounter.id).toBe(ENCOUNTER_ID)
    expect(payload.encounter.completedAt).not.toBeNull()
    // The fight itself is untouched: the round it ended on comes back as it was.
    expect(payload.encounter.round).toBe(4)
  })

  it('reopens a fight when asked the other way — the same route', async () => {
    signedIn()
    mockSetCompleted.mockResolvedValue({ ...ENDED, completedAt: null })

    await PUT(jsonRequest({ completed: false }), { params })

    expect(mockSetCompleted).toHaveBeenCalledWith(DM, ENCOUNTER_ID, false)
  })

  it('400s on a body that does not say which way the switch went', async () => {
    signedIn()

    const response = await PUT(jsonRequest({ over: 'yes' }), { params })

    expect(response.status).toBe(400)
    expect(mockSetCompleted).not.toHaveBeenCalled()
  })

  it('400s on a body that is not JSON at all', async () => {
    signedIn()

    const response = await PUT(
      {
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Request,
      { params },
    )

    expect(response.status).toBe(400)
    expect(mockSetCompleted).not.toHaveBeenCalled()
  })

  it('404s for an encounter this DM does not run — never 403', async () => {
    signedIn()
    mockSetCompleted.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ completed: true }), { params })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'No such encounter' })
  })
})
