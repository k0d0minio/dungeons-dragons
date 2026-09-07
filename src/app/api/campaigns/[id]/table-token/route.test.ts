import { POST } from './route'

// Minting the campaign's table screen link (`dm-run-suite/table-screen-cast`).
// Authority lives in the query — the data layer folds `dm_user_id` into the
// WHERE clause — so what these tests pin is that the session user is who
// reaches it, and that a miss stays a 404 rather than confirming another DM's
// campaign exists.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/table', () => ({
  regenerateTableToken: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { regenerateTableToken } from '@/lib/db/table'
import type { Campaign } from '@/lib/db/schema'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockRegenerate = regenerateTableToken as jest.MockedFunction<typeof regenerateTableToken>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const CAMPAIGN: Campaign = {
  id: ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'aFr3shC0deRightHere22x',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  tableToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  tableSpotlight: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-09-07T09:00:00.000Z'),
}

const params = Promise.resolve({ id: ID })
const request = {} as unknown as Request

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue({ id: DM } as Awaited<ReturnType<typeof getSessionUser>>)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockRegenerate.mockResolvedValue(CAMPAIGN)
})

describe('POST /api/campaigns/[id]/table-token', () => {
  it('makes a new link for the signed-in DM', async () => {
    const response = await POST(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRegenerate).toHaveBeenCalledWith(DM, ID)
    expect(body.campaign.tableToken).toBe('kfEbCq3vX9pLm2Rt8sWz1A')
  })

  it('answers 401 with no session', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await POST(request, { params })).status).toBe(401)
    expect(mockRegenerate).not.toHaveBeenCalled()
  })

  it('answers 404 for a campaign this user does not run', async () => {
    mockRegenerate.mockResolvedValue(null)

    expect((await POST(request, { params })).status).toBe(404)
  })

  it('answers 503 when the database is not configured', async () => {
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await POST(request, { params })).status).toBe(503)
    expect(mockRegenerate).not.toHaveBeenCalled()
  })
})
