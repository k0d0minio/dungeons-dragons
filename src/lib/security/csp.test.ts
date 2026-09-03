import { contentSecurityPolicy, sentryIngestOrigin } from './csp'

// The header added by `dm-prep-suite/locations-handouts`, because that is the
// ticket where the app first renders a file a user uploaded.

/** The policy as a lookup, so a test asserts on a directive rather than a substring. */
function directives(value: string): Record<string, string[]> {
  return Object.fromEntries(
    value.split('; ').map((part) => {
      const [name, ...sources] = part.split(' ')
      return [name, sources]
    }),
  )
}

describe('contentSecurityPolicy', () => {
  const policy = directives(contentSecurityPolicy())

  it('holds scripts, and everything unlisted, to this origin', () => {
    expect(policy['default-src']).toEqual(["'self'"])
    expect(policy['script-src']).toContain("'self'")
    expect(policy['script-src']).not.toContain('https:')
  })

  // The directives that actually blunt a stored payload: no plugin can
  // reinterpret an upload, nothing can re-point relative URLs, and no form can
  // post a session somewhere else.
  it('shuts the doors a stored file would otherwise knock on', () => {
    expect(policy['object-src']).toEqual(["'none'"])
    expect(policy['base-uri']).toEqual(["'self'"])
    expect(policy['form-action']).toEqual(["'self'"])
  })

  it('says the X-Frame-Options rule again in the modern spelling', () => {
    expect(policy['frame-ancestors']).toEqual(["'none'"])
    expect(policy['frame-src']).toEqual(["'none'"])
  })

  it('allows the two image sources the app itself produces', () => {
    // `self` is the authed image route; `blob:` is the local preview a file
    // input hands the page; `data:` is inlined icons. No remote host.
    expect(policy['img-src']).toEqual(["'self'", 'data:', 'blob:'])
  })

  it('allows the service worker, which is what makes /offline work', () => {
    expect(policy['worker-src']).toContain("'self'")
  })

  // Turbopack's hot reload evaluates code; a production build does not.
  it('permits eval only while developing', () => {
    expect(policy['script-src']).not.toContain("'unsafe-eval'")

    const dev = directives(contentSecurityPolicy({ development: true }))
    expect(dev['script-src']).toContain("'unsafe-eval'")
  })

  it('connects nowhere but this origin when Sentry is not configured', () => {
    // Neon Auth is proxied through `/api/auth/*` and blob objects come through
    // the app's own image route, so neither needs naming here.
    expect(policy['connect-src']).toEqual(["'self'"])
  })

  it('adds the exact Sentry ingest origin the DSN names, and no wildcard', () => {
    const withSentry = directives(
      contentSecurityPolicy({ sentryDsn: 'https://abc123@o42.ingest.de.sentry.io/7' }),
    )

    expect(withSentry['connect-src']).toEqual(["'self'", 'https://o42.ingest.de.sentry.io'])
    expect(withSentry['connect-src']).not.toContain('https://*.sentry.io')
  })

  it('is one header value, with every directive named once', () => {
    const value = contentSecurityPolicy()
    const names = value.split('; ').map((part) => part.split(' ')[0])

    expect(new Set(names).size).toBe(names.length)
    expect(value).not.toContain(';;')
  })
})

describe('sentryIngestOrigin', () => {
  it('is the origin of the DSN, which already names it', () => {
    expect(sentryIngestOrigin('https://abc@o1.ingest.sentry.io/2')).toBe(
      'https://o1.ingest.sentry.io',
    )
  })

  it('is nothing at all without a usable DSN — the SDK sends nothing either', () => {
    expect(sentryIngestOrigin(undefined)).toBeNull()
    expect(sentryIngestOrigin('')).toBeNull()
    expect(sentryIngestOrigin('not a url')).toBeNull()
  })
})
