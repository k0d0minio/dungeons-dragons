// Neon Auth API proxy. Every sign-up / sign-in / sign-out / session call the
// browser makes goes through here, so the Neon Auth base URL and cookie secret
// stay server-side.
//
// It is also the sign-up door's hinge (DND-044, D20): a sign-up request gets
// through only with the invite cookie `/api/invite` sets, and with no
// `SIGNUP_INVITE_CODE` configured at all it is refused outright — fail-closed.
// This is the enforcement point, not the sign-up page's UI: the page can be
// bypassed with curl, this route cannot, and Neon's trusted-domains list is a
// CSRF boundary rather than an access gate.
import { NextResponse, type NextRequest } from 'next/server'

import { INVITE_COOKIE, isSignupOpen, isValidInviteCode } from '@/lib/auth/invite'
import { getAuth } from '@/lib/auth/server'

type Context = { params: Promise<{ path: string[] }> }

let handlers: ReturnType<ReturnType<typeof getAuth>['handler']> | undefined

// Built on first request, not at module load, so a deploy without the Neon Auth
// env vars still builds — see `getAuth`.
function neonAuthHandlers() {
  return (handlers ??= getAuth().handler())
}

/** Better Auth's registration endpoints all live under a `sign-up` segment. */
function isSignupPath(path: string[]): boolean {
  return path.includes('sign-up')
}

export async function GET(request: NextRequest, context: Context) {
  return neonAuthHandlers().GET(request, context)
}

export async function POST(request: NextRequest, context: Context) {
  const { path } = await context.params

  if (isSignupPath(path)) {
    if (!isSignupOpen()) {
      return NextResponse.json(
        { error: 'Sign-up is closed. Ask Jamie for an invite.' },
        { status: 403 },
      )
    }

    const presented = request.cookies.get(INVITE_COOKIE)?.value

    if (!isValidInviteCode(presented)) {
      return NextResponse.json(
        { error: 'Sign-up needs an invite code. Enter it on the sign-up page first.' },
        { status: 403 },
      )
    }
  }

  return neonAuthHandlers().POST(request, context)
}
