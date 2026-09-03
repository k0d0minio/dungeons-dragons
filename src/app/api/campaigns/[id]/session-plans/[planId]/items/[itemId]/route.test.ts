import { DELETE, PATCH } from './route'

// One checkable line (`dm-prep-suite/session-plans`) — the route that runs
// during play. The status matrix, and the property the tick depends on: a
// `{ checked: true }` body reaches the data layer as a tick and nothing else.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  deleteSessionPlanItem: jest.fn(),
  updateSessionPlanItem: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  deleteSessionPlanItem,
  updateSessionPlanItem,
  type SessionPlanItem,
} from '@/lib/db/session-plans'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockUpdate = updateSessionPlanItem as jest.MockedFunction<typeof updateSessionPlanItem>
const mockDelete = deleteSessionPlanItem as jest.MockedFunction<typeof deleteSessionPlanItem>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const ITEM_ID = '11111111-2222-4333-8444-555555555555'

const ITEM: SessionPlanItem = {
  id: ITEM_ID,
  planId: PLAN_ID,
  kind: 'secret',
  body: 'The lighthouse is kept dark on purpose',
  sortOrder: 0,
  checkedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
}

const params = Promise.resolve({ id: CAMPAIGN_ID, planId: PLAN_ID, itemId: ITEM_ID })

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
  it('401s without a session, 503s without a database', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await PATCH(jsonRequest({ checked: true }), { params })).status).toBe(401)

    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)
    expect((await PATCH(jsonRequest({ checked: true }), { params })).status).toBe(503)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('400s a body that is not JSON and an empty patch', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Request

    expect((await PATCH(broken, { params })).status).toBe(400)
    expect((await PATCH(jsonRequest({}), { params })).status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('ticks a line off in one tap', async () => {
    signedIn()
    mockUpdate.mockResolvedValue({ ...ITEM, checkedAt: new Date('2026-09-17T20:00:00.000Z') })

    const response = await PATCH(jsonRequest({ checked: true }), { params })

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, ITEM_ID, { checked: true })
  })

  it('unticks, and rewords', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(ITEM)

    await PATCH(jsonRequest({ checked: false }), { params })
    expect(mockUpdate).toHaveBeenLastCalledWith(DM, CAMPAIGN_ID, PLAN_ID, ITEM_ID, {
      checked: false,
    })

    await PATCH(jsonRequest({ body: 'Reworded' }), { params })
    expect(mockUpdate).toHaveBeenLastCalledWith(DM, CAMPAIGN_ID, PLAN_ID, ITEM_ID, {
      body: 'Reworded',
    })
  })

  it('404s a line this DM cannot reach — never 403', async () => {
    signedIn()
    mockUpdate.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ checked: true }), { params })).status).toBe(404)
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
    expect(mockDelete).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, ITEM_ID)

    mockDelete.mockResolvedValue(false)
    expect((await DELETE(jsonRequest(null), { params })).status).toBe(404)
  })
})
