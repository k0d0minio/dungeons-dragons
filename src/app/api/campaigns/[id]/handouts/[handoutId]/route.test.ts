import { DELETE, PATCH } from './route'

// One handout (`dm-prep-suite/locations-handouts`). Beyond the status matrix,
// two properties: this route cannot reveal, and deleting a handout takes its
// picture out of the store — after the row, never before.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/handouts', () => ({
  deleteCampaignHandout: jest.fn(),
  updateCampaignHandout: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

jest.mock('@/lib/images/store', () => ({
  deleteImage: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteCampaignHandout, updateCampaignHandout, type HandoutForDm } from '@/lib/db/handouts'
import { deleteImage } from '@/lib/images/store'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockDelete = deleteCampaignHandout as jest.MockedFunction<typeof deleteCampaignHandout>
const mockUpdate = updateCampaignHandout as jest.MockedFunction<typeof updateCampaignHandout>
const mockDeleteImage = deleteImage as jest.MockedFunction<typeof deleteImage>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const HANDOUT_ID = '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f'

const IMAGE = {
  pathname: 'campaigns/7b2e4f1a/handouts/6d1e2f30-x1y2.jpg',
  contentType: 'image/jpeg',
  bytes: 120_000,
  uploadedAt: '2026-09-03T10:00:00.000Z',
}

const HANDOUT: HandoutForDm = {
  id: HANDOUT_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'The pressed-flower letter',
  body: null,
  image: null,
  provenance: null,
  dmNotes: null,
}

const params = Promise.resolve({ id: CAMPAIGN_ID, handoutId: HANDOUT_ID })

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
  it('401s without a session, before anything is written', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ title: 'x' }), { params })).status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PATCH(jsonRequest({ title: 'x' }), { params })).status).toBe(503)
  })

  it('400s a patch that would change nothing', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({}), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Nothing to change' })
  })

  it('applies the patch, scoped to the session user', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(HANDOUT)

    const response = await PATCH(jsonRequest({ provenance: 'A forgery' }), { params })

    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, HANDOUT_ID, {
      provenance: 'A forgery',
    })
    expect(await response.json()).toEqual({ handout: HANDOUT })
  })

  it('cannot be talked into revealing a handout or attaching an image', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(HANDOUT)

    await PATCH(
      jsonRequest({
        title: 'A letter',
        revealedAt: new Date().toISOString(),
        image: { pathname: 'campaigns/someone-elses/handouts/secret.jpg' },
      }),
      { params },
    )

    expect(mockUpdate.mock.calls[0]?.[3]).not.toHaveProperty('revealedAt')
    expect(mockUpdate.mock.calls[0]?.[3]).not.toHaveProperty('image')
  })

  it('404s a handout in someone else’s campaign — never 403', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ title: 'Mine now' }), { params })).status).toBe(404)
  })
})

describe('DELETE', () => {
  it('401s without a session, before anything is deleted', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(503)
  })

  it('deletes a handout that had no picture, touching the store not at all', async () => {
    signedIn()
    mockDelete.mockResolvedValue({ deleted: true, image: null })

    const response = await DELETE(jsonRequest(null), { params })

    expect(mockDelete).toHaveBeenCalledWith(DM, CAMPAIGN_ID, HANDOUT_ID)
    expect(await response.json()).toEqual({ deleted: true })
    expect(mockDeleteImage).not.toHaveBeenCalled()
  })

  // A deleted secret whose bytes are still in the store is still in the store.
  it('takes the picture out of the store with the row', async () => {
    signedIn()
    mockDelete.mockResolvedValue({ deleted: true, image: IMAGE })

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(200)
    expect(mockDeleteImage).toHaveBeenCalledWith(IMAGE)
  })

  it('404s when there was nothing this DM could delete, and forgets nothing', async () => {
    signedIn()
    mockDelete.mockResolvedValue({ deleted: false, image: null })

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(404)
    expect(mockDeleteImage).not.toHaveBeenCalled()
  })
})
