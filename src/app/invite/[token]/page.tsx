import Link from 'next/link'

import { InviteLanding } from '@/components/auth/invite-landing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isDatabaseConfigured } from '@/lib/db/client'
import { findClaimableInvite } from '@/lib/db/invites'

// Reads the invite, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Invite',
}

/**
 * The landing page of a tokenised invite (`user-management/invites-and-roles`).
 *
 * Public by design (`src/proxy.ts`): the person opening it has no account
 * yet. It shows nothing that is not on the invite itself — the DM's label for
 * them and the role they get — and a dead link (used, revoked, expired,
 * mistyped) reads the same one way whatever the reason, so the URL cannot be
 * used to probe which invites exist.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = isDatabaseConfigured() ? await findClaimableInvite(token) : null

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
      {invite ? (
        <InviteLanding
          token={invite.token}
          role={invite.role === 'dm' ? 'dm' : 'player'}
          label={invite.label}
        />
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>This invite link no longer works</CardTitle>
            <CardDescription>
              It may have been used already, or it has expired. Ask Jamie for a fresh one — or, if
              you already made your account, just sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
