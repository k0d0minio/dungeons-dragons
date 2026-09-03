import { POST } from './route'

// The DM-only door to invites (`user-management/invites-and-roles`, D19).
// A player gets an honest 403; what reaches `createInvite` is exactly the
// validated shape, with the DM as its maker.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/invites', () => ({
  createInvite: jest.fn(),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createInvite } from '@/lib/db/invites'
import { isDm } from '@/lib/db/roles'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreateInvite = createInvite as jest.MockedFunction<typeof createInvite>
const mockIsDm = isDm as jest.MockedFunction<typeof isDm>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'

const STORED = {
  id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  token: 'kfEbCq3vX9pLm2Rt8sWz1A',
  role: 'player',
  label: 'Sam',
  email: null,
  createdBy: DM,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  expiresAt: new Date('2026-09-17T10:00:00.000Z'),
  revokedAt: null,
  claimedAt: null,
  claimedByUserId: null,
}

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
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
  mockCreateInvite.mockResolvedValue(STORED)
})

describe('POST /api/dm/invites', () => {
  it('answers 401 when signed out', async () => {
    const response = await POST(jsonRequest({ role: 'player' }))

    expect(response.status).toBe(401)
    expect(mockCreateInvite).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ role: 'player' }))

    expect(response.status).toBe(503)
    expect(mockCreateInvite).not.toHaveBeenCalled()
  })

  it('answers 403 to a player — the role is not a secret, so no 404', async () => {
    signedIn()
    mockIsDm.mockResolvedValue(false)

    const response = await POST(jsonRequest({ role: 'player' }))

    expect(response.status).toBe(403)
    expect(mockCreateInvite).not.toHaveBeenCalled()
  })

  it('answers 400 to a body that is not JSON', async () => {
    signedIn()
    const unparseable = {
      json: async () => {
        throw new SyntaxError('bad')
      },
    } as unknown as Request

    expect((await POST(unparseable)).status).toBe(400)
  })

  it('answers 400 to a role that is not dm or player, and to a malformed email', async () => {
    signedIn()

    expect((await POST(jsonRequest({ role: 'wizard' }))).status).toBe(400)
    expect((await POST(jsonRequest({ role: 'player', email: 'not-an-email' }))).status).toBe(400)
    expect(mockCreateInvite).not.toHaveBeenCalled()
  })

  it('mints the invite for the DM with the validated shape, and answers 201', async () => {
    signedIn()

    const response = await POST(
      jsonRequest({ role: 'dm', label: '  Sam ', email: 'sam@example.com' }),
    )

    expect(response.status).toBe(201)
    expect(mockCreateInvite).toHaveBeenCalledWith({
      createdBy: DM,
      role: 'dm',
      label: 'Sam',
      email: 'sam@example.com',
    })
    expect(await response.json()).toEqual({ invite: STORED })
  })

  it('accepts an empty email as none', async () => {
    signedIn()

    const response = await POST(jsonRequest({ role: 'player', label: '', email: '' }))

    expect(response.status).toBe(201)
    expect(mockCreateInvite).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'player', label: '', email: '' }),
    )
  })
})
