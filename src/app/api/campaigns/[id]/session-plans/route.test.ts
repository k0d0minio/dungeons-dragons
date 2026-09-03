import { GET, POST } from './route'

// A campaign's session plans (`dm-prep-suite/session-plans`). Authority lives
// in the data layer's queries; these tests pin the status matrix, that the
// session user is who reaches the scoped calls, and that a foreign campaign
// stays 404.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  createSessionPlan: jest.fn(),
  listSessionPlans: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  createSessionPlan,
  listSessionPlans,
  type CampaignSessionPlan,
} from '@/lib/db/session-plans'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreate = createSessionPlan as jest.MockedFunction<typeof createSessionPlan>
const mockList = listSessionPlans as jest.MockedFunction<typeof listSessionPlans>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const PLAN: CampaignSessionPlan = {
  id: '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'Session 4 — the shrine',
  sessionDate: '2026-09-17',
  strongStart: 'The tide is out further than it has ever been.',
  treasure: null,
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

  it('returns this DM’s plans', async () => {
    signedIn()
    mockList.mockResolvedValue([PLAN])

    const response = await GET(jsonRequest(null), { params })

    expect(mockList).toHaveBeenCalledWith(DM, CAMPAIGN_ID)
    expect(await response.json()).toEqual({ plans: [expect.objectContaining({ id: PLAN.id })] })
  })

  it('404s a campaign this DM does not run — never 403', async () => {
    signedIn()
    mockList.mockResolvedValue(null)

    expect((await GET(jsonRequest(null), { params })).status).toBe(404)
  })
})

describe('POST', () => {
  it('401s without a session', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await POST(jsonRequest({ title: 'x' }), { params })).status).toBe(401)
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await POST(jsonRequest({ title: 'x' }), { params })).status).toBe(503)
  })

  it('400s a body that is not JSON at all', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Request

    expect((await POST(broken, { params })).status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('400s a plan with no title, in words about the plan', async () => {
    signedIn()

    const response = await POST(jsonRequest({}), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Give the session a title' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('201s the new plan', async () => {
    signedIn()
    mockCreate.mockResolvedValue(PLAN)

    const response = await POST(jsonRequest({ title: PLAN.title, sessionDate: '2026-09-17' }), {
      params,
    })

    expect(response.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, {
      title: PLAN.title,
      sessionDate: '2026-09-17',
    })
  })

  it('404s a campaign this DM does not run', async () => {
    signedIn()
    mockCreate.mockResolvedValue(null)

    expect((await POST(jsonRequest({ title: 'Mine now' }), { params })).status).toBe(404)
  })
})
