// The re-runnable carry (`triage/carry-forward-rerun`). What these pin: both
// ids reach the data layer under the session DM's own id, a campaign carried
// into itself is refused before anything is written, and every miss is the
// same 404 a fictional campaign gets.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  carryCampaignForward: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { carryCampaignForward, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

import { PUT } from './route'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCarry = carryCampaignForward as jest.MockedFunction<typeof carryCampaignForward>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const SOURCE_ID = '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e'

const CARRIED: Campaign = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The real one',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: { conditions: true },
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  tableToken: null,
  tableSpotlight: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
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
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockCarry.mockResolvedValue(CARRIED)
})

describe('PUT /api/campaigns/[id]/carry-from', () => {
  it('answers 401 when signed out, having carried nothing', async () => {
    const response = await PUT(jsonRequest({ campaignId: SOURCE_ID }), { params })

    expect(response.status).toBe(401)
    expect(mockCarry).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await PUT(jsonRequest({ campaignId: SOURCE_ID }), { params })

    expect(response.status).toBe(503)
    expect(mockCarry).not.toHaveBeenCalled()
  })

  it('carries the table across for the session DM and answers with the campaign', async () => {
    signedIn()

    const response = await PUT(jsonRequest({ campaignId: SOURCE_ID }), { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    // Path id first, body id second — both under the DM whose session this is.
    expect(mockCarry).toHaveBeenCalledWith(DM, CAMPAIGN_ID, SOURCE_ID)
    expect(body.campaign).toEqual(CARRIED)
  })

  it('answers the same 404 for a campaign at either end that this DM does not run', async () => {
    signedIn()
    mockCarry.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ campaignId: SOURCE_ID }), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No such campaign' })
  })

  it('answers 400 to a source that is not an id, without touching the data layer', async () => {
    signedIn()

    const response = await PUT(jsonRequest({ campaignId: 'the tutorial' }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'That is not a campaign' })
    expect(mockCarry).not.toHaveBeenCalled()
  })

  it('answers 400 to a body with no campaignId at all', async () => {
    signedIn()

    const response = await PUT(jsonRequest({}), { params })

    expect(response.status).toBe(400)
    expect(mockCarry).not.toHaveBeenCalled()
  })

  it('answers 400 to a body that is not JSON', async () => {
    signedIn()

    const unparseable = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    expect((await PUT(unparseable, { params })).status).toBe(400)
    expect(mockCarry).not.toHaveBeenCalled()
  })

  it('refuses a campaign carried forward from itself rather than writing a no-op', async () => {
    signedIn()

    const response = await PUT(jsonRequest({ campaignId: CAMPAIGN_ID }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'A campaign cannot carry itself forward' })
    expect(mockCarry).not.toHaveBeenCalled()
  })
})
