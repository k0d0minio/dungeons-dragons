import { PUT } from './route'

// Setting a role (`user-management/invites-and-roles`, D19). DM-only, and
// never on yourself — the lock-out guard is the point of this file.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/users', () => ({
  ...jest.requireActual('@/lib/db/users'),
  setUserRole: jest.fn(),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'
import { setUserRole } from '@/lib/db/users'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetUserRole = setUserRole as jest.MockedFunction<typeof setUserRole>
const mockIsDm = isDm as jest.MockedFunction<typeof isDm>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const SAM = '3dc11dd3-fc15-408b-8701-bd4d991f0e1c'

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

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
  mockSetUserRole.mockResolvedValue(undefined)
})

describe('PUT /api/dm/users/[id]/role', () => {
  it('answers 401 when signed out', async () => {
    expect((await PUT(jsonRequest({ role: 'dm' }), context(SAM))).status).toBe(401)
    expect(mockSetUserRole).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PUT(jsonRequest({ role: 'dm' }), context(SAM))).status).toBe(503)
  })

  it('answers 403 to a player', async () => {
    signedIn()
    mockIsDm.mockResolvedValue(false)

    expect((await PUT(jsonRequest({ role: 'dm' }), context(SAM))).status).toBe(403)
    expect(mockSetUserRole).not.toHaveBeenCalled()
  })

  it('refuses to change your own role — the lock-out guard', async () => {
    signedIn()

    const response = await PUT(jsonRequest({ role: 'player' }), context(DM))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toMatch(/your own role/i)
    expect(mockSetUserRole).not.toHaveBeenCalled()
  })

  it('answers 400 to a body that is not JSON', async () => {
    signedIn()
    const unparseable = {
      json: async () => {
        throw new SyntaxError('bad')
      },
    } as unknown as Request

    expect((await PUT(unparseable, context(SAM))).status).toBe(400)
  })

  it('answers 400 to a role that is not dm or player', async () => {
    signedIn()

    expect((await PUT(jsonRequest({ role: 'wizard' }), context(SAM))).status).toBe(400)
    expect((await PUT(jsonRequest({}), context(SAM))).status).toBe(400)
    expect(mockSetUserRole).not.toHaveBeenCalled()
  })

  it('sets the role and echoes it', async () => {
    signedIn()

    const response = await PUT(jsonRequest({ role: 'dm' }), context(SAM))

    expect(response.status).toBe(200)
    expect(mockSetUserRole).toHaveBeenCalledWith(SAM, 'dm')
    expect(await response.json()).toEqual({ user: { id: SAM, role: 'dm' } })
  })
})
