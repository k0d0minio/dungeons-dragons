'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signInUrlWithReturnTo } from '@/lib/auth/return-to'
import type { UserRole } from '@/lib/db/schema'

/** The table an invite seats them at, when it carries one. */
export interface InviteCampaign {
  id: string
  name: string
}

/**
 * What an invited friend sees when they open their link
 * (`user-management/invites-and-roles`).
 *
 * The page behind this has already checked the invite is live; this card says
 * whose table it is and what they will be, and offers the two doors. Either
 * tap trades the token for the httpOnly invite cookie via `/api/invite` —
 * the same cookie the shared code sets — and then walks to sign-up or
 * sign-in, where the auth proxy admits the request on that cookie and claims
 * the invite on the way back. The real enforcement is the proxy's; this is
 * the polite way in.
 *
 * **When the invite carries a campaign** (`dm-chronology/one-link-invite`) the
 * card names the table — that is the whole difference a friend sees, and it is
 * the difference between "some app Jamie sent me" and "Thursday's game" — and
 * both doors land on `/characters/new?campaign=<id>` rather than the front
 * door. That one destination is right for everybody, because the wizard page
 * is already a switchboard: a brand-new account gets the wizard with the table
 * filled in (D36), an account that already has a character is redirected
 * straight to it, and a DM is sent behind the screen. The claim has seated
 * them by then — it happens inside the sign-up/sign-in request itself — so the
 * campaign is one they are a member of by the time the wizard checks.
 *
 * The destination rides the same sanitised `redirectTo` the sign-in wall uses
 * (`src/lib/auth/return-to.ts`), so nothing here can name another origin, and
 * the Neon Auth view's own sign-in ⇄ sign-up footer link carries it across for
 * free.
 */
export function InviteLanding({
  token,
  role,
  label,
  campaign = null,
}: {
  token: string
  role: UserRole
  label: string | null
  campaign?: InviteCampaign | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState<'sign-up' | 'sign-in' | null>(null)

  async function go(destination: 'sign-up' | 'sign-in') {
    if (working) return

    setWorking(destination)
    setError(null)

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'That did not work. Try again.')
        return
      }

      router.push(
        campaign
          ? signInUrlWithReturnTo(
              `/auth/${destination}`,
              `/characters/new?campaign=${encodeURIComponent(campaign.id)}`,
            )
          : `/auth/${destination}`,
      )
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setWorking(null)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{label ? `${label}, you’re invited` : 'You’re invited'}</CardTitle>
        <CardDescription>
          {campaign
            ? `Jamie is inviting you to play in ${campaign.name}. Make an account and you’re at the table — we’ll walk you through a character next.`
            : role === 'dm'
              ? 'Jamie has set you up as a DM: you’ll be able to run campaigns as well as play.'
              : 'Jamie has set you up as a player at the table. Create an account to build your character.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          className="h-11 w-full"
          onClick={() => go('sign-up')}
          disabled={working !== null}
        >
          {working === 'sign-up' ? 'One moment…' : 'Create your account'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => go('sign-in')}
          disabled={working !== null}
        >
          {working === 'sign-in' ? 'One moment…' : 'I already have an account'}
        </Button>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <p className="text-muted-foreground text-xs">
          This link works once. If someone else needs one, ask Jamie for their own.
        </p>
      </CardContent>
    </Card>
  )
}
