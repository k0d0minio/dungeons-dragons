import { POST } from './route'

// Rotating a table-screen token (D24) — the join-code rotation, restated for
// encounters. A miss stays a 404; the old link dies server-side.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/encounters', () => ({
  regenerateShareToken: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { regenerateShareToken } from '@/lib/db/encounters'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockRegenerateShareToken = regenerateShareToken as jest.MockedFunction<
  typeof regenerateShareToken
>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

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
  mockRegenerateShareToken.mockResolvedValue({
    id: ID,
    shareToken: 'aFr3shT0kenRightHere22',
  } as unknown as Awaited<ReturnType<typeof regenerateShareToken>>)
})

describe('POST /api/encounters/[id]/share-token', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await POST(request, { params })

    expect(response.status).toBe(401)
    expect(mockRegenerateShareToken).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(request, { params })

    expect(response.status).toBe(503)
  })

  it('rotates the token scoped to the session user and answers with the row', async () => {
    signedIn()

    const response = await POST(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRegenerateShareToken).toHaveBeenCalledWith(DM, ID)
    expect(body.encounter.shareToken).toBe('aFr3shT0kenRightHere22')
  })

  it('answers 404 for an encounter someone else runs', async () => {
    signedIn()
    mockRegenerateShareToken.mockResolvedValue(null)

    const response = await POST(request, { params })

    expect(response.status).toBe(404)
  })
})
