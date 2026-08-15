// The one place an error goes (DND-025).
//
// Until now the only sink was `console.error`, which on Vercel means Runtime
// Logs: short retention, not searchable after the fact. A 500 at Friday's
// table was unreconstructable by Saturday, which is exactly when you want to
// know what happened. Sentry's free tier covers a five-person table many times
// over and needs no ongoing attention.
//
// **Sentry is optional by construction.** Without `NEXT_PUBLIC_SENTRY_DSN`
// nothing is initialised, `Sentry.captureException` is a documented no-op, and
// the app behaves precisely as it did before this module existed — which is
// what a fresh clone, a preview deploy with no secrets and the test suite all
// get. Nothing below is allowed to become a reason the app fails to start.
//
// Errors only. No tracing, no profiling, no session replay: those are the
// analytics half of Sentry, and this app deliberately carries no trackers at
// all. That state is worth preserving, so the sample rates below are zero and
// stay zero.

import * as Sentry from '@sentry/nextjs'

/**
 * A DSN is not a secret. It is embedded in the client bundle by design and
 * grants nothing except the right to send events in, so one public variable
 * serves the browser, Node and edge runtimes rather than three that can drift.
 */
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * The prefix on every line `captureError` writes to the console.
 *
 * It is a marker, not decoration: `jest.setup.js` filters on it so the suite
 * can silence the app's own deliberate error paths without silencing every
 * `console.error` the way it used to. Change it there too.
 */
export const REPORTED_ERROR_PREFIX = '[error]'

/**
 * Extra fields pinned to an event — a route, an upstream endpoint, the
 * boundary that caught it. Whatever makes the difference between "something
 * broke" and "the monster lookup broke" once you are reading this on Saturday.
 */
export type ErrorContext = Record<string, unknown>

/**
 * Switch reporting on for the current runtime.
 *
 * Called from `src/instrumentation.ts` (Node and edge) and
 * `src/instrumentation-client.ts` (browser). One function rather than the
 * wizard's three near-identical `sentry.*.config.ts` files, because the
 * options below are the same everywhere and three copies is three chances to
 * change two of them.
 */
export function initSentry(): void {
  if (!SENTRY_DSN) return

  Sentry.init({
    dsn: SENTRY_DSN,
    // Vercel sets this on both server and client; a local `npm run dev` sets
    // neither, so an error raised while developing does not land in the same
    // bucket as one raised at a table.
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    // No performance data. See the note at the top of this file.
    tracesSampleRate: 0,
    // Never attach IP addresses, cookies or request headers to an event. GDPR
    // and Lei n.º 58/2019 apply to this app, and none of that is needed to
    // read a stack trace.
    sendDefaultPii: false,
  })
}

/**
 * Report an error the app has already handled — a caught upstream failure, an
 * error boundary that has just rendered — and keep the console line too, so
 * `vercel logs` still shows it during the session it happened in.
 *
 * Unhandled server errors need no call here: `onRequestError` in
 * `src/instrumentation.ts` catches those, which is why the character routes
 * have no try/catch wrapped around their database calls.
 *
 * Deliberately named `captureError` rather than `reportError`: the browser has
 * a global of that name, so a missing import would silently resolve to it
 * instead of failing to compile.
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  Sentry.captureException(error, context && { extra: context })

  if (context) {
    console.error(REPORTED_ERROR_PREFIX, error, context)
  } else {
    console.error(REPORTED_ERROR_PREFIX, error)
  }
}
