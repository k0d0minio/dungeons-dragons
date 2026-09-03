import { DELETE, GET, POST } from './route'

// An NPC's portrait (`dm-prep-suite/locations-handouts`) — the slot
// `npc-roster` deferred. Same three verbs as a handout's image against a
// different column, so what this file pins is the session wall and that the
// closures name *this* NPC's row.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/npcs', () => ({
  loadNpcPortrait: jest.fn(),
  setNpcPortrait: jest.fn(),
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
import { loadNpcPortrait, setNpcPortrait, type NpcForDm } from '@/lib/db/npcs'
import { attachSlotImage, clearSlotImage, serveSlotImage } from '@/lib/images/slot'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>
const mockServe = serveSlotImage as jest.MockedFunction<typeof serveSlotImage>
const mockAttach = attachSlotImage as jest.MockedFunction<typeof attachSlotImage>
const mockClear = clearSlotImage as jest.MockedFunction<typeof clearSlotImage>
const mockLoad = loadNpcPortrait as jest.MockedFunction<typeof loadNpcPortrait>
const mockSet = setNpcPortrait as jest.MockedFunction<typeof setNpcPortrait>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NPC_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const NPC = { id: NPC_ID, name: 'Harbourmaster Vane' } as unknown as NpcForDm

const params = Promise.resolve({ id: CAMPAIGN_ID, npcId: NPC_ID })

const request = {} as Request

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

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
  mockAttach.mockResolvedValue({ entity: NPC })
  mockClear.mockResolvedValue({ entity: NPC })
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

describe('the slot', () => {
  it('reads and writes this NPC’s portrait, as the session user', async () => {
    signedIn()

    await GET(request, { params })

    const slot = slotFrom(mockServe, 0)
    expect(slot.noun).toBe('NPC')
    expect(slot.key).toBe(`npcs/${NPC_ID}`)

    slot.load()
    expect(mockLoad).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NPC_ID)

    slot.set(null)
    expect(mockSet).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NPC_ID, null)
  })

  it('answers an upload and a removal with the NPC', async () => {
    signedIn()

    expect(await (await POST(request, { params })).json()).toEqual({ npc: NPC })
    expect(await (await DELETE(request, { params })).json()).toEqual({ npc: NPC })
  })

  it('passes a rejection straight back', async () => {
    signedIn()
    mockAttach.mockResolvedValue({ response: { status: 415 } as Response })
    mockClear.mockResolvedValue({ response: { status: 404 } as Response })

    expect((await POST(request, { params })).status).toBe(415)
    expect((await DELETE(request, { params })).status).toBe(404)
  })
})
