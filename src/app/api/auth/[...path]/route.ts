// Neon Auth API proxy. Every sign-up / sign-in / sign-out / session call the
// browser makes goes through here, so the Neon Auth base URL and cookie secret
// stay server-side.
//
// It is also the sign-up door's hinge (DND-044, D20;
// `user-management/invites-and-roles`): a sign-up request gets through only
// with an invite cookie `/api/invite` set — the shared code, or a tokenised
// invite that is still claimable — and with neither it is refused outright,
// fail-closed. This is the enforcement point, not the sign-up page's UI: the
// page can be bypassed with curl, this route cannot, and Neon's trusted-domains
// list is a CSRF boundary rather than an access gate.
//
// A tokenised invite is also *claimed* here, on the way back out: when a
// sign-up (or a sign-in — an existing account can be handed a role the same
// way) succeeds while the cookie names a live invite, the invite is marked
// used for that user and their role is written. The response Neon built goes
// back untouched; the claim only reads a copy of it.
import { NextResponse, type NextRequest } from 'next/server'

import { admitSignup } from '@/lib/auth/admission'
import { INVITE_COOKIE, isSignupOpen } from '@/lib/auth/invite'
import { getAuth } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { claimInvite, isInviteToken } from '@/lib/db/invites'
import { captureError } from '@/lib/observability/sentry'

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

/** The two calls whose success means "this person now has a session". */
function isSessionOpeningPath(path: string[]): boolean {
  return isSignupPath(path) || path.includes('sign-in')
}

/**
 * The user id a successful sign-up/sign-in response names, or `null`. Reads a
 * clone so the body Neon built still streams to the browser. Anything odd —
 * a redirect, a non-JSON body, a shape without `user.id` — is simply not a
 * claim, never an error.
 */
async function signedInUserId(response: Response): Promise<string | null> {
  if (response.status !== 200) return null

  try {
    const body = (await response.clone().json()) as { user?: { id?: unknown } } | null
    const id = body?.user?.id
    return typeof id === 'string' && id.length > 0 ? id : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, context: Context) {
  return neonAuthHandlers().GET(request, context)
}

export async function POST(request: NextRequest, context: Context) {
  const { path } = await context.params
  const presented = request.cookies.get(INVITE_COOKIE)?.value

  if (isSignupPath(path)) {
    const admission = await admitSignup(presented)

    if (!admission) {
      return NextResponse.json(
        {
          error: isSignupOpen()
            ? 'Sign-up needs an invite. Open the invite link you were sent, or enter the invite code on the sign-up page first.'
            : 'Sign-up is closed. Ask Jamie for an invite.',
        },
        { status: 403 },
      )
    }
  }

  const response = await neonAuthHandlers().POST(request, context)

  // Claim a tokenised invite for whoever just signed up or in. Best effort by
  // design: the session is already issued, and a claim that fails leaves a
  // player the DM can see and fix on `/dm/users` — never a stuck sign-up.
  if (isSessionOpeningPath(path) && isInviteToken(presented) && isDatabaseConfigured()) {
    const userId = await signedInUserId(response)

    if (userId) {
      try {
        await claimInvite(presented, userId)
      } catch (error) {
        captureError(error, { route: 'api/auth', action: 'claim-invite' })
      }
    }
  }

  return response
}
