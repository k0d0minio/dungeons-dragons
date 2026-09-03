import { POST } from './route'

import { INVITE_COOKIE } from '@/lib/auth/invite'

// A tokenised invite (`user-management/invites-and-roles`) is looked up in
// the database; the lookup itself is `invites.test.ts`'s subject.
let databaseReady = true
let liveToken: string | null = null

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/invites', () => ({
  ...jest.requireActual('@/lib/db/invites'),
  findClaimableInvite: jest.fn(async (token: string) =>
    token === liveToken ? { token, role: 'player' } : null,
  ),
}))

// The invite-for-cookie trade (DND-044). The real gate is the auth proxy; this
// route only mints the cookie, so what these tests pin is that it mints one
// for exactly the right code and nothing else — and answers "closed" rather
// than "wrong" when no code is configured at all.

/** What the mocked NextResponse.json returns, cookie jar included. */
type MockResponse = {
  status: number
  json: () => Promise<Record<string, unknown>>
  cookies: { set: jest.Mock }
}

const ORIGINAL = process.env.SIGNUP_INVITE_CODE

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.SIGNUP_INVITE_CODE
  } else {
    process.env.SIGNUP_INVITE_CODE = ORIGINAL
  }
  databaseReady = true
  liveToken = null
})

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

describe('POST /api/invite with sign-up closed', () => {
  beforeEach(() => {
    delete process.env.SIGNUP_INVITE_CODE
  })

  it('answers 403 whatever the code says — there is nothing to match', async () => {
    const response = (await POST(jsonRequest({ code: 'anything' }))) as unknown as MockResponse

    expect(response.status).toBe(403)
    expect((await response.json()).error).toMatch(/closed/i)
    expect(response.cookies.set).not.toHaveBeenCalled()
  })
})

describe('POST /api/invite with sign-up open', () => {
  beforeEach(() => {
    process.env.SIGNUP_INVITE_CODE = 'red-dragon-inn'
  })

  it('answers 403 to a wrong code and sets no cookie', async () => {
    const response = (await POST(jsonRequest({ code: 'wrong' }))) as unknown as MockResponse

    expect(response.status).toBe(403)
    expect(response.cookies.set).not.toHaveBeenCalled()
  })

  it('answers 403 to a body without a string code', async () => {
    for (const body of [{}, { code: 42 }, { code: null }, 'red-dragon-inn']) {
      const response = (await POST(jsonRequest(body))) as unknown as MockResponse

      expect(response.status).toBe(403)
      expect(response.cookies.set).not.toHaveBeenCalled()
    }
  })

  it('answers 400 to a body that is not JSON', async () => {
    const unparseable = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    const response = (await POST(unparseable)) as unknown as MockResponse

    expect(response.status).toBe(400)
    expect(response.cookies.set).not.toHaveBeenCalled()
  })

  it('trades the right code for the httpOnly cookie the auth proxy checks', async () => {
    const response = (await POST(
      jsonRequest({ code: 'red-dragon-inn' }),
    )) as unknown as MockResponse

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })

    expect(response.cookies.set).toHaveBeenCalledTimes(1)
    const [name, value, options] = response.cookies.set.mock.calls[0]
    expect(name).toBe(INVITE_COOKIE)
    expect(value).toBe('red-dragon-inn')
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
  })

  it('trims the code before checking and storing it — phones paste with whitespace', async () => {
    const response = (await POST(
      jsonRequest({ code: '  red-dragon-inn  ' }),
    )) as unknown as MockResponse

    expect(response.status).toBe(200)
    expect(response.cookies.set.mock.calls[0][1]).toBe('red-dragon-inn')
  })
})

describe('POST /api/invite with a tokenised invite', () => {
  const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

  beforeEach(() => {
    delete process.env.SIGNUP_INVITE_CODE
    liveToken = TOKEN
  })

  it('trades a live token for the cookie, with no shared code configured at all', async () => {
    const response = (await POST(jsonRequest({ token: TOKEN }))) as unknown as MockResponse

    expect(response.status).toBe(200)
    expect(response.cookies.set).toHaveBeenCalledTimes(1)
    const [name, value, options] = response.cookies.set.mock.calls[0]
    expect(name).toBe(INVITE_COOKIE)
    expect(value).toBe(TOKEN)
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
  })

  it('answers 403 to a token that is used, revoked, expired or made up — all alike', async () => {
    const response = (await POST(
      jsonRequest({ token: 'AAAAAAAAAAAAAAAAAAAAAA' }),
    )) as unknown as MockResponse

    expect(response.status).toBe(403)
    expect((await response.json()).error).toMatch(/no longer works/i)
    expect(response.cookies.set).not.toHaveBeenCalled()
  })

  it('answers 403 to a token when there is no database to check it against', async () => {
    databaseReady = false

    const response = (await POST(jsonRequest({ token: TOKEN }))) as unknown as MockResponse

    expect(response.status).toBe(403)
    expect(response.cookies.set).not.toHaveBeenCalled()
  })

  it('answers 403 to something that is not even token-shaped', async () => {
    const response = (await POST(jsonRequest({ token: 'short' }))) as unknown as MockResponse

    expect(response.status).toBe(403)
    expect(response.cookies.set).not.toHaveBeenCalled()
  })
})
