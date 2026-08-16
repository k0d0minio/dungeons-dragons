'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * The encounter's table-screen link, as the DM sees it (D24) — the join-code
 * card's pattern applied to an encounter. Open it on the TV or a spare
 * tablet: initiative order and player-visible state, never monster HP.
 * Regenerating kills the old link — that is the whole reason the button
 * exists.
 */
export function ShareTableCard({
  encounterId,
  shareToken,
}: {
  encounterId: string
  shareToken: string | null
}) {
  const [token, setToken] = useState(shareToken)
  const [working, setWorking] = useState(false)

  // Path only at render time — `window` does not exist during server render;
  // the copy handler runs in the browser and prepends the real origin there.
  const tablePath = token ? `/table/${token}` : null

  async function copy() {
    if (!tablePath) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${tablePath}`)
      toast.success('Table screen link copied. Open it on the shared screen.')
    } catch {
      toast.error('Could not copy. Long-press the link text instead.')
    }
  }

  async function regenerate() {
    if (working) return
    setWorking(true)

    try {
      const response = await fetch(`/api/encounters/${encounterId}/share-token`, {
        method: 'POST',
      })

      if (!response.ok) {
        toast.error('Could not make a new link. Try again.')
        return
      }

      const body = (await response.json()) as { encounter: { shareToken: string | null } }
      setToken(body.encounter.shareToken)
      toast.success('New table screen link made. The old one no longer works.')
    } catch {
      toast.error('Could not make a new link. Check your connection.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Share to a table screen</CardTitle>
        <CardDescription>
          Anyone with this link sees the initiative order, round and player HP — never monster hit
          points. No sign-in needed; regenerate to cut the old link off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tablePath ? (
          <p className="bg-muted text-muted-foreground rounded-md p-2 font-mono text-xs break-all select-all">
            {tablePath}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            No live table screen link. Make one to put the order up on a shared screen.
          </p>
        )}
        <div className="flex gap-2">
          {tablePath ? (
            <Button type="button" variant="outline" className="h-11" onClick={copy}>
              Copy link
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={regenerate}
            disabled={working}
          >
            {working ? 'Working…' : token ? 'Regenerate' : 'Create link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
