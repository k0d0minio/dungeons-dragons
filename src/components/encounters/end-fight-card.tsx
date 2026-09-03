'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatLogMoment } from '@/lib/campaigns/session-log'

/**
 * "The fight is over" (`dm-run-suite/session-log-recap`).
 *
 * **The act that stands where deleting used to.** A DM whose fight ended had
 * one control that said so, and it was Delete — which takes the initiative
 * order, the monsters and their hit points, and with them any record that the
 * party fought anything. This says the fight is over and keeps all of it: the
 * tracker is still there to scroll back through, and tonight's session log
 * gains a line.
 *
 * **Ending is not deleting and does not look like it.** No confirmation
 * dialog, because the undo is the same button — a fight ended a round early is
 * reopened in one tap, and a dialog guarding a reversible act is a dialog that
 * gets dismissed unread. The destructive card is still below this one, still
 * red, still behind its confirmation.
 */
export function EndFightCard({
  encounterId,
  campaignId,
  completedAt,
}: {
  encounterId: string
  campaignId: string
  /** The column, straight off the row: a timestamp when over, null when not. */
  completedAt: Date | string | null
}) {
  const router = useRouter()
  const [ended, setEnded] = useState<Date | string | null>(completedAt)
  const [working, setWorking] = useState(false)

  const over = ended !== null

  async function toggle() {
    if (working) return

    const next = !over
    setWorking(true)

    try {
      const response = await fetch(`/api/encounters/${encounterId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That did not change. Try again.')
        return
      }

      const body = (await response.json()) as { encounter: { completedAt: string | null } }

      setEnded(body.encounter.completedAt)
      toast.success(next ? 'Ended. It is in tonight’s log.' : 'Back on the table.')
      router.refresh()
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {over ? 'This fight is over' : 'End this fight'}
        </CardTitle>
        <CardDescription>
          {over
            ? `Ended ${formatLogMoment(ended)}. It is in tonight’s session log; the order and the hit points are untouched.`
            : 'Puts it in tonight’s session log. Nothing is deleted — the order, the monsters and their hit points all stay.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          variant={over ? 'outline' : 'default'}
          className="h-11 w-full"
          disabled={working}
          onClick={() => void toggle()}
        >
          {working ? 'Saving…' : over ? 'Put it back on the table' : 'End fight'}
        </Button>

        <Link
          href={`/dm/campaigns/${campaignId}/session-log`}
          className="text-muted-foreground block text-center text-sm underline underline-offset-4"
        >
          Tonight&apos;s session log
        </Link>
      </CardContent>
    </Card>
  )
}
