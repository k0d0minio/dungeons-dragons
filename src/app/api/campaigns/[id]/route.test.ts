import { GET } from './route'

// The glance's poll (DND-030, D25). Authority lives in the data layer's
// query; what these tests pin is the status matrix and that the roster it
// answers is the one the scoped read returned.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignRoster: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockGetCampaignRoster = getCampaignRoster as jest.MockedFunction<typeof getCampaignRoster>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const ROSTER = {
  campaign: { id: ID, name: 'The Rime of the Frostmaiden' },
  members: [],
  characters: [{ id: 'char-1', name: 'Vex Ashbrand' }],
} as unknown as Awaited<ReturnType<typeof getCampaignRoster>>

const params = Promise.resolve({ id: ID })
const request = {} as unknown as Request

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockGetCampaignRoster.mockResolvedValue(ROSTER)
})

describe('GET /api/campaigns/[id]', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await GET(request, { params })

    expect(response.status).toBe(401)
    expect(mockGetCampaignRoster).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await GET(request, { params })

    expect(response.status).toBe(503)
  })

  it('answers the roster, scoped to the session user', async () => {
    signedIn()

    const response = await GET(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetCampaignRoster).toHaveBeenCalledWith(DM, ID)
    expect(body.characters).toHaveLength(1)
  })

  it('answers 404 for a campaign someone else runs — same as one that never existed', async () => {
    signedIn()
    mockGetCampaignRoster.mockResolvedValue(null)

    const response = await GET(request, { params })

    expect(response.status).toBe(404)
  })
})
