import type { NextRequest } from 'next/server'

import { GET, POST } from './route'

// The sign-up door's hinge (DND-044, D20; `user-management/invites-and-roles`).
// The page's UI can be bypassed with curl; this proxy cannot — so what these
// tests pin is that a sign-up POST never reaches the Neon handler without a
// cookie that admits it (the shared code, or a live tokenised invite), that
// the door is shut outright with neither, that nothing else is gated, and
// that a tokenised invite is claimed for whoever just signed up or in.
const mockNeonGet = jest.fn(async () => ({ status: 200, from: 'neon-get' }))
const mockNeonPost = jest.fn(async (): Promise<unknown> => ({ status: 200, from: 'neon-post' }))

jest.mock('@/lib/auth/server', () => ({
  getAuth: jest.fn(() => ({
    handler: () => ({ GET: mockNeonGet, POST: mockNeonPost }),
  })),
}))

let databaseReady = true
let liveToken: string | null = null
const mockClaimInvite = jest.fn(async (): Promise<unknown> => null)

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/invites', () => ({
  ...jest.requireActual('@/lib/db/invites'),
  findClaimableInvite: jest.fn(async (token: string) =>
    token === liveToken ? { token, role: 'player' } : null,
  ),
  claimInvite: (...args: unknown[]) => mockClaimInvite(...(args as [])),
}))

jest.mock('@/lib/observability/sentry', () => ({
  captureError: jest.fn(),
}))

import { INVITE_COOKIE } from '@/lib/auth/invite'
import { captureError } from '@/lib/observability/sentry'

const ORIGINAL = process.env.SIGNUP_INVITE_CODE
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'
const USER = '90684dfa-e5a7-487c-9aee-aa3c5532b57d'

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.SIGNUP_INVITE_CODE
  } else {
    process.env.SIGNUP_INVITE_CODE = ORIGINAL
  }
  databaseReady = true
  liveToken = null
  mockNeonPost.mockImplementation(async () => ({ status: 200, from: 'neon-post' }))
})

/** A stand-in for the NextRequest the route receives: only the cookie jar matters. */
function requestWithCookie(value?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === INVITE_COOKIE && value !== undefined ? { name, value } : undefined,
    },
  } as unknown as NextRequest
}

function context(...path: string[]) {
  return { params: Promise.resolve({ path }) }
}

/** What Neon answers a successful sign-up/sign-in with, as far as the claim reads it. */
function neonSession(user: unknown, status = 200) {
  return { status, clone: () => ({ json: async () => ({ user }) }) }
}

describe('POST /api/auth/[...path] on a sign-up path', () => {
  it('answers 403 without forwarding when no invite code is configured', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    const response = await POST(requestWithCookie('red-dragon-inn'), context('sign-up', 'email'))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: expect.stringMatching(/closed/i) }),
    )
    expect(mockNeonPost).not.toHaveBeenCalled()
  })

  it('answers 403 without forwarding when the invite cookie is missing', async () => {
    process.env.SIGNUP_INVITE_CODE = 'red-dragon-inn'

    const response = await POST(requestWithCookie(), context('sign-up', 'email'))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: expect.stringMatching(/needs an invite/i) }),
    )
    expect(mockNeonPost).not.toHaveBeenCalled()
  })

  it('answers 403 without forwarding when the invite cookie is wrong', async () => {
    process.env.SIGNUP_INVITE_CODE = 'red-dragon-inn'

    const response = await POST(requestWithCookie('stale-or-forged'), context('sign-up', 'email'))

    expect(response.status).toBe(403)
    expect(mockNeonPost).not.toHaveBeenCalled()
  })

  it('forwards to the Neon handler with a valid invite cookie', async () => {
    process.env.SIGNUP_INVITE_CODE = 'red-dragon-inn'

    const request = requestWithCookie('red-dragon-inn')
    const routeContext = context('sign-up', 'email')
    const response = await POST(request, routeContext)

    expect(mockNeonPost).toHaveBeenCalledWith(request, routeContext)
    expect(response).toEqual({ status: 200, from: 'neon-post' })
    expect(mockClaimInvite).not.toHaveBeenCalled()
  })

  it('gates any path with a sign-up segment, wherever it sits', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    const response = await POST(requestWithCookie(), context('sign-up'))

    expect(response.status).toBe(403)
    expect(mockNeonPost).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/[...path] with a tokenised invite', () => {
  beforeEach(() => {
    delete process.env.SIGNUP_INVITE_CODE
    liveToken = TOKEN
  })

  it('admits a sign-up on a live token with no shared code configured, and claims it', async () => {
    mockNeonPost.mockImplementation(async () => neonSession({ id: USER }))

    const request = requestWithCookie(TOKEN)
    const response = await POST(request, context('sign-up', 'email'))

    expect(mockNeonPost).toHaveBeenCalledWith(request, expect.anything())
    expect(response.status).toBe(200)
    expect(mockClaimInvite).toHaveBeenCalledWith(TOKEN, USER)
  })

  it('claims the invite on a sign-in too — an existing account can be handed a role', async () => {
    mockNeonPost.mockImplementation(async () => neonSession({ id: USER }))

    await POST(requestWithCookie(TOKEN), context('sign-in', 'email'))

    expect(mockClaimInvite).toHaveBeenCalledWith(TOKEN, USER)
  })

  it('refuses a sign-up on a token that is no longer live', async () => {
    liveToken = null

    const response = await POST(requestWithCookie(TOKEN), context('sign-up', 'email'))

    expect(response.status).toBe(403)
    expect(mockNeonPost).not.toHaveBeenCalled()
  })

  it('claims nothing when Neon did not open a session', async () => {
    mockNeonPost.mockImplementation(async () => neonSession(null, 401))

    await POST(requestWithCookie(TOKEN), context('sign-in', 'email'))

    expect(mockClaimInvite).not.toHaveBeenCalled()
  })

  it('claims nothing when the response names no user', async () => {
    mockNeonPost.mockImplementation(async () => neonSession({ email: 'x@example.com' }))

    await POST(requestWithCookie(TOKEN), context('sign-in', 'email'))

    expect(mockClaimInvite).not.toHaveBeenCalled()
  })

  it('claims nothing on a sign-out, whatever the cookie says', async () => {
    mockNeonPost.mockImplementation(async () => neonSession({ id: USER }))

    await POST(requestWithCookie(TOKEN), context('sign-out'))

    expect(mockClaimInvite).not.toHaveBeenCalled()
  })

  it('returns the session untouched when the claim itself fails, and reports it', async () => {
    const neon = neonSession({ id: USER })
    mockNeonPost.mockImplementation(async () => neon)
    mockClaimInvite.mockRejectedValueOnce(new Error('connection reset'))

    const response = await POST(requestWithCookie(TOKEN), context('sign-in', 'email'))

    expect(response).toBe(neon)
    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'claim-invite' }),
    )
  })

  it('never touches the database without one', async () => {
    databaseReady = false
    mockNeonPost.mockImplementation(async () => neonSession({ id: USER }))

    const response = await POST(requestWithCookie(TOKEN), context('sign-up', 'email'))

    expect(response.status).toBe(403)
    expect(mockClaimInvite).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/[...path] on everything else', () => {
  it('never gates a sign-in, even with the door shut and no cookie', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    const request = requestWithCookie()
    const routeContext = context('sign-in', 'email')
    const response = await POST(request, routeContext)

    expect(mockNeonPost).toHaveBeenCalledWith(request, routeContext)
    expect(response).toEqual({ status: 200, from: 'neon-post' })
  })

  it('never gates a sign-out', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    await POST(requestWithCookie(), context('sign-out'))

    expect(mockNeonPost).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/auth/[...path]', () => {
  it('forwards untouched — the gate is on POST, where registration happens', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    const request = requestWithCookie()
    const routeContext = context('get-session')
    const response = await GET(request, routeContext)

    expect(mockNeonGet).toHaveBeenCalledWith(request, routeContext)
    expect(response).toEqual({ status: 200, from: 'neon-get' })
  })
})
