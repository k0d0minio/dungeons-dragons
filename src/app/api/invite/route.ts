// Trade an invite code for the sign-up cookie (DND-044, D20).
//
// The only thing this route does is set the httpOnly cookie the auth proxy
// checks before letting a sign-up request through. It never says whether a
// *code* was close — wrong is wrong — and with no code configured it answers
// that sign-up is closed, which is the fail-closed default.
import { NextResponse } from 'next/server'

import {
  INVITE_COOKIE,
  INVITE_COOKIE_MAX_AGE_SECONDS,
  isSignupOpen,
  isValidInviteCode,
} from '@/lib/auth/invite'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isSignupOpen()) {
    return NextResponse.json(
      { error: 'Sign-up is closed. Ask Jamie for an invite.' },
      { status: 403 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const code =
    typeof body === 'object' && body !== null && 'code' in body
      ? (body as { code: unknown }).code
      : undefined

  if (typeof code !== 'string' || !isValidInviteCode(code.trim())) {
    return NextResponse.json({ error: 'That invite code is not right.' }, { status: 403 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(INVITE_COOKIE, code.trim(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
  })

  return response
}
