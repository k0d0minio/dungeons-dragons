// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
//
// **Deny by default (D34).** Everything requires a session. The public half of
// this app retired on 2026-08-29: the reference browser, the library and the
// rules chapters all sit behind the wall now, and the matcher below no longer
// allowlists four prefixes — it takes every page and lets through only what
// `isPublicPath` names. That list *is* the public surface, so each entry
// carries the reason it is there:
//
//   `/`              the front door (D33). A signed-out visitor must reach the
//                    welcome screen, and `/` is the installed PWA's `start_url`
//                    forever — iOS never re-reads the manifest. The page reads
//                    the session itself and sends a signed-in player on to
//                    their character; it holds no data of its own.
//   `/auth/*`        sign-in, sign-up, sign-out, password reset. Gating the
//                    door leaves the key inside it. Sign-up stays invite-gated
//                    and fail-closed on its own (D20).
//   `/table/[token]` the shared table screen (D24). The token in the URL is the
//                    whole credential, and it unlocks only the sanitized view
//                    the data layer builds — never monster HP.
//   `/offline`       the service worker `cache.add()`s this at install time,
//                    signed-out. Behind the wall that `cache.add()` fetches a
//                    307 to sign-in instead, which fails the install outright
//                    or caches the sign-in page as the permanent fallback.
//   static assets    `/_next/*`, `/sw.js`, `/manifest.webmanifest`, the icons.
//                    An install whose manifest redirects is not an install.
//
// `/api/*` is not a page and is never redirected: an API caller must get a 401,
// not an HTML sign-in screen. The reference *data* endpoints under
// `/api/srd/*` are public and CDN-cached on purpose (D34 — SRD content, no
// personal data); `/api/table/[token]`, `/api/invite` and `/api/auth/*` are
// public by the same logic as the pages they serve; every other route checks
// its own session and 401s in-route. That doctrine predates D34 and survives it.
import { NextResponse, type NextRequest } from 'next/server'

import { SIGN_IN_PATH, getAuth, isAuthConfigured } from '@/lib/auth/server'
import { signInUrlWithReturnTo } from '@/lib/auth/return-to'

/** Pages reachable without a session, matched whole. */
const PUBLIC_PAGES = ['/', '/offline']

/**
 * Path segments whose whole subtree is public. `/api` is here because a route
 * handler answers for itself (401, not a redirect), not because it is
 * unprotected.
 */
const PUBLIC_ROOTS = ['/auth', '/table', '/api']

/** True for `/base` itself and anything under `/base/`, and nothing else. */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

/**
 * Static assets: Next's build output, plus anything whose last segment carries
 * a file extension (`/sw.js`, `/manifest.webmanifest`, `/icon-192.png`). No
 * page route in this app has a dot in its path — ids are uuids, join codes and
 * share tokens are alphanumeric — so nothing real is let through by accident.
 */
function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return true

  return pathname.slice(pathname.lastIndexOf('/') + 1).includes('.')
}

/**
 * The whole public surface (D34). Everything this returns `false` for needs a
 * session; adding an entry here is a product decision, not a refactor.
 */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return true
  if (PUBLIC_ROOTS.some((root) => isUnder(pathname, root))) return true

  return isStaticAsset(pathname)
}

export default async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next()

  // Without Neon Auth env vars there is no session to validate, so the wall
  // cannot stand and the request passes through. Every page that reads player
  // data calls `requireSessionUser()` and still bounces to sign-in (an
  // unconfigured `getSessionUser()` returns `null`); what an unconfigured
  // deploy does expose is the pages that hold nothing — the library and the
  // rules chapters. That is the price of building green before Neon Auth is
  // enabled, and it is why a redirect to `/auth/sign-in` proves nothing on its
  // own (see `.icm/docs/neon-auth-setup.md`).
  if (!isAuthConfigured()) return NextResponse.next()

  // Carry the destination across the wall
  // (`triage/sign-in-return-destination`). Neon Auth's middleware cannot do
  // this itself — `NeonAuthMiddlewareConfig` exposes `loginUrl` and
  // nothing else, and all it copies onto that URL is the request's *query*,
  // never the path someone actually asked for. But `loginUrl` is read per
  // middleware instance, so building one per request is enough: the library
  // still owns the session check and the redirect, and the sign-in page reads
  // the destination back off the URL it lands on.
  //
  // `signInUrlWithReturnTo` is what keeps this from being a phishing hole — it
  // yields a path on this origin or the bare sign-in path, never a URL. The
  // pathname alone would drop `?q=` off a link someone shared, so the query
  // rides along; the library appends the request's own query params to the
  // login URL as well, and the ones it would duplicate it skips.
  const loginUrl = signInUrlWithReturnTo(
    SIGN_IN_PATH,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  )

  return getAuth().middleware({ loginUrl })(request)
}

export const config = {
  // Every path except Next's own build output, which never needs a session
  // check and would only pay for one. The exception list that matters is
  // `isPublicPath`, in one place, tested — not split across two.
  matcher: ['/((?!_next/static|_next/image).*)'],
}
