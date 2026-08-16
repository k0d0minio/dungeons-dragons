'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The form in front of sign-up (DND-044, D20): one field, the shared invite
 * code. A right answer sets the httpOnly cookie via `/api/invite` and
 * refreshes, and the server then renders the real sign-up view. The real
 * enforcement lives in the auth proxy — this form is the polite way in, not
 * the lock.
 */
export function InviteGate() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'That did not work. Try again.')
        return
      }

      router.refresh()
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Joining Jamie&apos;s table?</CardTitle>
        <CardDescription>
          Sign-up is invite-only. Enter the invite code you were given to create an account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoFocus
              required
            />
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-11 w-full" disabled={submitting || !code.trim()}>
            {submitting ? 'Checking…' : 'Continue to sign-up'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
