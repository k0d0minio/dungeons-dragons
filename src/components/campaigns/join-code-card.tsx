'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * The campaign's join link, as the DM sees it (DND-046): copy it to hand to
 * the table, or burn it and get a fresh one. Regenerating kills the old link
 * — that is the whole reason the button exists.
 */
export function JoinCodeCard({
  campaignId,
  joinCode,
}: {
  campaignId: string
  joinCode: string | null
}) {
  const [code, setCode] = useState(joinCode)
  const [working, setWorking] = useState(false)

  // Path only at render time — `window` does not exist during server render;
  // the copy handler runs in the browser and prepends the real origin there.
  const joinPath = code ? `/campaigns/join/${code}` : null

  async function copy() {
    if (!joinPath) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${joinPath}`)
      toast.success('Join link copied. Send it to your players.')
    } catch {
      toast.error('Could not copy. Long-press the link text instead.')
    }
  }

  async function regenerate() {
    if (working) return
    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/join-code`, { method: 'POST' })

      if (!response.ok) {
        toast.error('Could not make a new link. Try again.')
        return
      }

      const body = (await response.json()) as { campaign: { joinCode: string | null } }
      setCode(body.campaign.joinCode)
      toast.success('New join link made. The old one no longer works.')
    } catch {
      toast.error('Could not make a new link. Check your connection.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite your players</CardTitle>
        <CardDescription>
          Anyone with this link (and an account) can join the campaign and attach their characters.
          Regenerate it to cut off the old link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {joinPath ? (
          <p className="bg-muted text-muted-foreground rounded-md p-2 font-mono text-xs break-all select-all">
            {joinPath}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            No live join link. Make one to invite the table.
          </p>
        )}
        <div className="flex gap-2">
          {joinPath ? (
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
            {working ? 'Working…' : code ? 'Regenerate' : 'Create join link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
