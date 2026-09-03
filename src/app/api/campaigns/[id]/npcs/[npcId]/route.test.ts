import { DELETE, PATCH } from './route'

// One NPC (`dm-prep-suite/npc-roster`). Same shape as its parent route's tests,
// plus the one property this endpoint exists to *not* have: it cannot reveal.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/npcs', () => ({
  deleteCampaignNpc: jest.fn(),
  updateCampaignNpc: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

jest.mock('@/lib/images/store', () => ({
  deleteImage: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteCampaignNpc, updateCampaignNpc, type NpcForDm } from '@/lib/db/npcs'
import { deleteImage } from '@/lib/images/store'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockUpdate = updateCampaignNpc as jest.MockedFunction<typeof updateCampaignNpc>
const mockDelete = deleteCampaignNpc as jest.MockedFunction<typeof deleteCampaignNpc>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>
const mockDeleteImage = deleteImage as jest.MockedFunction<typeof deleteImage>

/** A stored portrait, as the delete path hands one back. */
const PORTRAIT = {
  pathname: 'campaigns/7b2e4f1a/npcs/5a8b0c2d-abc123.jpg',
  contentType: 'image/jpeg',
  bytes: 24_000,
  uploadedAt: '2026-09-03T10:00:00.000Z',
}

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NPC_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const NPC: NpcForDm = {
  portrait: null,
  id: NPC_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-08-29T10:00:00.000Z'),
  name: 'Harbourmaster Vane',
  summary: null,
  description: null,
  motivation: 'Pay off the debt.',
  secrets: null,
  twist: null,
  statReference: null,
  dmNotes: null,
}

const params = Promise.resolve({ id: CAMPAIGN_ID, npcId: NPC_ID })

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

describe('PATCH', () => {
  it('401s without a session, before any write', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ name: 'Vane' }), { params })).status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PATCH(jsonRequest({ name: 'Vane' }), { params })).status).toBe(503)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('400s a body that is not JSON', async () => {
    signedIn()

    const request = {
      json: async () => {
        throw new SyntaxError('nope')
      },
    } as unknown as Request

    expect((await PATCH(request, { params })).status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('400s an empty patch rather than bumping updated_at for nothing', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({}), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Nothing to change' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('applies the parsed patch, scoped to the session user', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(NPC)

    const response = await PATCH(jsonRequest({ motivation: '  Pay off the debt.  ' }), { params })

    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NPC_ID, {
      motivation: 'Pay off the debt.',
    })
    expect(await response.json()).toEqual({ npc: NPC })
  })

  it('cannot reveal an NPC — revealedAt is stripped, leaving nothing to change', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ revealedAt: '2026-09-01T00:00:00.000Z' }), {
      params,
    })

    expect(response.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('never forwards revealedAt alongside a real change', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(NPC)

    await PATCH(jsonRequest({ name: 'Vane', revealedAt: '2026-09-01T00:00:00.000Z' }), { params })

    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NPC_ID, { name: 'Vane' })
  })

  it('404s an NPC in a campaign this DM does not run', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ name: 'Mine now' }), { params })).status).toBe(404)
  })
})

describe('DELETE', () => {
  it('401s without a session, before any write', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(503)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes, scoped to the session user', async () => {
    signedIn()
    mockDelete.mockResolvedValue({ deleted: true, portrait: null })

    const response = await DELETE(jsonRequest(null), { params })

    expect(mockDelete).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NPC_ID)
    expect(await response.json()).toEqual({ deleted: true })
    expect(mockDeleteImage).not.toHaveBeenCalled()
  })

  // `locations-handouts`: a deleted NPC must not leave their face in the store.
  it('takes the portrait out of the store with the row, and after it', async () => {
    signedIn()
    mockDelete.mockResolvedValue({ deleted: true, portrait: PORTRAIT })

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(200)
    expect(mockDeleteImage).toHaveBeenCalledWith(PORTRAIT)
  })

  it('404s when there was nothing this DM could delete', async () => {
    signedIn()
    mockDelete.mockResolvedValue({ deleted: false, portrait: null })

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(404)
    expect(mockDeleteImage).not.toHaveBeenCalled()
  })
})
