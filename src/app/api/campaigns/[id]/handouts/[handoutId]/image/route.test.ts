import { DELETE, GET, POST } from './route'

// A handout's picture (`dm-prep-suite/locations-handouts`).
//
// The verbs themselves are `src/lib/images/slot.ts` and are tested there; what
// this file pins is the reason the route exists at all — **the bytes of a
// private blob are reachable only through a session check and a DM-scoped
// read** — and that the slot it builds names this handout's column and no
// other row's.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/handouts', () => ({
  loadHandoutImage: jest.fn(),
  setHandoutImage: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

jest.mock('@/lib/images/slot', () => ({
  serveSlotImage: jest.fn(),
  attachSlotImage: jest.fn(),
  clearSlotImage: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadHandoutImage, setHandoutImage, type HandoutForDm } from '@/lib/db/handouts'
import { attachSlotImage, clearSlotImage, serveSlotImage } from '@/lib/images/slot'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>
const mockServe = serveSlotImage as jest.MockedFunction<typeof serveSlotImage>
const mockAttach = attachSlotImage as jest.MockedFunction<typeof attachSlotImage>
const mockClear = clearSlotImage as jest.MockedFunction<typeof clearSlotImage>
const mockLoad = loadHandoutImage as jest.MockedFunction<typeof loadHandoutImage>
const mockSet = setHandoutImage as jest.MockedFunction<typeof setHandoutImage>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const HANDOUT_ID = '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f'

const HANDOUT = { id: HANDOUT_ID, title: 'A letter' } as unknown as HandoutForDm

const params = Promise.resolve({ id: CAMPAIGN_ID, handoutId: HANDOUT_ID })

const request = {} as Request

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

/** The slot the route handed the verb it called. */
function slotFrom(mock: { mock: { calls: unknown[][] } }, at: number) {
  return mock.mock.calls[0]?.[at] as {
    noun: string
    campaignId: string
    key: string
    load: () => unknown
    set: (image: unknown) => unknown
  }
}

beforeEach(() => {
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockServe.mockResolvedValue({ status: 200 } as Response)
  mockAttach.mockResolvedValue({ entity: HANDOUT })
  mockClear.mockResolvedValue({ entity: HANDOUT })
})

describe('the session wall', () => {
  it('401s every verb without a session, before any row is read', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await GET(request, { params })).status).toBe(401)
    expect((await POST(request, { params })).status).toBe(401)
    expect((await DELETE(request, { params })).status).toBe(401)

    expect(mockServe).not.toHaveBeenCalled()
    expect(mockAttach).not.toHaveBeenCalled()
    expect(mockClear).not.toHaveBeenCalled()
  })

  it('503s every verb when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(request, { params })).status).toBe(503)
    expect((await POST(request, { params })).status).toBe(503)
    expect((await DELETE(request, { params })).status).toBe(503)
  })
})

describe('GET', () => {
  it('serves the slot for this handout, read as the session user', async () => {
    signedIn()

    await GET(request, { params })

    const slot = slotFrom(mockServe, 0)
    expect(slot.noun).toBe('handout')
    expect(slot.campaignId).toBe(CAMPAIGN_ID)
    expect(slot.key).toBe(`handouts/${HANDOUT_ID}`)

    // The closure is where the authority actually lives: it is the DM-scoped
    // read, not a check the route does before calling one.
    slot.load()
    expect(mockLoad).toHaveBeenCalledWith(DM, CAMPAIGN_ID, HANDOUT_ID)
  })
})

describe('POST', () => {
  it('attaches to this handout’s column and answers with the handout', async () => {
    signedIn()

    const response = await POST(request, { params })

    expect(await response.json()).toEqual({ handout: HANDOUT })

    const slot = slotFrom(mockAttach, 1)
    slot.set(null)
    expect(mockSet).toHaveBeenCalledWith(DM, CAMPAIGN_ID, HANDOUT_ID, null)
  })

  it('passes a rejection straight back — 404, 413, 415 and 503 alike', async () => {
    signedIn()
    mockAttach.mockResolvedValue({ response: { status: 413 } as Response })

    expect((await POST(request, { params })).status).toBe(413)
  })
})

describe('DELETE', () => {
  it('clears this handout’s column and answers with the handout', async () => {
    signedIn()

    expect(await (await DELETE(request, { params })).json()).toEqual({ handout: HANDOUT })
    expect(slotFrom(mockClear, 0).key).toBe(`handouts/${HANDOUT_ID}`)
  })

  it('passes a rejection straight back', async () => {
    signedIn()
    mockClear.mockResolvedValue({ response: { status: 404 } as Response })

    expect((await DELETE(request, { params })).status).toBe(404)
  })
})
