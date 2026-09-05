import { PUT } from './route'

// The night's reveal switch (`first-table/announce-the-night`). The handler is
// shared and settled by the NPC suite; what this pins is that the route is
// wired to the plan's own setter, answers with the plan, and 404s a miss.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  setSessionPlanRevealed: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setSessionPlanRevealed, type CampaignSessionPlan } from '@/lib/db/session-plans'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetRevealed = setSessionPlanRevealed as jest.MockedFunction<typeof setSessionPlanRevealed>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const ANNOUNCED: CampaignSessionPlan = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: new Date('2026-09-05T19:00:00.000Z'),
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-05T19:00:00.000Z'),
  title: 'Session 1 - Intro',
  sessionDate: '2026-09-10',
  strongStart: 'The lighthouse is lit, and nobody lives there.',
  treasure: null,
}

const params = Promise.resolve({ id: CAMPAIGN_ID, planId: PLAN_ID })

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

describe('PUT /api/campaigns/[id]/session-plans/[planId]/reveal', () => {
  it('401s without a session, before anything is announced', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PUT(jsonRequest({ revealed: true }), { params })).status).toBe(401)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PUT(jsonRequest({ revealed: true }), { params })).status).toBe(503)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('400s a body that does not name a position for the switch', async () => {
    signedIn()

    expect((await PUT(jsonRequest({}), { params })).status).toBe(400)
    expect((await PUT(jsonRequest({ revealed: 'yes' }), { params })).status).toBe(400)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('announces, scoped to the session user, and answers with the plan', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(ANNOUNCED)

    const response = await PUT(jsonRequest({ revealed: true }), { params })

    expect(mockSetRevealed).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, true)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ plan: ANNOUNCED })
  })

  it('un-announces through the same endpoint', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue({ ...ANNOUNCED, revealedAt: null })

    const response = await PUT(jsonRequest({ revealed: false }), { params })

    expect(mockSetRevealed).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, false)
    expect(response.status).toBe(200)
  })

  it('404s a plan in someone else’s campaign — never 403', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ revealed: true }), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No such session plan' })
  })
})
