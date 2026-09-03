import { AuthView } from '@neondatabase/auth/react/ui'
import { authViewPaths } from '@neondatabase/auth/react/ui/server'
import { cookies } from 'next/headers'

import { InviteGate } from '@/components/auth/invite-gate'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { admitSignup } from '@/lib/auth/admission'
import { INVITE_COOKIE, isSignupOpen } from '@/lib/auth/invite'
import { DEFAULT_SIGNED_IN_PATH, RETURN_TO_PARAM, safeReturnPath } from '@/lib/auth/return-to'

// Every Neon Auth view — sign-in, sign-up, sign-out, forgot-password,
// reset-password, email-verification, callback — is one route.
export const dynamicParams = false

// The sign-up branch reads the invite cookie (DND-044, D20), which makes this
// route request-time rendered rather than static. That is the cost of the
// gate, and it is fine: auth views are visited a handful of times per player,
// ever.
export const dynamic = 'force-dynamic'

/** Next hands a repeated query parameter over as an array; take the first. */
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { path } = await params

  // Where the wall said this visitor was headed
  // (`triage/sign-in-return-destination`). Sanitising it here is not
  // belt-and-braces: with no `redirectTo` prop `AuthView` reads one
  // straight off `window.location`, and that value is whatever the link said —
  // `?redirectTo=https://evil.example` on an otherwise genuine sign-in URL
  // would hand a stranger this app's front door as their launch pad. So the
  // prop is passed on every render, never conditionally: an unsafe value has
  // to resolve to the default, because leaving the prop off is what lets the
  // component go and read it again.
  const returnTo =
    safeReturnPath(readParam((await searchParams)[RETURN_TO_PARAM])) ?? DEFAULT_SIGNED_IN_PATH

  // The door in front of sign-up (D20; `user-management/invites-and-roles`).
  // UI only — the auth proxy enforces the same rule on the actual request —
  // but this is what a visitor sees: the real sign-up view when the cookie
  // admits them (the shared code, or a tokenised invite link they opened),
  // the code form when a code is configured and the cookie is not right, and
  // fail-closed copy when there is no code to type and no link was opened.
  if (path === 'sign-up' && !(await admitSignup((await cookies()).get(INVITE_COOKIE)?.value))) {
    if (!isSignupOpen()) {
      return (
        <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Sign-up is closed</CardTitle>
              <CardDescription>
                This is a private app for one D&D table. If you play at it, ask Jamie for an invite
                link, and open it on this phone.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      )
    }

    return (
      <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
        <InviteGate />
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
      <AuthView path={path} redirectTo={returnTo} />
    </main>
  )
}
