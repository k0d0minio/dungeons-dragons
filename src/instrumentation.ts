// Next.js runs `register()` once per server runtime before anything else is
// loaded, which is the only place error reporting can be switched on early
// enough to catch a failure during the first render (DND-025).
//
// The Sentry wizard splits this into `sentry.server.config.ts` and
// `sentry.edge.config.ts` behind `NEXT_RUNTIME` checks so the Node SDK never
// reaches the edge bundle. That split buys nothing here: `onRequestError`
// below already forces a top-level `@sentry/nextjs` import in both runtimes,
// and the package resolves to its own edge build through the `edge-light`
// export condition. One file, one set of options.
import * as Sentry from '@sentry/nextjs'

import { initSentry } from '@/lib/observability/sentry'

export async function register(): Promise<void> {
  initSentry()
}

/**
 * Next's hook for every server error that no boundary handled — a throw in a
 * server component, a route handler, or `src/proxy.ts`, which sits outside the
 * React tree entirely and so has no boundary available to it.
 *
 * This is what covers `/api/characters/*`: those handlers deliberately have no
 * try/catch around their database calls, because a caught-and-reshaped
 * database error tells you less than the real one arriving here does.
 */
export const onRequestError = Sentry.captureRequestError
