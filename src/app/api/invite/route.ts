// Trade an invite for the sign-up cookie (DND-044, D20;
// `user-management/invites-and-roles`).
//
// Two things can be traded. The shared code, typed into the sign-up page's
// form, is compared against the environment. A tokenised invite, carried by
// the link `/invite/<token>`, is looked up in `user_invites` and must still be
// claimable. Either way the only thing this route does is set the httpOnly
// cookie the auth proxy checks before letting a sign-up through; the proxy
// re-decides admission on the actual request, so a cookie is never a grant on
// its own. It never says whether a *code* was close — wrong is wrong — and
// with no code configured and no token presented it answers that sign-up is
// closed, which is the fail-closed default.
import { NextResponse } from 'next/server'

import { admitSignup } from '@/lib/auth/admission'
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE_SECONDS, isSignupOpen } from '@/lib/auth/invite'

export const dynamic = 'force-dynamic'

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null || !(key in body)) return undefined
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : undefined
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const token = readString(body, 'token')
  const code = readString(body, 'code')

  // A link carries a token; the form carries a code. A token is tried first
  // because it stands on its own even with no shared code configured.
  if (token) {
    const admission = await admitSignup(token)

    if (admission?.by !== 'token') {
      return NextResponse.json(
        { error: 'That invite link no longer works. Ask Jamie for a fresh one.' },
        { status: 403 },
      )
    }

    return withInviteCookie(token)
  }

  if (!isSignupOpen()) {
    return NextResponse.json(
      { error: 'Sign-up is closed. Ask Jamie for an invite.' },
      { status: 403 },
    )
  }

  if (!code || (await admitSignup(code))?.by !== 'code') {
    return NextResponse.json({ error: 'That invite code is not right.' }, { status: 403 })
  }

  return withInviteCookie(code)
}

function withInviteCookie(value: string) {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(INVITE_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
  })

  return response
}
