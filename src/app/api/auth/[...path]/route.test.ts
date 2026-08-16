import type { NextRequest } from 'next/server'

import { GET, POST } from './route'

// The sign-up door's hinge (DND-044, D20). The page's UI can be bypassed with
// curl; this proxy cannot — so what these tests pin is that a sign-up POST
// never reaches the Neon handler without a valid invite cookie, that the door
// is shut outright with no code configured, and that nothing else is gated.
const mockNeonGet = jest.fn(async () => ({ status: 200, from: 'neon-get' }))
const mockNeonPost = jest.fn(async () => ({ status: 200, from: 'neon-post' }))

jest.mock('@/lib/auth/server', () => ({
  getAuth: jest.fn(() => ({
    handler: () => ({ GET: mockNeonGet, POST: mockNeonPost }),
  })),
}))

import { INVITE_COOKIE } from '@/lib/auth/invite'

const ORIGINAL = process.env.SIGNUP_INVITE_CODE

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.SIGNUP_INVITE_CODE
  } else {
    process.env.SIGNUP_INVITE_CODE = ORIGINAL
  }
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
  })

  it('gates any path with a sign-up segment, wherever it sits', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    const response = await POST(requestWithCookie(), context('sign-up'))

    expect(response.status).toBe(403)
    expect(mockNeonPost).not.toHaveBeenCalled()
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
