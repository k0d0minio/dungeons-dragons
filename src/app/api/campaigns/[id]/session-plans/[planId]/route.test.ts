import { DELETE, GET, PATCH } from './route'

// One session plan (`dm-prep-suite/session-plans`). The status matrix, plus the
// property this ticket is on the hook for: **no request through here can
// announce a night**, because `revealedAt` is not in the schema it parses.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  deleteSessionPlan: jest.fn(),
  getSessionPlan: jest.fn(),
  updateSessionPlan: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  deleteSessionPlan,
  getSessionPlan,
  updateSessionPlan,
  type CampaignSessionPlan,
} from '@/lib/db/session-plans'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockGet = getSessionPlan as jest.MockedFunction<typeof getSessionPlan>
const mockUpdate = updateSessionPlan as jest.MockedFunction<typeof updateSessionPlan>
const mockDelete = deleteSessionPlan as jest.MockedFunction<typeof deleteSessionPlan>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const PLAN: CampaignSessionPlan = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'Session 4 — the shrine',
  sessionDate: null,
  strongStart: null,
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

describe('GET', () => {
  it('401s without a session, 503s without a database', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await GET(jsonRequest(null), { params })).status).toBe(401)

    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)
    expect((await GET(jsonRequest(null), { params })).status).toBe(503)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('returns the plan with its lines and its links, in one call', async () => {
    signedIn()
    mockGet.mockResolvedValue({ plan: PLAN, items: [], links: [] })

    const response = await GET(jsonRequest(null), { params })

    expect(mockGet).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID)
    expect(await response.json()).toEqual({
      plan: expect.objectContaining({ id: PLAN_ID }),
      items: [],
      links: [],
    })
  })

  it('404s a plan this DM cannot reach — never 403', async () => {
    signedIn()
    mockGet.mockResolvedValue(null)

    expect((await GET(jsonRequest(null), { params })).status).toBe(404)
  })
})

describe('PATCH', () => {
  it('401s without a session, 503s without a database', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await PATCH(jsonRequest({ title: 'x' }), { params })).status).toBe(401)

    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)
    expect((await PATCH(jsonRequest({ title: 'x' }), { params })).status).toBe(503)
  })

  it('400s a body that is not JSON, and an empty patch', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Request

    expect((await PATCH(broken, { params })).status).toBe(400)

    const empty = await PATCH(jsonRequest({}), { params })
    expect(empty.status).toBe(400)
    expect(await empty.json()).toEqual({ error: 'Nothing to change' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('saves a change', async () => {
    signedIn()
    mockUpdate.mockResolvedValue({ ...PLAN, treasure: 'A tarnished holy symbol' })

    const response = await PATCH(jsonRequest({ treasure: 'A tarnished holy symbol' }), { params })

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, {
      treasure: 'A tarnished holy symbol',
    })
  })

  // The seam `dm-run-suite/reveal-controls` owns. A hand-rolled PATCH carrying
  // `revealedAt` reaches the data layer without it.
  it('cannot announce a night, however the body is hand-rolled', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(PLAN)

    await PATCH(jsonRequest({ title: 'Session 4', revealedAt: new Date().toISOString() }), {
      params,
    })

    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, { title: 'Session 4' })
  })

  it('404s a plan this DM cannot reach', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ title: 'Mine' }), { params })).status).toBe(404)
  })
})

describe('DELETE', () => {
  it('401s without a session, 503s without a database', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await DELETE(jsonRequest(null), { params })).status).toBe(401)

    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)
    expect((await DELETE(jsonRequest(null), { params })).status).toBe(503)
  })

  it('deletes, and 404s when there was nothing to delete', async () => {
    signedIn()

    mockDelete.mockResolvedValue(true)
    expect((await DELETE(jsonRequest(null), { params })).status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID)

    mockDelete.mockResolvedValue(false)
    expect((await DELETE(jsonRequest(null), { params })).status).toBe(404)
  })
})
