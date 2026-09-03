import { PUT } from './route'

// The place reveal switch's endpoint (`dm-run-suite/reveal-controls`). The
// handler is shared and its shape is settled in the NPC suite next door; what
// matters here is that this route is wired to *this* entity, and that a place
// in someone else's campaign is a miss rather than a 403.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/locations', () => ({
  setLocationRevealed: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setLocationRevealed } from '@/lib/db/locations'
import type { CampaignLocation } from '@/lib/db/schema'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetRevealed = setLocationRevealed as jest.MockedFunction<typeof setLocationRevealed>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const LOCATION_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const REVEALED: CampaignLocation = {
  id: LOCATION_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: new Date('2026-09-03T19:00:00.000Z'),
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T19:00:00.000Z'),
  name: 'Kelp Harbour',
  summary: 'A fishing village with no fishermen left',
  description: null,
  secrets: null,
  dmNotes: null,
}

const params = Promise.resolve({ id: CAMPAIGN_ID, locationId: LOCATION_ID })

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

describe('PUT /api/campaigns/[id]/locations/[locationId]/reveal', () => {
  it('401s without a session, before anything is revealed', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PUT(jsonRequest({ revealed: true }), { params })).status).toBe(401)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('400s a body that does not say which way the switch went', async () => {
    signedIn()

    expect((await PUT(jsonRequest({}), { params })).status).toBe(400)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('reveals and un-reveals this place, scoped to the session user', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(REVEALED)

    const response = await PUT(jsonRequest({ revealed: true }), { params })

    expect(mockSetRevealed).toHaveBeenCalledWith(DM, CAMPAIGN_ID, LOCATION_ID, true)
    expect(await response.json()).toEqual({ location: REVEALED })

    mockSetRevealed.mockResolvedValue({ ...REVEALED, revealedAt: null })
    expect((await PUT(jsonRequest({ revealed: false }), { params })).status).toBe(200)
    expect(mockSetRevealed).toHaveBeenLastCalledWith(DM, CAMPAIGN_ID, LOCATION_ID, false)
  })

  it('404s a place in someone else’s campaign — never 403', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ revealed: true }), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No such location' })
  })
})
