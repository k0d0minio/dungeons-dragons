import { POST } from './route'

// The DM-only door to campaign creation (DND-046, D19). Authority is a global
// role here, not row scoping — so unlike the data routes, a player gets an
// honest 403, and these tests pin who reaches `createCampaign` and with what.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  createCampaign: jest.fn(),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { createCampaign, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreateCampaign = createCampaign as jest.MockedFunction<typeof createCampaign>
const mockIsDm = isDm as jest.MockedFunction<typeof isDm>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'

const STORED: Campaign = {
  id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockIsDm.mockResolvedValue(true)
  mockCreateCampaign.mockResolvedValue(STORED)
})

describe('POST /api/campaigns', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await POST(jsonRequest({ name: 'The Rime' }))

    expect(response.status).toBe(401)
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ name: 'The Rime' }))

    expect(response.status).toBe(503)
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('answers 403 for a signed-in player — the honest answer, since a role is not a secret', async () => {
    signedIn()
    mockIsDm.mockResolvedValue(false)

    const response = await POST(jsonRequest({ name: 'The Rime' }))

    expect(response.status).toBe(403)
    expect(mockIsDm).toHaveBeenCalledWith(DM)
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('answers 400 to a blank name', async () => {
    signedIn()

    const response = await POST(jsonRequest({ name: '   ' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Give the campaign a name')
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('answers 400 to a name past 120 characters', async () => {
    signedIn()

    const response = await POST(jsonRequest({ name: 'x'.repeat(121) }))

    expect(response.status).toBe(400)
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('answers 400 to a body that is not JSON', async () => {
    signedIn()

    const unparseable = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    expect((await POST(unparseable)).status).toBe(400)
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('creates the campaign for the session DM and answers 201 with the row', async () => {
    signedIn()

    const response = await POST(jsonRequest({ name: '  The Rime of the Frostmaiden  ' }))
    const body = await response.json()

    expect(response.status).toBe(201)
    // The zod schema trims before the data layer sees it.
    expect(mockCreateCampaign).toHaveBeenCalledWith(DM, 'The Rime of the Frostmaiden')
    expect(body.campaign).toEqual(STORED)
  })
})
