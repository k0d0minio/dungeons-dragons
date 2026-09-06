import { PUT } from './route'

// Closing a campaign (`first-table/one-night-campaign`). What these pin is the
// order of the two writes — the recap before the stamp, so a failure between
// them leaves something the DM can press again — and that an empty recap is
// the second press rather than a 400.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  closeCampaign: jest.fn(),
}))

jest.mock('@/lib/db/notes', () => ({
  publishSessionRecap: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { closeCampaign, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { publishSessionRecap, type CampaignNote } from '@/lib/db/notes'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCloseCampaign = closeCampaign as jest.MockedFunction<typeof closeCampaign>
const mockPublish = publishSessionRecap as jest.MockedFunction<typeof publishSessionRecap>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const CLOSED: Campaign = {
  id: ID,
  dmUserId: DM,
  name: 'The Tutorial',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: null,
  closedAt: new Date('2026-09-10T22:30:00.000Z'),
  sessionZero: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-09-10T22:30:00.000Z'),
}

const RECAP: CampaignNote = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: ID,
  sessionDate: '2026-09-10',
  body: 'You met Halda. The lighthouse was lit.',
  sharedWithPlayers: true,
  sessionClosedAt: new Date('2026-09-10T22:30:00.000Z'),
  createdAt: new Date('2026-09-10T22:30:00.000Z'),
  updatedAt: new Date('2026-09-10T22:30:00.000Z'),
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
  mockCloseCampaign.mockResolvedValue(CLOSED)
  mockPublish.mockResolvedValue(RECAP)
})

describe('PUT /api/campaigns/[id]/close', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await PUT(body({ recap: 'x' }), { params })

    expect(response.status).toBe(401)
    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockCloseCampaign).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await PUT(body({ recap: 'x' }), { params })

    expect(response.status).toBe(503)
    expect(mockCloseCampaign).not.toHaveBeenCalled()
  })

  it('answers 400 when the body is not JSON, or the recap is not a string', async () => {
    signedIn()
    const broken = {
      json: async () => {
        throw new Error('Unexpected token')
      },
    } as unknown as Request

    expect((await PUT(broken, { params })).status).toBe(400)
    expect((await PUT(body({ recap: 42 }), { params })).status).toBe(400)
    expect((await PUT(body({ recap: 'x'.repeat(20_001) }), { params })).status).toBe(400)
    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockCloseCampaign).not.toHaveBeenCalled()
  })

  it('publishes the recap first, then closes, and answers with the campaign', async () => {
    signedIn()
    const order: string[] = []
    mockPublish.mockImplementation(async () => {
      order.push('publish')
      return RECAP
    })
    mockCloseCampaign.mockImplementation(async () => {
      order.push('close')
      return CLOSED
    })

    const response = await PUT(body({ recap: '  You met Halda.  ' }), { params })
    const answered = await response.json()

    expect(response.status).toBe(200)
    expect(order).toEqual(['publish', 'close'])
    // Trimmed before the data layer sees it, and scoped to the session user.
    expect(mockPublish).toHaveBeenCalledWith(DM, ID, 'You met Halda.')
    expect(mockCloseCampaign).toHaveBeenCalledWith(DM, ID)
    expect(answered.campaign).toEqual(CLOSED)
  })

  it('closes without publishing when the recap is empty or absent — the second press', async () => {
    signedIn()

    expect((await PUT(body({}), { params })).status).toBe(200)
    expect((await PUT(body({ recap: '   ' }), { params })).status).toBe(200)

    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockCloseCampaign).toHaveBeenCalledTimes(2)
  })

  it('answers 404 for a campaign someone else runs, before closing anything', async () => {
    signedIn()
    mockPublish.mockResolvedValue(null)

    const response = await PUT(body({ recap: 'x' }), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No such campaign' })
    expect(mockCloseCampaign).not.toHaveBeenCalled()
  })

  it('answers 404 when the close itself misses', async () => {
    signedIn()
    mockCloseCampaign.mockResolvedValue(null)

    expect((await PUT(body({}), { params })).status).toBe(404)
  })
})
