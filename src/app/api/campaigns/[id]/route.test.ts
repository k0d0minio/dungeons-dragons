import { GET, PATCH } from './route'

// The glance's poll (DND-030, D25). Authority lives in the data layer's
// query; what these tests pin is the status matrix and that the roster it
// answers is the one the scoped read returned.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignRoster: jest.fn(),
  renameCampaign: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { getCampaignRoster, renameCampaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockGetCampaignRoster = getCampaignRoster as jest.MockedFunction<typeof getCampaignRoster>
const mockRenameCampaign = renameCampaign as jest.MockedFunction<typeof renameCampaign>
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
  mockRenameCampaign.mockResolvedValue({
    id: ID,
    name: 'The Thursday Table',
  } as unknown as Awaited<ReturnType<typeof renameCampaign>>)
})

/** A JSON PATCH body, as the settings sheet's rename form sends one. */
function patch(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

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

// The rename the settings page's first row posts to
// (`dm-chronology/campaign-settings`). The write itself is DM-scoped in the
// data layer; what is pinned here is the status matrix and that a name is
// validated before it reaches a column.
describe('PATCH /api/campaigns/[id]', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await PATCH(patch({ name: 'Anything' }), { params })

    expect(response.status).toBe(401)
    expect(mockRenameCampaign).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await PATCH(patch({ name: 'Anything' }), { params })

    expect(response.status).toBe(503)
    expect(mockRenameCampaign).not.toHaveBeenCalled()
  })

  it('renames the campaign, scoped to the session user', async () => {
    signedIn()

    const response = await PATCH(patch({ name: '  The Thursday Table  ' }), { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    // Trimmed by the schema before the data layer ever sees it.
    expect(mockRenameCampaign).toHaveBeenCalledWith(DM, ID, 'The Thursday Table')
    expect(body.campaign.name).toBe('The Thursday Table')
  })

  it('refuses an empty name with the message the form shows', async () => {
    signedIn()

    const response = await PATCH(patch({ name: '   ' }), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Give the campaign a name')
    expect(mockRenameCampaign).not.toHaveBeenCalled()
  })

  it('refuses a name past the same ceiling creation enforces', async () => {
    signedIn()

    const response = await PATCH(patch({ name: 'x'.repeat(121) }), { params })

    expect(response.status).toBe(400)
    expect(mockRenameCampaign).not.toHaveBeenCalled()
  })

  it('refuses a body that is not JSON', async () => {
    signedIn()

    const response = await PATCH(
      {
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Request,
      { params },
    )

    expect(response.status).toBe(400)
  })

  it("answers 404 for a campaign someone else runs — the player's write is a miss, not a 403", async () => {
    signedIn()
    mockRenameCampaign.mockResolvedValue(null)

    const response = await PATCH(patch({ name: 'Mine now' }), { params })

    expect(response.status).toBe(404)
  })
})
