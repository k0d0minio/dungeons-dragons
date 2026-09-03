import { POST } from './route'

// What tonight touches (`dm-prep-suite/session-plans`). The status matrix, and
// the one behaviour worth pinning beyond it: linking the same thing twice is a
// success, because the data layer hands back the link that already exists.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  addSessionPlanLink: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { addSessionPlanLink, type SessionPlanLink } from '@/lib/db/session-plans'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockAdd = addSessionPlanLink as jest.MockedFunction<typeof addSessionPlanLink>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const NPC_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'

const LINK: SessionPlanLink = {
  id: '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e',
  planId: PLAN_ID,
  npcId: NPC_ID,
  locationId: null,
  encounterId: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
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

  it('400s a body that is not JSON, a fourth kind and a missing target', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Request

    expect((await POST(broken, { params })).status).toBe(400)
    expect(
      (await POST(jsonRequest({ kind: 'handout', targetId: NPC_ID }), { params })).status,
    ).toBe(400)
    expect((await POST(jsonRequest({ kind: 'npc' }), { params })).status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('201s the new link', async () => {
    signedIn()
    mockAdd.mockResolvedValue(LINK)

    const response = await POST(jsonRequest({ kind: 'npc', targetId: NPC_ID }), { params })

    expect(response.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, 'npc', NPC_ID)
  })

  it('404s a plan or a target this DM cannot reach — never 403', async () => {
    signedIn()
    mockAdd.mockResolvedValue(null)

    expect((await POST(jsonRequest({ kind: 'npc', targetId: NPC_ID }), { params })).status).toBe(
      404,
    )
  })
})
