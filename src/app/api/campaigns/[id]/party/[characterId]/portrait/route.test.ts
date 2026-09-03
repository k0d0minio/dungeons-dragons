import { GET } from './route'

// A party member's portrait (`dm-run-suite/player-campaign-view`).
//
// `characters.portrait` has no reveal switch, so what makes this route safe is
// entirely `loadPartyPortrait`: the character must be on this campaign's roster
// and the asker must sit at the same table. This file pins that the route uses
// that loader, with the session's own id, and that nothing here can write.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/discovered', () => ({
  loadPartyPortrait: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

jest.mock('@/lib/images/slot', () => ({
  serveSlotImage: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadPartyPortrait } from '@/lib/db/discovered'
import { serveSlotImage } from '@/lib/images/slot'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>
const mockServe = serveSlotImage as jest.MockedFunction<typeof serveSlotImage>
const mockLoad = loadPartyPortrait as jest.MockedFunction<typeof loadPartyPortrait>

const PLAYER = 'user_9zQw1nBvRt'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c'

const params = Promise.resolve({ id: CAMPAIGN_ID, characterId: CHARACTER_ID })
const request = {} as Request

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

    expect((await GET(request, { params })).status).toBe(401)
    expect(mockServe).not.toHaveBeenCalled()
  })

  it('says so when the app has no database', async () => {
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(request, { params })).status).toBe(503)
    expect(mockServe).not.toHaveBeenCalled()
  })

  it('loads through the roster-scoped read, as the signed-in player', async () => {
    await GET(request, { params })

    servedSlot().load()

    expect(mockLoad).toHaveBeenCalledWith(PLAYER, CAMPAIGN_ID, CHARACTER_ID)
  })

  it('names this character and no other row', async () => {
    await GET(request, { params })

    const slot = servedSlot()

    expect(slot.noun).toBe('character')
    expect(slot.campaignId).toBe(CAMPAIGN_ID)
    expect(slot.key).toBe(`characters/${CHARACTER_ID}`)
  })
})

describe('the party slot', () => {
  it('cannot be written through', async () => {
    // Nothing writes this column yet, and where a player edits their own face
    // is a later ticket's judgment. It will not be this endpoint.
    await GET(request, { params })

    expect(() => servedSlot().set(null)).toThrow(/cannot change a portrait/)
  })
})
