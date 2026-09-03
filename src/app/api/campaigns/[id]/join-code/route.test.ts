import { POST } from './route'

// Rotating a join code (DND-046). Authority lives in the query — the data
// layer folds `dm_user_id` into the WHERE clause — so what these tests pin is
// that the session user is who reaches it, and that a miss stays a 404.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/campaigns', () => ({
  regenerateJoinCode: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { regenerateJoinCode, type Campaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockRegenerateJoinCode = regenerateJoinCode as jest.MockedFunction<typeof regenerateJoinCode>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const ROTATED: Campaign = {
  id: ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'aFr3shC0deRightHere22x',
  gates: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-15T09:00:00.000Z'),
}

const params = Promise.resolve({ id: ID })

const request = {} as unknown as Request

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockRegenerateJoinCode.mockResolvedValue(ROTATED)
})

describe('POST /api/campaigns/[id]/join-code', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await POST(request, { params })

    expect(response.status).toBe(401)
    expect(mockRegenerateJoinCode).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(request, { params })

    expect(response.status).toBe(503)
    expect(mockRegenerateJoinCode).not.toHaveBeenCalled()
  })

  it('rotates the code scoped to the session user and answers with the row', async () => {
    signedIn()

    const response = await POST(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRegenerateJoinCode).toHaveBeenCalledWith(DM, ID)
    expect(body.campaign).toEqual(ROTATED)
  })

  it('answers 404 for a campaign someone else runs — same as one that never existed', async () => {
    signedIn()
    mockRegenerateJoinCode.mockResolvedValue(null)

    const response = await POST(request, { params })

    expect(response.status).toBe(404)
  })
})
