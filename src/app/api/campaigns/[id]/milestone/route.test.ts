import { PUT } from './route'

// The DM's milestone control (D35, `dm-run-suite/milestone-leveling`).
// Authority lives in the query — the data layer folds `dm_user_id` into the
// WHERE clause — so what these tests pin is who reaches it, that a miss stays a
// 404, and that a level off the 1–20 table is refused rather than clamped: the
// cost of clamping is five phones told to level up thirteen times.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  setCampaignMilestone: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { setCampaignMilestone, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetCampaignMilestone = setCampaignMilestone as jest.MockedFunction<
  typeof setCampaignMilestone
>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const CALLED: Campaign = {
  id: ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: 4,
  closedAt: null,
  sessionZero: null,
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
  mockSetCampaignMilestone.mockResolvedValue(CALLED)
})

describe('PUT /api/campaigns/[id]/milestone', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await PUT(body({ milestoneLevel: 4 }), { params })

    expect(response.status).toBe(401)
    expect(mockSetCampaignMilestone).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await PUT(body({ milestoneLevel: 4 }), { params })

    expect(response.status).toBe(503)
    expect(mockSetCampaignMilestone).not.toHaveBeenCalled()
  })

  it('writes the level scoped to the session user and answers with the row', async () => {
    signedIn()

    const response = await PUT(body({ milestoneLevel: 4 }), { params })
    const answered = await response.json()

    expect(response.status).toBe(200)
    expect(mockSetCampaignMilestone).toHaveBeenCalledWith(DM, ID, 4)
    expect(answered.campaign.milestoneLevel).toBe(4)
  })

  it('stores null — a table going back to XP has to be able to say so', async () => {
    signedIn()
    mockSetCampaignMilestone.mockResolvedValue({ ...CALLED, milestoneLevel: null })

    const response = await PUT(body({ milestoneLevel: null }), { params })

    expect(response.status).toBe(200)
    expect(mockSetCampaignMilestone).toHaveBeenCalledWith(DM, ID, null)
  })

  it('refuses a level off the table rather than clamping it into range', async () => {
    signedIn()

    for (const level of [0, 21, 4.5, '4']) {
      const response = await PUT(body({ milestoneLevel: level }), { params })
      expect(response.status).toBe(400)
    }

    expect(mockSetCampaignMilestone).not.toHaveBeenCalled()
  })

  it('answers 400 for a body with no milestoneLevel at all — a client bug', async () => {
    signedIn()

    const response = await PUT(body({ name: 'Renamed' }), { params })

    expect(response.status).toBe(400)
    expect(mockSetCampaignMilestone).not.toHaveBeenCalled()
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
    expect(mockSetCampaignMilestone).not.toHaveBeenCalled()
  })

  it('answers 404 for a campaign someone else runs — same as one that never existed', async () => {
    signedIn()
    mockSetCampaignMilestone.mockResolvedValue(null)

    const response = await PUT(body({ milestoneLevel: 4 }), { params })

    expect(response.status).toBe(404)
  })
})
