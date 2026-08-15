import { POST } from './route'

import { INVITE_COOKIE } from '@/lib/auth/invite'

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
