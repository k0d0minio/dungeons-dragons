import { GET } from './route'

// The picture of whatever is on the table screen (`dm-run-suite/table-screen-cast`).
//
// The serving itself is `src/lib/images/slot.ts` and is tested there. What this
// file pins is why the route is shaped the way it is: **no entity in the URL**.
// The only bytes it can serve are those attached to what the DM has currently
// cast, so an unrevealed handout is not one guessed id away — it is not
// addressable here at all. A future edit that took an id from the path and
// passed it to a loader would compile and would undo that.
jest.mock('@/lib/db/table', () => ({
  loadSpotlightImage: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

jest.mock('@/lib/images/slot', () => ({
  serveSlotImage: jest.fn(),
}))

import { isDatabaseConfigured } from '@/lib/db/client'
import { loadSpotlightImage } from '@/lib/db/table'
import { serveSlotImage } from '@/lib/images/slot'

const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>
const mockServe = serveSlotImage as jest.MockedFunction<typeof serveSlotImage>
const mockLoad = loadSpotlightImage as jest.MockedFunction<typeof loadSpotlightImage>

const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

const params = Promise.resolve({ token: TOKEN })
const request = {} as Request

/** The slot the route handed the verb it called. */
function servedSlot() {
  return mockServe.mock.calls[0]?.[0] as {
    noun: string
    load: () => unknown
    set: (image: unknown) => unknown
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockServe.mockResolvedValue({ status: 200 } as Response)
})

describe('GET /api/table/[token]/image', () => {
  it('serves without a session at all — the token is the credential', async () => {
    const response = await GET(request, { params })

    expect(response.status).toBe(200)
    expect(mockServe).toHaveBeenCalledTimes(1)
  })

  it('loads through the spotlight, which is the whole gate', async () => {
    await GET(request, { params })

    servedSlot().load()

    // The token, and nothing else. There is no id for a caller to substitute.
    expect(mockLoad).toHaveBeenCalledWith(TOKEN)
  })

  it('says so when the app has no database', async () => {
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(request, { params })).status).toBe(503)
    expect(mockServe).not.toHaveBeenCalled()
  })

  it('cannot be written through', async () => {
    await GET(request, { params })

    expect(() => servedSlot().set(null)).toThrow(/cannot change a picture/)
  })
})
