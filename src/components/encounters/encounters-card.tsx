'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Encounter } from '@/lib/db/schema'

/**
 * A campaign's encounters (DND-031): the list, and the one-field form that
 * starts a new one. Creating drops the DM straight into the tracker — the
 * name is typed at the desk before the session, the tracker is what the
 * session actually uses.
 */
export function EncountersCard({
  campaignId,
  encounters,
}: {
  campaignId: string
  encounters: Encounter[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/encounters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'That did not save. Try again.')
        return
      }

      const body = (await response.json()) as { encounter: { id: string } }
      router.push(`/dm/encounters/${body.encounter.id}`)
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Encounters</CardTitle>
        <CardDescription>
          Each one keeps its own initiative order and per-monster hit points, and survives between
          sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {encounters.length > 0 ? (
          <ul className="space-y-2">
            {encounters.map((encounter) => (
              <li key={encounter.id}>
                <Link
                  href={`/dm/encounters/${encounter.id}`}
                  className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{encounter.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      Round {encounter.round}
                    </span>
                  </span>
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No encounters yet.</p>
        )}

        <form onSubmit={submit} className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="encounter-name">New encounter</Label>
            <Input
              id="encounter-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Ambush at the bridge"
              maxLength={120}
            />
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="h-11" disabled={submitting || !name.trim()}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
