import { GET } from './route'

// A revealed handout's picture, for a player (`dm-run-suite/player-campaign-view`).
//
// The serving itself is `src/lib/images/slot.ts` and is tested there. What this
// file pins is the reason this route exists separately from the DM's one: the
// slot it builds loads through `loadDiscoveredHandoutImage`, which is the
// function that carries membership *and* `revealed_at is not null`. Wiring this
// route to the DM loader would compile, pass every other test in the repo, and
// hand the party every unrevealed handout in the campaign.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/discovered', () => ({
  loadDiscoveredHandoutImage: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

jest.mock('@/lib/images/slot', () => ({
  serveSlotImage: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadDiscoveredHandoutImage } from '@/lib/db/discovered'
import { serveSlotImage } from '@/lib/images/slot'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>
const mockServe = serveSlotImage as jest.MockedFunction<typeof serveSlotImage>
const mockLoad = loadDiscoveredHandoutImage as jest.MockedFunction<
  typeof loadDiscoveredHandoutImage
>

const PLAYER = 'user_9zQw1nBvRt'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const HANDOUT_ID = '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f'

const params = Promise.resolve({ id: CAMPAIGN_ID, handoutId: HANDOUT_ID })
const request = {} as Request

/** The slot the route handed the verb it called. */
function servedSlot() {
  return mockServe.mock.calls[0]?.[0] as {
    noun: string
    campaignId: string
    key: string
    load: () => unknown
    set: (image: unknown) => unknown
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockGetSessionUser.mockResolvedValue({ id: PLAYER } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
  mockServe.mockResolvedValue({ status: 200 } as Response)
})

describe('GET', () => {
  it('refuses a signed-out request before it touches the database', async () => {
    mockGetSessionUser.mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof getSessionUser>>,
    )

    const response = await GET(request, { params })

    expect(response.status).toBe(401)
    expect(mockServe).not.toHaveBeenCalled()
  })

  it('says so when the app has no database', async () => {
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(request, { params })).status).toBe(503)
    expect(mockServe).not.toHaveBeenCalled()
  })

  it('loads through the member-scoped, revealed-only read', async () => {
    await GET(request, { params })

    servedSlot().load()

    // The whole point of the route: this loader, with the session's own id.
    expect(mockLoad).toHaveBeenCalledWith(PLAYER, CAMPAIGN_ID, HANDOUT_ID)
  })

  it('names this handout and no other row', async () => {
    await GET(request, { params })

    const slot = servedSlot()

    expect(slot.noun).toBe('handout')
    expect(slot.campaignId).toBe(CAMPAIGN_ID)
    expect(slot.key).toBe(`handouts/${HANDOUT_ID}`)
  })
})

describe('the player slot', () => {
  it('cannot be written through', async () => {
    // Read-only surface. If a future edit wires a write verb to this slot it
    // fails loudly here, rather than silently discarding a DM's upload.
    await GET(request, { params })

    expect(() => servedSlot().set(null)).toThrow(/cannot change a handout image/)
  })
})
