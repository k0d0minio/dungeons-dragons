import { GET, POST } from './route'

// A campaign's places (`dm-prep-suite/locations-handouts`). Authority lives in
// the data layer's queries; these tests pin the status matrix, that the session
// user is who reaches the scoped calls, and that a foreign campaign stays 404.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/locations', () => ({
  createCampaignLocation: jest.fn(),
  listCampaignLocations: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  createCampaignLocation,
  listCampaignLocations,
  type CampaignLocation,
} from '@/lib/db/locations'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreate = createCampaignLocation as jest.MockedFunction<typeof createCampaignLocation>
const mockList = listCampaignLocations as jest.MockedFunction<typeof listCampaignLocations>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const LOCATION: CampaignLocation = {
  id: '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  name: 'Kelp Harbour',
  summary: 'A fishing village with no fishermen left',
  description: null,
  secrets: 'The village keeps the lighthouse dark on purpose.',
  dmNotes: null,
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

    expect((await GET(jsonRequest(null), { params })).status).toBe(401)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(jsonRequest(null), { params })).status).toBe(503)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('answers the list, scoped to the session user', async () => {
    signedIn()
    mockList.mockResolvedValue([LOCATION])

    const response = await GET(jsonRequest(null), { params })

    expect(mockList).toHaveBeenCalledWith(DM, CAMPAIGN_ID)
    expect(await response.json()).toEqual({ locations: [LOCATION] })
  })

  it('404s a campaign this DM does not run — never 403', async () => {
    signedIn()
    mockList.mockResolvedValue(null)

    expect((await GET(jsonRequest(null), { params })).status).toBe(404)
  })
})

describe('POST', () => {
  it('401s without a session, before anything is written', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await POST(jsonRequest({ name: 'Kelp Harbour' }), { params })).status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await POST(jsonRequest({ name: 'Kelp Harbour' }), { params })).status).toBe(503)
  })

  it('400s a body that is not JSON', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    const response = await POST(broken, { params })

    expect(response.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('400s a place with no name, saying what is missing', async () => {
    signedIn()

    const response = await POST(jsonRequest({ summary: 'The docks' }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Give the place a name' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates and answers 201 with the row, scoped to the session user', async () => {
    signedIn()
    mockCreate.mockResolvedValue(LOCATION)

    const response = await POST(
      jsonRequest({ name: 'Kelp Harbour', secrets: 'The lighthouse is dark on purpose.' }),
      { params },
    )

    expect(mockCreate).toHaveBeenCalledWith(
      DM,
      CAMPAIGN_ID,
      expect.objectContaining({ name: 'Kelp Harbour' }),
    )
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ location: LOCATION })
  })

  // The reveal seam stays shut: `revealedAt` is in neither schema.
  it('drops a revealedAt a hand-rolled request tried to smuggle in', async () => {
    signedIn()
    mockCreate.mockResolvedValue(LOCATION)

    await POST(jsonRequest({ name: 'Kelp Harbour', revealedAt: new Date().toISOString() }), {
      params,
    })

    expect(mockCreate.mock.calls[0]?.[2]).not.toHaveProperty('revealedAt')
  })

  it('404s a campaign this DM does not run', async () => {
    signedIn()
    mockCreate.mockResolvedValue(null)

    expect((await POST(jsonRequest({ name: 'Kelp Harbour' }), { params })).status).toBe(404)
  })
})
