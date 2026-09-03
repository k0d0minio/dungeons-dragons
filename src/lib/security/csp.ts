// The Content-Security-Policy header (`dm-prep-suite/locations-handouts`).
//
// The app has carried `X-Frame-Options`, `nosniff` and a referrer policy since
// it shipped, and no CSP, which was defensible while every byte the browser
// rendered came out of the repository. This ticket ends that: a DM uploads a
// picture and the app serves it back, so for the first time a *user-supplied
// file* is rendered in the app's own origin. That is the moment the epic named
// for adding this header, and the reason it names it.
//
// The upload rails do most of the work — three raster formats, decided from the
// file's own header bytes, and **no SVG**, which is the format that would make
// this a script-injection question at all. The policy below is the second layer
// behind that, and the directives that matter most for it are the boring ones:
// `object-src 'none'` (no plugin can be talked into interpreting an image),
// `base-uri 'self'` (no injected `<base>` can re-point every relative URL) and
// `form-action 'self'` (nothing can post a session somewhere else).
//
// **`'unsafe-inline'` on scripts and styles is deliberate and is the policy's
// weak point.** Next's App Router inlines its bootstrap and its flight data as
// inline `<script>`s, and Radix and Tailwind set inline styles; the supported
// way to drop these is a per-request nonce, which means generating one in
// `proxy.ts` and threading it through every render. That is a ticket of its
// own, not a side effect of adding image uploads — and a policy that broke the
// app in production would simply be removed by whoever noticed, leaving nothing.
// What is here holds `script-src` to this origin, which is what stops a stored
// payload from reaching out for the rest of its code.
//
// This module has no imports on purpose: `next.config.ts` loads it directly.

/**
 * The Sentry ingest origin a browser must be allowed to POST to, derived from
 * the public DSN.
 *
 * Derived rather than listed because the DSN already names it, and a
 * hard-coded `*.sentry.io` would be a wider hole than the one thing it is
 * there for. A missing or malformed DSN yields nothing to allow, which is
 * correct: without a DSN the SDK never initialises and never sends anything.
 */
export function sentryIngestOrigin(dsn: string | undefined): string | null {
  if (!dsn) return null

  try {
    return new URL(dsn).origin
  } catch {
    return null
  }
}

/** What the app connects to, beyond its own origin. */
function connectSources(dsn: string | undefined): string[] {
  const ingest = sentryIngestOrigin(dsn)

  // Neon Auth is *not* here: the browser talks to the app's own `/api/auth/*`
  // proxy, which forwards server-side, so no Neon URL is ever fetched from a
  // page. Same for the blob store — its objects come through this origin's
  // authed image route and never from `blob.vercel-storage.com`.
  return ingest ? ["'self'", ingest] : ["'self'"]
}

/**
 * The policy, as one header value.
 *
 * `development` adds `'unsafe-eval'`, which Turbopack's hot reload needs and a
 * production build does not. It is a separate argument rather than a read of
 * `NODE_ENV` inside so that the value is a pure function of its inputs and can
 * be asserted on directly.
 */
export function contentSecurityPolicy({
  sentryDsn,
  development = false,
}: {
  sentryDsn?: string
  development?: boolean
} = {}): string {
  const scriptSources = ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])]

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // `data:` for inlined icons; `blob:` for the local preview a file input
    // hands the page before an upload finishes. Both are same-document.
    'img-src': ["'self'", 'data:', 'blob:'],
    'script-src': scriptSources,
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    'connect-src': connectSources(sentryDsn),
    // The service worker, which is what makes `/offline` work at a table with
    // no signal.
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    // Nothing in this app embeds anything, and nothing may embed this app —
    // the second half is `X-Frame-Options: DENY` said in the modern spelling,
    // and both are sent because older browsers only read the older header.
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }

  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')
}
