import { PUT } from './route'

// The DM's feature switches (`dm-prep-suite/campaign-feature-gates`).
// Authority lives in the query — the data layer folds `dm_user_id` into the
// WHERE clause — so what these tests pin is who reaches it, that a miss stays
// a 404, and that the body is filtered before it reaches the column.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  setCampaignGates: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { setCampaignGates, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetCampaignGates = setCampaignGates as jest.MockedFunction<typeof setCampaignGates>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const GATED: Campaign = {
  id: ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: { conditions: true },
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-15T09:00:00.000Z'),
}

const params = Promise.resolve({ id: ID })

function body(payload: unknown): Request {
  return { json: async () => payload } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockSetCampaignGates.mockResolvedValue(GATED)
})

describe('PUT /api/campaigns/[id]/gates', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await PUT(body({ gates: {} }), { params })

    expect(response.status).toBe(401)
    expect(mockSetCampaignGates).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await PUT(body({ gates: {} }), { params })

    expect(response.status).toBe(503)
    expect(mockSetCampaignGates).not.toHaveBeenCalled()
  })

  it('writes the switches scoped to the session user and answers with the row', async () => {
    signedIn()

    const response = await PUT(body({ gates: { conditions: true } }), { params })
    const answered = await response.json()

    expect(response.status).toBe(200)
    expect(mockSetCampaignGates).toHaveBeenCalledWith(DM, ID, { conditions: true })
    expect(answered.campaign.gates).toEqual({ conditions: true })
  })

  it('drops a key this build does not know rather than refusing the DM their switches', async () => {
    signedIn()

    await PUT(body({ gates: { conditions: true, telepathy: true, currency: 'yes' } }), { params })

    expect(mockSetCampaignGates).toHaveBeenCalledWith(DM, ID, { conditions: true })
  })

  it('accepts an empty object — turning everything off is a thing a DM does', async () => {
    signedIn()

    const response = await PUT(body({ gates: {} }), { params })

    expect(response.status).toBe(200)
    expect(mockSetCampaignGates).toHaveBeenCalledWith(DM, ID, {})
  })

  it('answers 400 for a body with no gates at all — that is a client bug, not a choice', async () => {
    signedIn()

    const response = await PUT(body({ name: 'Renamed' }), { params })

    expect(response.status).toBe(400)
    expect(mockSetCampaignGates).not.toHaveBeenCalled()
  })

  it('answers 400 when the body is not JSON', async () => {
    signedIn()
    const broken = {
      json: async () => {
        throw new Error('Unexpected token')
      },
    } as unknown as Request

    const response = await PUT(broken, { params })

    expect(response.status).toBe(400)
    expect(mockSetCampaignGates).not.toHaveBeenCalled()
  })

  it('answers 404 for a campaign someone else runs — same as one that never existed', async () => {
    signedIn()
    mockSetCampaignGates.mockResolvedValue(null)

    const response = await PUT(body({ gates: { currency: true } }), { params })

    expect(response.status).toBe(404)
  })
})
