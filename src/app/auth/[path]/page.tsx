import { AuthView } from '@neondatabase/auth/react/ui'
import { authViewPaths } from '@neondatabase/auth/react/ui/server'
import { cookies } from 'next/headers'

import { InviteGate } from '@/components/auth/invite-gate'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { INVITE_COOKIE, isSignupOpen, isValidInviteCode } from '@/lib/auth/invite'

// Every Neon Auth view — sign-in, sign-up, sign-out, forgot-password,
// reset-password, email-verification, callback — is one route.
export const dynamicParams = false

// The sign-up branch reads the invite cookie (DND-044, D20), which makes this
// route request-time rendered rather than static. That is the cost of the
// gate, and it is fine: auth views are visited a handful of times per player,
// ever.
export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params

  // The door in front of sign-up (D20). UI only — the auth proxy enforces the
  // same rule on the actual request — but this is what a visitor sees:
  // fail-closed copy when no code is configured, the code form until the
  // cookie is right, and the real sign-up view after that.
  if (path === 'sign-up') {
    if (!isSignupOpen()) {
      return (
        <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Sign-up is closed</CardTitle>
              <CardDescription>
                This is a private app for one D&D table. If you play at it, ask Jamie for an invite.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      )
    }

    const presented = (await cookies()).get(INVITE_COOKIE)?.value

    if (!isValidInviteCode(presented)) {
      return (
        <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
          <InviteGate />
        </main>
      )
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
      <AuthView path={path} />
    </main>
  )
}
