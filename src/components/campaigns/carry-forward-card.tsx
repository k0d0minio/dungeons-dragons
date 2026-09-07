'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** A campaign this one could carry a table forward from, and how full it is. */
export interface CarrySource {
  id: string
  name: string
  playerCount: number
  characterCount: number
}

function messageForStatus(status: number): string {
  if (status === 401) return 'You have been signed out. Sign in again and try once more.'
  if (status === 404) return 'That campaign is not yours to carry forward.'
  return `The table did not carry across (${status}).`
}

function headcount({ playerCount, characterCount }: CarrySource): string {
  const players = `${playerCount} ${playerCount === 1 ? 'player' : 'players'}`
  const characters = `${characterCount} ${characterCount === 1 ? 'character' : 'characters'}`
  return `${players} · ${characters}`
}

/**
 * Carry a table forward into this campaign, on the campaign's own page
 * (`triage/carry-forward-rerun`).
 *
 * The create form carries the table across as the campaign is made, and holds
 * on to a carry that failed so it can be pressed again — but only while that
 * screen is open. This is where the same act lives afterwards: the DM who
 * closed the tab, or who made the campaign empty and thought better of it,
 * presses this instead of making a second campaign. It is the same idempotent
 * `PUT /api/campaigns/[id]/carry-from`, so pressing it on a carry that half
 * landed finishes the job and doubles nothing.
 *
 * **Only offered when it would do something.** The page hands down the DM's
 * other campaigns that seat more people or hold more characters than this one
 * — a table that is no fuller than this one has nothing to give it, and every
 * campaign page carrying this card would be a control offering to change six
 * phones on a screen opened mid-session.
 */
export function CarryForwardCard({
  campaignId,
  sources,
}: {
  campaignId: string
  sources: CarrySource[]
}) {
  const router = useRouter()
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '')
  const [carrying, setCarrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const source = sources.find((candidate) => candidate.id === sourceId) ?? sources[0] ?? null

  if (!source) return null

  async function carry() {
    if (!source) return

    setError(null)
    setCarrying(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/carry-from`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: source.id }),
      })

      if (!response.ok) {
        setError(messageForStatus(response.status))
        return
      }

      toast.success('The table carried across. Nobody needs a new join link.')
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setCarrying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Carry a table forward</CardTitle>
        <CardDescription>
          {sources.length === 1 ? (
            <>
              <span className="font-medium">{source.name}</span> seats more people than this
              campaign does. Bring them across rather than sending a second join link.
            </>
          ) : (
            'One of your other campaigns seats more people than this one. Bring them across rather than sending a second join link.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.length > 1 ? (
          <select
            aria-label="Campaign to carry forward from"
            value={sourceId}
            disabled={carrying}
            onChange={(event) => setSourceId(event.target.value)}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm disabled:opacity-50"
          >
            {sources.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} — {headcount(candidate)}
              </option>
            ))}
          </select>
        ) : null}

        <p className="text-muted-foreground text-xs">
          Everyone seated at {source.name} and every character at that table join this campaign,
          with the same parts of the sheet switched on. Nobody is moved off {source.name}, and
          running it twice changes nothing the first run already did.
        </p>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          className="h-11 w-full"
          disabled={carrying}
          onClick={() => void carry()}
        >
          {carrying ? 'Carrying…' : `Carry the table across from ${source.name}`}
        </Button>
      </CardContent>
    </Card>
  )
}
