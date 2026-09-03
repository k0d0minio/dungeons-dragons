import { DELETE } from './route'

// Unlinking (`dm-prep-suite/session-plans`). The status matrix; the thing the
// link pointed at is never touched, which is the data layer's business and is
// asserted there.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  deleteSessionPlanLink: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteSessionPlanLink } from '@/lib/db/session-plans'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockDelete = deleteSessionPlanLink as jest.MockedFunction<typeof deleteSessionPlanLink>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const LINK_ID = '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e'

const params = Promise.resolve({ id: CAMPAIGN_ID, planId: PLAN_ID, linkId: LINK_ID })
const request = {} as Request

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockIsDatabaseConfigured.mockReturnValue(true)
})

describe('DELETE', () => {
  it('401s without a session, 503s without a database', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    expect((await DELETE(request, { params })).status).toBe(401)

    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)
    expect((await DELETE(request, { params })).status).toBe(503)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('unlinks, and 404s when there was nothing to unlink', async () => {
    signedIn()

    mockDelete.mockResolvedValue(true)
    expect((await DELETE(request, { params })).status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith(DM, CAMPAIGN_ID, PLAN_ID, LINK_ID)

    mockDelete.mockResolvedValue(false)
    expect((await DELETE(request, { params })).status).toBe(404)
  })
})
