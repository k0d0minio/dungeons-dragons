'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserRole } from '@/lib/db/schema'

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
 */
export function InviteLanding({
  token,
  role,
  label,
}: {
  token: string
  role: UserRole
  label: string | null
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

      router.push(`/auth/${destination}`)
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
          {role === 'dm'
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
