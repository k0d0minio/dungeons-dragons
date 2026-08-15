// `@sentry/nextjs` is mocked globally in jest.setup.js.
import * as Sentry from '@sentry/nextjs'

import { REPORTED_ERROR_PREFIX, captureError } from './sentry'

describe('initSentry', () => {
  const configuredDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

  // The DSN is read at module scope, so each case needs a fresh module graph.
  function initWith(dsn: string | undefined) {
    if (dsn === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN
    } else {
      process.env.NEXT_PUBLIC_SENTRY_DSN = dsn
    }

    jest.resetModules()

    require('./sentry').initSentry()
    return require('@sentry/nextjs').init as jest.Mock
  }

  afterEach(() => {
    if (configuredDsn === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN
    } else {
      process.env.NEXT_PUBLIC_SENTRY_DSN = configuredDsn
    }
    jest.resetModules()
  })

  it('stays out of the way when no DSN is configured', () => {
    // The state a fresh clone, a preview deploy without secrets and this suite
    // are all in. Nothing initialised means every capture is a no-op, and the
    // app is exactly what it was before Sentry existed.
    expect(initWith(undefined)).not.toHaveBeenCalled()
  })

  it('reports errors and nothing else when a DSN is configured', () => {
    expect(initWith('https://key@o0.ingest.sentry.io/1')).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@o0.ingest.sentry.io/1',
        // No tracing, no profiling, no replay: this app carries no trackers,
        // and that is a deliberate state worth preserving.
        tracesSampleRate: 0,
        // No IP addresses, no cookies, no request headers.
        sendDefaultPii: false,
      })
    )
  })
})

describe('captureError', () => {
  it('sends the error to Sentry and leaves a console line behind', () => {
    // The console line is not redundant: it is what the Vercel Runtime Log
    // shows during the session the crash happened in, which is the only view
    // available before Sentry has ingested anything.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('the beholder ate the database')

    captureError(error)

    expect(Sentry.captureException).toHaveBeenCalledWith(error, undefined)
    expect(consoleError).toHaveBeenCalledWith(REPORTED_ERROR_PREFIX, error)
  })

  it('pins context to the event so Saturday knows which thing broke', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('D&D API error: 503 Service Unavailable')
    const context = { route: '/api/dnd5e/spells' }

    captureError(error, context)

    expect(Sentry.captureException).toHaveBeenCalledWith(error, { extra: context })
    expect(consoleError).toHaveBeenCalledWith(REPORTED_ERROR_PREFIX, error, context)
  })

  it('marks its console line so the suite can silence it precisely', () => {
    // jest.setup.js filters on this prefix rather than blanking console.error
    // wholesale, which is what used to make a real error in a test invisible.
    // If the two drift apart, that hole reopens — hence this test.
    expect(REPORTED_ERROR_PREFIX).toBe('[error]')
  })
})
