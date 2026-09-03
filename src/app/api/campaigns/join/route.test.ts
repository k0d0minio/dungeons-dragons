import { POST } from './route'

// Joining by code (DND-046). Any signed-in user with the code may join — that
// is what the code is for — and ownership of the attached characters is the
// data layer's problem, re-checked in SQL. What this route owes its callers:
// the session user is who joins, a dead code reads as a plain 404 with words a
// player can act on, and the response leaks nothing but id and name.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  joinCampaignByCode: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { joinCampaignByCode, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockJoinCampaignByCode = joinCampaignByCode as jest.MockedFunction<typeof joinCampaignByCode>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const PLAYER = 'user_9zQw1nBvRt'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const JOIN_CODE = 'kfEbCq3vX9pLm2Rt8sWz1A'

const STORED: Campaign = {
  id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  dmUserId: 'user_2mFq8xKpLd',
  name: 'The Rime of the Frostmaiden',
  joinCode: JOIN_CODE,
  gates: null,
  milestoneLevel: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: PLAYER } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockJoinCampaignByCode.mockResolvedValue(STORED)
})

describe('POST /api/campaigns/join', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await POST(jsonRequest({ code: JOIN_CODE }))

    expect(response.status).toBe(401)
    expect(mockJoinCampaignByCode).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ code: JOIN_CODE }))

    expect(response.status).toBe(503)
    expect(mockJoinCampaignByCode).not.toHaveBeenCalled()
  })

  it('answers 400 to a body that is not JSON', async () => {
    signedIn()

    const unparseable = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    expect((await POST(unparseable)).status).toBe(400)
    expect(mockJoinCampaignByCode).not.toHaveBeenCalled()
  })

  it.each([
    ['no code at all', {}],
    ['a blank code', { code: '   ' }],
    ['character ids that are not uuids', { code: JOIN_CODE, characterIds: ['not-a-uuid'] }],
    [
      'more than twenty characters',
      { code: JOIN_CODE, characterIds: Array.from({ length: 21 }, () => CHARACTER_ID) },
    ],
  ])('answers 400 to %s', async (_label, body) => {
    signedIn()

    expect((await POST(jsonRequest(body))).status).toBe(400)
    expect(mockJoinCampaignByCode).not.toHaveBeenCalled()
  })

  it('answers 404 with words a player can act on when the code is dead', async () => {
    signedIn()
    mockJoinCampaignByCode.mockResolvedValue(null)

    const response = await POST(jsonRequest({ code: JOIN_CODE }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('That join link is not live. Ask your DM for a fresh one.')
  })

  it('joins as the session user and answers with only the campaign id and name', async () => {
    signedIn()

    const response = await POST(jsonRequest({ code: JOIN_CODE, characterIds: [CHARACTER_ID] }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockJoinCampaignByCode).toHaveBeenCalledWith(PLAYER, JOIN_CODE, [CHARACTER_ID])
    // No dm_user_id, no join code — nothing the joiner has no business seeing.
    expect(body).toEqual({ campaign: { id: STORED.id, name: STORED.name } })
  })

  it('defaults the character list to empty — joining with no one is allowed', async () => {
    signedIn()

    const response = await POST(jsonRequest({ code: JOIN_CODE }))

    expect(response.status).toBe(200)
    expect(mockJoinCampaignByCode).toHaveBeenCalledWith(PLAYER, JOIN_CODE, [])
  })
})
