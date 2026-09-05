import { PUT } from './route'

// The one page's endpoint (`first-table/session-zero-one-pager`): who reaches
// it, that an emptied page clears rather than 400s, and that the length is
// held to one page.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  setCampaignSessionZero: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { setCampaignSessionZero, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSet = setCampaignSessionZero as jest.MockedFunction<typeof setCampaignSessionZero>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PAGE = 'The pitch — a lighthouse that should not be lit.\n\nPhones — face down.'

const WRITTEN: Campaign = {
  id: ID,
  dmUserId: DM,
  name: 'The Tutorial',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: PAGE,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-09-05T09:00:00.000Z'),
}

const params = Promise.resolve({ id: ID })

function body(payload: unknown): Request {
  return { json: async () => payload } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockSet.mockResolvedValue(WRITTEN)
})

describe('PUT /api/campaigns/[id]/session-zero', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    expect((await PUT(body({ body: PAGE }), { params })).status).toBe(401)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PUT(body({ body: PAGE }), { params })).status).toBe(503)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('answers 400 to a body that is not JSON, has no page, or is more than one page', async () => {
    signedIn()
    const broken = {
      json: async () => {
        throw new Error('Unexpected token')
      },
    } as unknown as Request

    expect((await PUT(broken, { params })).status).toBe(400)
    expect((await PUT(body({}), { params })).status).toBe(400)
    expect((await PUT(body({ body: 'x'.repeat(5_001) }), { params })).status).toBe(400)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('writes the page scoped to the session user and answers with the campaign', async () => {
    signedIn()

    const response = await PUT(body({ body: `  ${PAGE}  ` }), { params })
    const answered = await response.json()

    expect(response.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(DM, ID, PAGE)
    expect(answered.campaign.sessionZero).toBe(PAGE)
  })

  it('clears the page on an empty body — a legitimate save, not a 400', async () => {
    signedIn()
    mockSet.mockResolvedValue({ ...WRITTEN, sessionZero: null })

    const response = await PUT(body({ body: '   ' }), { params })

    expect(response.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(DM, ID, null)
  })

  it('answers 404 for a campaign someone else runs — same as one that never existed', async () => {
    signedIn()
    mockSet.mockResolvedValue(null)

    expect((await PUT(body({ body: PAGE }), { params })).status).toBe(404)
  })
})
