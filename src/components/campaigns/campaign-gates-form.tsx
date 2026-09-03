'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { GATES, type CampaignGates, type GateKey } from '@/lib/campaigns/gates'

/**
 * The DM's feature switches for one campaign
 * (`dm-prep-suite/campaign-feature-gates`).
 *
 * What this screen is trying to be: **a menu of what to hand the players
 * next**, not a settings panel. Every row therefore says what turning it on
 * *adds for them* — the words are `GATES[].adds`, one plain line each, written
 * for a DM who has never opened the card it describes — and, underneath, what
 * the players have while it is off. Both halves are needed to choose: a switch
 * labelled "Conditions" with nothing beside it is a shrug, and a switch that
 * only says what it adds reads as though the off state costs something.
 *
 * **Nothing here can lose anything, and the screen says so once, at the top.**
 * That is the load-bearing promise of the whole feature: a gate hides a card,
 * the state under it keeps being tracked, and flipping the switch back reveals
 * what was there all along. A DM who does not believe that will not experiment.
 *
 * Each toggle repaints immediately and sends the whole set, because the body
 * is "the switches as this screen is showing them" — a refusal puts the
 * row back where it was and says so, the same shape the inventory card's
 * optimistic writes use. No Save button: there is nothing to compose here, and
 * a Save button is one more thing to forget before handing the phone over.
 */
export function CampaignGatesForm({
  campaignId,
  gates: initialGates,
}: {
  campaignId: string
  /** The stored column, straight off the row — `null` reads as all off. */
  gates: CampaignGates | null
}) {
  const [gates, setGates] = useState<CampaignGates>(initialGates ?? {})
  const [working, setWorking] = useState<GateKey | null>(null)

  async function toggle(key: GateKey, on: boolean) {
    if (working) return

    const previous = gates
    const next = { ...gates, [key]: on }

    setGates(next)
    setWorking(key)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/gates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gates: next }),
      })

      if (!response.ok) {
        setGates(previous)
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That switch did not save. Try again.')
        return
      }

      toast.success(
        on
          ? 'On. Your players will see it next time their sheet refreshes.'
          : 'Off. It is hidden on their sheets — nothing they had is gone.',
      )
    } catch {
      setGates(previous)
      toast.error('That switch did not save. Check your connection.')
    } finally {
      setWorking(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What your players see</CardTitle>
        <CardDescription>
          Start with everything off and switch a part of the sheet on when the table is ready for
          it. Turning one off only hides it — everything underneath keeps being tracked, and comes
          straight back when you turn it on again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {GATES.map((gate) => {
          const on = gates[gate.key] === true

          return (
            <div
              key={gate.key}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 space-y-1">
                <label htmlFor={`gate-${gate.key}`} className="block text-sm font-medium">
                  {gate.label}
                </label>
                {/* What it adds, then what they have without it. The second
                    line is the one that makes leaving it off a decision
                    rather than a deferral. */}
                <p className="text-muted-foreground text-xs">{gate.adds}</p>
                <p className="text-muted-foreground text-xs italic">
                  {on ? 'On for this campaign.' : gate.whileOff}
                </p>
              </div>
              <Switch
                id={`gate-${gate.key}`}
                className="mt-1 shrink-0"
                checked={on}
                disabled={working !== null}
                onCheckedChange={(checked) => void toggle(gate.key, checked)}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
