import { DELETE } from './route'

// Revoking an invite (`user-management/invites-and-roles`). DM-only, and an
// invite that is not open answers 404 whatever the reason.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/invites', () => ({
  revokeInvite: jest.fn(),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { revokeInvite } from '@/lib/db/invites'
import { isDm } from '@/lib/db/roles'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockRevokeInvite = revokeInvite as jest.MockedFunction<typeof revokeInvite>
const mockIsDm = isDm as jest.MockedFunction<typeof isDm>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const INVITE_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockIsDm.mockResolvedValue(true)
  mockRevokeInvite.mockResolvedValue(null)
})

describe('DELETE /api/dm/invites/[id]', () => {
  it('answers 401 when signed out', async () => {
    expect((await DELETE({} as Request, context(INVITE_ID))).status).toBe(401)
    expect(mockRevokeInvite).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await DELETE({} as Request, context(INVITE_ID))).status).toBe(503)
  })

  it('answers 403 to a player', async () => {
    signedIn()
    mockIsDm.mockResolvedValue(false)

    expect((await DELETE({} as Request, context(INVITE_ID))).status).toBe(403)
    expect(mockRevokeInvite).not.toHaveBeenCalled()
  })

  it('revokes an open invite and returns it', async () => {
    signedIn()
    const revoked = { id: INVITE_ID, revokedAt: new Date() }
    mockRevokeInvite.mockResolvedValue(
      revoked as unknown as Awaited<ReturnType<typeof revokeInvite>>,
    )

    const response = await DELETE({} as Request, context(INVITE_ID))

    expect(response.status).toBe(200)
    expect(mockRevokeInvite).toHaveBeenCalledWith(INVITE_ID)
    expect(await response.json()).toEqual({ invite: revoked })
  })

  it('answers 404 when nothing open matched', async () => {
    signedIn()

    expect((await DELETE({} as Request, context(INVITE_ID))).status).toBe(404)
  })

  it('answers 404 to an id that is not even uuid-shaped, without a query', async () => {
    signedIn()

    expect((await DELETE({} as Request, context('nope'))).status).toBe(404)
    expect(mockRevokeInvite).not.toHaveBeenCalled()
  })
})
