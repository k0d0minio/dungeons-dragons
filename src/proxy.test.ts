/**
 * The sign-in wall (D34). These tests are the exception list: every path the
 * app serves without a session is named here, and everything else is asserted
 * to need one. A path that quietly changes sides fails a test rather than a
 * player.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextResponse: { next: jest.fn() },
}))

jest.mock('@/lib/auth/server', () => ({
  SIGN_IN_PATH: '/auth/sign-in',
  getAuth: jest.fn(),
  isAuthConfigured: jest.fn(),
}))

import { NextResponse } from 'next/server'

import { getAuth, isAuthConfigured } from '@/lib/auth/server'

import manifest from './app/manifest'
import proxy, { config, isPublicPath } from './proxy'

const mockNext = NextResponse.next as unknown as jest.Mock
const mockGetAuth = getAuth as unknown as jest.Mock
const mockIsAuthConfigured = isAuthConfigured as unknown as jest.Mock

const PASSED_THROUGH = { passedThrough: true }
const AUTH_ANSWER = { fromNeonAuth: true }

const neonAuthMiddleware = jest.fn()

beforeEach(() => {
  mockNext.mockReturnValue(PASSED_THROUGH)
  neonAuthMiddleware.mockResolvedValue(AUTH_ANSWER)
  mockGetAuth.mockReturnValue({ middleware: jest.fn(() => neonAuthMiddleware) })
  mockIsAuthConfigured.mockReturnValue(true)
})

function requestFor(pathname: string, search = '') {
  return { nextUrl: { pathname, search } } as unknown as NextRequest
}

/** The `loginUrl` the proxy handed Neon Auth for the last request. */
function loginUrlUsed(): string {
  const middleware = mockGetAuth.mock.results.at(-1)?.value.middleware as jest.Mock
  return middleware.mock.calls.at(-1)?.[0]?.loginUrl
}

describe('the public surface (D34)', () => {
  it.each([
    ['/', 'the front door: the welcome screen and the PWA start_url (D33)'],
    ['/offline', 'the service worker caches it at install, signed-out'],
    ['/auth/sign-in', 'the door itself'],
    ['/auth/sign-up', 'invite-gated on its own (D20), not by the wall'],
    ['/auth/forgot-password', 'every Neon Auth view is one route'],
    ['/table/kfEbCq3vX9pLm2Rt8sWz1A', 'the token is the credential (D24)'],
  ])('%s stays reachable without a session — %s', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true)
  })

  it.each([
    ['/api/srd/spells', 'SRD reference data: public and CDN-cached (D34)'],
    ['/api/srd/monsters/goblin', 'same'],
    ['/api/table/kfEbCq3vX9pLm2Rt8sWz1A', 'the table screen feed (D24)'],
    ['/api/invite', 'the invite gate has to answer before anyone has a session'],
    ['/api/auth/session', 'the auth handler itself'],
    ['/api/characters', 'guarded in-route: an API caller gets a 401, not HTML'],
    ['/api/campaigns/abc/notes', 'same'],
  ])('%s is left to the route handler — %s', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true)
  })

  it.each([
    '/sw.js',
    '/manifest.webmanifest',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
    '/favicon.ico',
    '/_next/static/chunks/main.js',
  ])('%s is a static asset and never redirects', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true)
  })
})

describe('everything else needs a session (D34)', () => {
  it.each([
    '/characters',
    '/characters/new',
    '/characters/3dc11dd3-fc15-408b-8701-bd4d991f0e1c',
    '/characters/3dc11dd3-fc15-408b-8701-bd4d991f0e1c/edit',
    '/characters/3dc11dd3-fc15-408b-8701-bd4d991f0e1c/level',
    '/dm',
    '/dm/campaigns/8c1f',
    '/dm/encounters/8c1f',
    '/account/settings',
    '/campaigns/join/RIME42',
  ])('%s is behind the wall', (pathname) => {
    expect(isPublicPath(pathname)).toBe(false)
  })

  it.each([
    ['/library', 'the reference browser is no longer public'],
    ['/rules', 'nor are the rules chapters'],
    ['/rules/combat', 'nor any chapter'],
    ['/rules/conditions', 'nor any chapter'],
  ])('%s is behind the wall now — %s', (pathname) => {
    expect(isPublicPath(pathname)).toBe(false)
  })

  it.each(['/authors', '/auth-help', '/tables', '/tableau', '/offline-mode', '/apis/characters'])(
    '%s does not slip in on a shared prefix',
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false)
    },
  )

  it('only reads the last segment for a file extension', () => {
    expect(isPublicPath('/rules/v1.2/combat')).toBe(false)
  })
})

describe('the PWA still installs signed-out', () => {
  it('leaves the manifest start_url public, so an installed client lands somewhere real', () => {
    expect(isPublicPath(manifest().start_url as string)).toBe(true)
  })

  it("leaves the service worker's offline fallback public, so cache.add() succeeds at install", () => {
    const source = readFileSync(join(__dirname, '..', 'public', 'sw.js'), 'utf8')
    const offlineUrl = /const OFFLINE_URL = '([^']+)'/.exec(source)?.[1]

    // Behind the wall this `cache.add()` would fail the install, or cache a
    // redirect to sign-in as the permanent offline page.
    expect(offlineUrl).toBe('/offline')
    expect(isPublicPath(offlineUrl as string)).toBe(true)
    expect(isPublicPath('/sw.js')).toBe(true)
  })
})

describe('the matcher', () => {
  // Next compiles this with path-to-regexp; a plain RegExp is close enough to
  // catch the typo that would drop a whole subtree out of the wall.
  const matcher = new RegExp(`^${config.matcher[0]}$`)

  it('takes every page, so nothing is protected by omission', () => {
    for (const pathname of ['/', '/library', '/rules/combat', '/characters/abc', '/dm']) {
      expect(matcher.test(pathname)).toBe(true)
    }
  })

  it("skips Next's own build output, which has no session to check", () => {
    expect(matcher.test('/_next/static/chunks/main.js')).toBe(false)
    expect(matcher.test('/_next/image')).toBe(false)
  })
})

describe('proxy()', () => {
  it('passes a public path straight through without asking Neon Auth', async () => {
    const response = await proxy(requestFor('/table/kfEbCq3vX9pLm2Rt8sWz1A'))

    expect(response).toBe(PASSED_THROUGH)
    expect(neonAuthMiddleware).not.toHaveBeenCalled()
  })

  it('hands a protected path to Neon Auth', async () => {
    const request = requestFor('/characters')

    const response = await proxy(request)

    expect(neonAuthMiddleware).toHaveBeenCalledWith(request)
    expect(response).toBe(AUTH_ANSWER)
  })

  it('passes through when Neon Auth is not configured — there is no session to check', async () => {
    mockIsAuthConfigured.mockReturnValue(false)

    const response = await proxy(requestFor('/characters'))

    expect(response).toBe(PASSED_THROUGH)
    expect(neonAuthMiddleware).not.toHaveBeenCalled()
  })
})

describe('the wall carries where you were going', () => {
  // The bug this fixes: a DM sends a join link to someone who is by definition
  // signed out, the wall answered `307 /auth/sign-in` flat, and the player
  // landed on their own character with the link gone
  // (`triage/sign-in-return-destination`).
  it('sends a signed-out visitor to sign-in carrying the join link', async () => {
    await proxy(requestFor('/campaigns/join/RIME42'))

    expect(loginUrlUsed()).toBe('/auth/sign-in?redirectTo=%2Fcampaigns%2Fjoin%2FRIME42')
  })

  it.each(['/characters/3dc11dd3-fc15-408b-8701-bd4d991f0e1c', '/dm/campaigns/8c1f', '/library'])(
    'carries %s too — this was never only about join links',
    async (pathname) => {
      await proxy(requestFor(pathname))

      expect(loginUrlUsed()).toBe(`/auth/sign-in?redirectTo=${encodeURIComponent(pathname)}`)
    },
  )

  it('carries the query as well, because a search link without it is a different page', async () => {
    await proxy(requestFor('/library', '?q=fireball'))

    expect(loginUrlUsed()).toBe('/auth/sign-in?redirectTo=%2Flibrary%3Fq%3Dfireball')
  })

  it('builds the destination fresh per request, never reusing the last one', async () => {
    await proxy(requestFor('/campaigns/join/RIME42'))
    await proxy(requestFor('/dm'))

    expect(loginUrlUsed()).toBe('/auth/sign-in?redirectTo=%2Fdm')
  })

  it.each([
    ['//evil-host/harvest', 'a request path that is really a protocol-relative URL'],
    ['/\\evil-host/harvest', 'the backslash spelling browsers normalise to it'],
  ])('drops the destination rather than pointing sign-in off-origin: %s — %s', async (pathname) => {
    // A request path really can start with two slashes, and `redirectTo` is
    // read back by the browser after sign-in. Sending someone to another
    // origin from a link on this app's own domain is the phishing hole this
    // change had to avoid opening, so the destination is dropped instead.
    await proxy(requestFor(pathname))

    const url = new URL(loginUrlUsed(), 'https://companion.example')
    expect(url.origin).toBe('https://companion.example')
    expect(url.pathname).toBe('/auth/sign-in')
    expect(url.searchParams.get('redirectTo')).toBeNull()
  })
})
