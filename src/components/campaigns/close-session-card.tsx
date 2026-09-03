'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MAX_NOTE_LENGTH } from '@/lib/notes/schema'

/**
 * The end of the evening (`dm-run-suite/session-log-recap`, D41).
 *
 * **The draft is the app's; the recap is the DM's.** The box opens pre-filled
 * with the facts the log derived and the lines the DM captured, and every one
 * of them is there to be deleted: what publishes is whatever is in the box when
 * the button is pressed, which is why this is a textarea and not a list with
 * checkboxes beside it. "Automatic capture, human words" only works if the
 * words are editable prose by the time anyone reads them.
 *
 * **Publishing and closing are one act**, and the button says both. A session
 * closed without a recap would be a state with nothing to show for it, and a
 * recap published without closing would leave tomorrow's log still carrying
 * tonight's fights — so there is one button, and its caption is the whole
 * consequence: the party reads this, and the log starts again.
 *
 * The draft arrives as a prop from the server render rather than being fetched:
 * this page is opened once, at the end of a session, and a spinner between the
 * DM and the box would be a spinner on the one screen where they are trying to
 * finish and go home.
 */
export function CloseSessionCard({
  campaignId,
  draft,
}: {
  campaignId: string
  /** The generated summary, as the DM finds it in the box. May be empty. */
  draft: string
}) {
  const router = useRouter()
  const [body, setBody] = useState(draft)
  const [publishing, setPublishing] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()

    const recap = body.trim()
    if (publishing || !recap) return

    setPublishing(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-log/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: recap }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That did not publish. Try again.')
        return
      }

      // Re-rendered rather than cleared by hand: the log this page shows is
      // derived from the window this request just moved, so the server is the
      // only thing that knows what the page says now.
      toast.success('Session closed. Your players can read the recap.')
      router.refresh()
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Close the session</CardTitle>
        <CardDescription>
          Trim this into what the party should remember. Publishing puts it at the top of their
          campaign page and starts the next session&apos;s log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="session-recap">Recap</Label>
            <Textarea
              id="session-recap"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="Previously on…"
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={publishing || !body.trim()}>
            {publishing ? 'Publishing…' : 'Publish recap and close session'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
