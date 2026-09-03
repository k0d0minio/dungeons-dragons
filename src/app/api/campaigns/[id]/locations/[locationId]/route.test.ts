import { DELETE, PATCH } from './route'

// One place (`dm-prep-suite/locations-handouts`). Same shape as its parent
// route's tests, plus the one property this endpoint exists to *not* have: it
// cannot reveal.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/locations', () => ({
  deleteCampaignLocation: jest.fn(),
  updateCampaignLocation: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  deleteCampaignLocation,
  updateCampaignLocation,
  type CampaignLocation,
} from '@/lib/db/locations'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockDelete = deleteCampaignLocation as jest.MockedFunction<typeof deleteCampaignLocation>
const mockUpdate = updateCampaignLocation as jest.MockedFunction<typeof updateCampaignLocation>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const LOCATION_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const LOCATION: CampaignLocation = {
  id: LOCATION_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  name: 'Kelp Harbour',
  summary: null,
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

describe('PATCH', () => {
  it('401s without a session, before anything is written', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ name: 'x' }), { params })).status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PATCH(jsonRequest({ name: 'x' }), { params })).status).toBe(503)
  })

  it('400s a body that is not JSON', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    expect((await PATCH(broken, { params })).status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('400s a patch that would change nothing', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({}), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Nothing to change' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('applies the patch, scoped to the session user', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(LOCATION)

    const response = await PATCH(jsonRequest({ secrets: null }), { params })

    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, LOCATION_ID, { secrets: null })
    expect(await response.json()).toEqual({ location: LOCATION })
  })

  // The point of this route being unable to reveal: `revealedAt` is absent
  // from `patchLocationSchema`, so it never reaches the UPDATE.
  it('cannot be talked into revealing a place', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(LOCATION)

    await PATCH(jsonRequest({ name: 'Kelp Harbour', revealedAt: new Date().toISOString() }), {
      params,
    })

    expect(mockUpdate.mock.calls[0]?.[3]).not.toHaveProperty('revealedAt')
  })

  it('404s a place in someone else’s campaign — never 403', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ name: 'Mine now' }), { params })).status).toBe(404)
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
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes, scoped to the session user', async () => {
    signedIn()
    mockDelete.mockResolvedValue(true)

    const response = await DELETE(jsonRequest(null), { params })

    expect(mockDelete).toHaveBeenCalledWith(DM, CAMPAIGN_ID, LOCATION_ID)
    expect(await response.json()).toEqual({ deleted: true })
  })

  it('404s when there was nothing this DM could delete', async () => {
    signedIn()
    mockDelete.mockResolvedValue(false)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(404)
  })
})
