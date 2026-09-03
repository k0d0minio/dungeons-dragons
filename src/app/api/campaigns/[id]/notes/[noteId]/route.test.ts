import { DELETE, PATCH } from './route'

// Editing, sharing and deleting one session note (DND-058). Sharing is the
// register's visibility rule, and this route is the only way it is ever turned
// on — so the status matrix around it is worth pinning.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/notes', () => ({
  deleteCampaignNote: jest.fn(),
  updateCampaignNote: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteCampaignNote, updateCampaignNote, type CampaignNote } from '@/lib/db/notes'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockUpdate = updateCampaignNote as jest.MockedFunction<typeof updateCampaignNote>
const mockDelete = deleteCampaignNote as jest.MockedFunction<typeof deleteCampaignNote>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NOTE_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const NOTE: CampaignNote = {
  id: NOTE_ID,
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-08-15',
  body: 'The party bribed the harbourmaster.',
  sharedWithPlayers: false,
  sessionClosedAt: null,
  createdAt: new Date('2026-08-15T20:00:00.000Z'),
  updatedAt: new Date('2026-08-15T20:00:00.000Z'),
}

const params = Promise.resolve({ id: CAMPAIGN_ID, noteId: NOTE_ID })

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
  it('401s without a session', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ body: 'x' }), { params })).status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PATCH(jsonRequest({ body: 'x' }), { params })).status).toBe(503)
  })

  it('400s on an empty patch rather than writing nothing and saying it saved', async () => {
    signedIn()

    expect((await PATCH(jsonRequest({}), { params })).status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('shares a note with the party', async () => {
    signedIn()
    mockUpdate.mockResolvedValue({ ...NOTE, sharedWithPlayers: true })

    const response = await PATCH(jsonRequest({ sharedWithPlayers: true }), { params })

    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NOTE_ID, { sharedWithPlayers: true })
    expect(response.status).toBe(200)
  })

  it('404s for a note in a campaign the session user does not run', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ sharedWithPlayers: true }), { params })).status).toBe(404)
  })
})

describe('DELETE', () => {
  it('401s without a session', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes a note the DM owns the campaign of', async () => {
    signedIn()
    mockDelete.mockResolvedValue(true)

    const response = await DELETE(jsonRequest(null), { params })

    expect(mockDelete).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NOTE_ID)
    expect(response.status).toBe(200)
  })

  it('404s when there was nothing this DM could delete', async () => {
    signedIn()
    mockDelete.mockResolvedValue(false)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(404)
  })
})
