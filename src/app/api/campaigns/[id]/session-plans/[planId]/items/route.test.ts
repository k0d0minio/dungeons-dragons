import { PATCH, POST } from './route'

// A plan's checkable lines, as a collection (`dm-prep-suite/session-plans`).
// The status matrix, and the two shapes this route accepts: one new line, or a
// whole kind's order.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  addSessionPlanItem: jest.fn(),
  reorderSessionPlanItems: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  addSessionPlanItem,
  reorderSessionPlanItems,
  type SessionPlanItem,
} from '@/lib/db/session-plans'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockAdd = addSessionPlanItem as jest.MockedFunction<typeof addSessionPlanItem>
const mockReorder = reorderSessionPlanItems as jest.MockedFunction<typeof reorderSessionPlanItems>
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

describe('POST', () => {
  it('401s without a session, 503s without a database', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await POST(jsonRequest({}), { params })).status).toBe(401)

    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)
    expect((await POST(jsonRequest({}), { params })).status).toBe(503)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('400s a body that is not JSON, a blank line and an unknown kind', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Request

    expect((await POST(broken, { params })).status).toBe(400)
    expect((await POST(jsonRequest({ kind: 'scene', body: '  ' }), { params })).status).toBe(400)
    expect((await POST(jsonRequest({ kind: 'treasure', body: 'x' }), { params })).status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('201s the new line', async () => {
    signedIn()
    mockAdd.mockResolvedValue(ITEM)

    const response = await POST(jsonRequest({ kind: 'secret', body: ITEM.body }), { params })

    expect(response.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, {
      kind: 'secret',
      body: ITEM.body,
    })
  })

  it('404s a plan this DM cannot reach — never 403', async () => {
    signedIn()
    mockAdd.mockResolvedValue(null)

    expect((await POST(jsonRequest({ kind: 'scene', body: 'Mine' }), { params })).status).toBe(404)
  })
})

describe('PATCH', () => {
  it('401s without a session, 503s without a database', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await PATCH(jsonRequest({}), { params })).status).toBe(401)

    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)
    expect((await PATCH(jsonRequest({}), { params })).status).toBe(503)
  })

  it('400s a body that is not JSON, an empty order and a repeated line', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Request

    expect((await PATCH(broken, { params })).status).toBe(400)
    expect((await PATCH(jsonRequest({ kind: 'scene', ids: [] }), { params })).status).toBe(400)

    const repeated = await PATCH(jsonRequest({ kind: 'scene', ids: [ITEM_ID, ITEM_ID] }), {
      params,
    })
    expect(await repeated.json()).toEqual({ error: 'That order repeats a line' })
    expect(mockReorder).not.toHaveBeenCalled()
  })

  it('reorders one kind and hands back the renumbered lines', async () => {
    signedIn()
    mockReorder.mockResolvedValue([ITEM])

    const response = await PATCH(jsonRequest({ kind: 'secret', ids: [ITEM_ID] }), { params })

    expect(response.status).toBe(200)
    expect(mockReorder).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, 'secret', [ITEM_ID])
    expect(await response.json()).toEqual({ items: [expect.objectContaining({ id: ITEM_ID })] })
  })

  // The data layer refuses a set that is not exactly the plan's current one.
  it('404s an order the data layer refused', async () => {
    signedIn()
    mockReorder.mockResolvedValue(null)

    expect((await PATCH(jsonRequest({ kind: 'scene', ids: [ITEM_ID] }), { params })).status).toBe(
      404,
    )
  })
})
