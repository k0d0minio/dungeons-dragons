// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
//
// Only the matcher below is intercepted, so reference browsing (`/`, the
// `/api/dnd5e/*` proxy) never touches auth and stays fully public. Every path
// listed here exists, and the sign-in redirect target `/auth/sign-in` is a real
// route — the Clerk setup this replaces redirected to a page that 404'd.
//
// `/api/characters` is deliberately absent: an API caller should get a 401, not
// a redirect to an HTML page. That route checks the session itself.
import { NextResponse, type NextRequest } from 'next/server'

import { SIGN_IN_PATH, getAuth, isAuthConfigured } from '@/lib/auth/server'

let neonAuthProxy: ReturnType<ReturnType<typeof getAuth>['middleware']> | undefined

export default async function proxy(request: NextRequest) {
  // Without Neon Auth env vars there is no session to validate. The protected
  // pages still call `requireSessionUser()`, so nothing is exposed by passing
  // through here.
  if (!isAuthConfigured()) return NextResponse.next()

  neonAuthProxy ??= getAuth().middleware({ loginUrl: SIGN_IN_PATH })
  return neonAuthProxy(request)
}

export const config = {
  matcher: ['/characters/:path*', '/account/:path*'],
}
