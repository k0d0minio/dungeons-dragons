'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDiscoveredOn } from '@/lib/campaigns/discovered'
import { MAX_NOTE_LENGTH } from '@/lib/notes/schema'

function messageForStatus(status: number): string {
  if (status === 401) return 'You have been signed out. Sign in again and try once more.'
  if (status === 404) return 'This campaign is not yours to close.'
  return `Could not close this campaign (${status}).`
}

/**
 * The end of a campaign (`first-table/one-night-campaign`) — the tutorial that
 * starts and ends in a night, and any campaign after it.
 *
 * **One act, two halves, one button.** The recap the session log drafted goes
 * to the players — the same publish the close-session step makes — and the
 * campaign comes off their sheets. The box opens pre-filled with the draft and
 * every line of it is there to be deleted, for the close-session card's
 * reason: the app remembers, the DM writes.
 *
 * **Behind a confirmation, unlike the reveal switch**, because this is pressed
 * once, between sessions, and there is no un-closing: the join link dies, the
 * campaign leaves every player's sheet, and a wrong tap here is not mended by
 * a second tap. The dialog names the consequence rather than asking "are you
 * sure?", and holds open on a failure so the reason is read where the tap
 * landed. Their characters stay, and the DM still sees everything from here.
 *
 * An empty recap is allowed and is the recovery path: the route publishes
 * first and stamps second, so a failure between the two leaves a published
 * recap and an open campaign, and pressing again with the box emptied closes
 * it without publishing a second recap.
 */
export function CloseCampaignCard({
  campaignId,
  draft,
  closedAt,
}: {
  campaignId: string
  /** The generated summary, as the DM finds it in the box. May be empty. */
  draft: string
  /** The stamp, straight off the row: a date when closed, null while running. */
  closedAt: Date | string | null
}) {
  const router = useRouter()
  const [recap, setRecap] = useState(draft)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (closedAt !== null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This campaign has ended</CardTitle>
          <CardDescription>
            Closed on {formatDiscoveredOn(closedAt)}. Your players have the recap at the top of
            their campaign page; everything here is still yours to read.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const body = recap.trim()

  async function onConfirm() {
    setError(null)
    setClosing(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recap: body }),
      })

      if (!response.ok) {
        setError(messageForStatus(response.status))
        return
      }

      setOpen(false)
      toast.success(
        body
          ? 'Campaign closed. Your players can read the recap.'
          : 'Campaign closed. It is off their sheets now.',
      )
      // The page's own reads decide what a closed campaign shows; the server is
      // the only thing that knows.
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setClosing(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">Close this campaign</CardTitle>
        <CardDescription>
          When the story is done — or the tutorial night is over and the real campaign starts next.
          Trim the recap into what the party should remember.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="closing-recap">Recap</Label>
          <Textarea
            id="closing-recap"
            value={recap}
            onChange={(event) => setRecap(event.target.value)}
            rows={8}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Previously on…"
            disabled={closing}
          />
        </div>

        <p className="text-muted-foreground text-xs">
          Closing publishes this recap to your players and takes the campaign off their sheets.
          Their characters stay.
        </p>

        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (closing) return
            setOpen(next)
            if (!next) setError(null)
          }}
        >
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="h-11 w-full">
              Publish the recap and close this campaign
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close this campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                {body
                  ? 'Your players get the recap at the top of their campaign page, and the campaign comes off their sheets within a few seconds. The join link stops working. Their characters stay, and there is no reopening.'
                  : 'The recap box is empty, so nothing is published — the campaign just comes off their sheets within a few seconds. The join link stops working. Their characters stay, and there is no reopening.'}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel className="h-11" disabled={closing}>
                Keep it running
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-11"
                disabled={closing}
                // Radix closes on action by default; hold it open so a failed
                // close has somewhere to be read.
                onClick={(event) => {
                  event.preventDefault()
                  void onConfirm()
                }}
              >
                {closing ? 'Closing…' : 'Close it'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
