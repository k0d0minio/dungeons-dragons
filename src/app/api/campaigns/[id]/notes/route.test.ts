import { GET, POST } from './route'

// A campaign's session notes (DND-058). Authority lives in the data layer's
// queries; these tests pin the status matrix, that the session user is who
// reaches the scoped calls, and that a foreign campaign stays a 404.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/notes', () => ({
  createCampaignNote: jest.fn(),
  listCampaignNotes: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createCampaignNote, listCampaignNotes, type CampaignNote } from '@/lib/db/notes'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreate = createCampaignNote as jest.MockedFunction<typeof createCampaignNote>
const mockList = listCampaignNotes as jest.MockedFunction<typeof listCampaignNotes>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const NOTE: CampaignNote = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-08-15',
  body: 'The party bribed the harbourmaster.',
  sharedWithPlayers: false,
  createdAt: new Date('2026-08-15T20:00:00.000Z'),
  updatedAt: new Date('2026-08-15T20:00:00.000Z'),
}

const params = Promise.resolve({ id: CAMPAIGN_ID })

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

describe('GET', () => {
  it('401s without a session, before any query runs', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const response = await GET(jsonRequest(null), { params })

    expect(response.status).toBe(401)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(jsonRequest(null), { params })).status).toBe(503)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('answers the campaign’s notes, scoped to the session user', async () => {
    signedIn()
    mockList.mockResolvedValue([NOTE])

    const response = await GET(jsonRequest(null), { params })

    expect(mockList).toHaveBeenCalledWith(DM, CAMPAIGN_ID)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ notes: [NOTE] })
  })

  it('404s for a campaign the session user does not run', async () => {
    signedIn()
    mockList.mockResolvedValue(null)

    expect((await GET(jsonRequest(null), { params })).status).toBe(404)
  })
})

describe('POST', () => {
  it('401s without a session', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await POST(jsonRequest({ body: 'x' }), { params })).status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('400s on a body that is not JSON', async () => {
    signedIn()

    const request = {
      json: async () => {
        throw new SyntaxError('bad json')
      },
    } as unknown as Request

    expect((await POST(request, { params })).status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('400s on a blank note, and never reaches the database', async () => {
    signedIn()

    const response = await POST(jsonRequest({ body: '   ' }), { params })

    expect(response.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('400s on a date that is not one', async () => {
    signedIn()

    expect(
      (await POST(jsonRequest({ body: 'ok', sessionDate: '2026-02-30' }), { params })).status,
    ).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('201s with the stored note, trimmed', async () => {
    signedIn()
    mockCreate.mockResolvedValue(NOTE)

    const response = await POST(
      jsonRequest({ body: '  They met a dragon.  ', sessionDate: '2026-08-15' }),
      { params },
    )

    expect(mockCreate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, {
      body: 'They met a dragon.',
      sessionDate: '2026-08-15',
    })
    expect(response.status).toBe(201)
  })

  it('404s when the campaign is not this DM’s — the same answer as one that never existed', async () => {
    signedIn()
    mockCreate.mockResolvedValue(null)

    expect((await POST(jsonRequest({ body: 'ok' }), { params })).status).toBe(404)
  })
})
