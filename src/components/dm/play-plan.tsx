'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { SecretLayer } from '@/components/campaigns/prep-fields'
import { SessionPlanChecklist } from '@/components/campaigns/session-plan-checklist'
import { Section } from '@/components/dm/inset-list'
import { Button } from '@/components/ui/button'
import { formatSessionDate } from '@/lib/notes/schema'
import type { CampaignSessionPlan, SessionPlanItem } from '@/lib/db/schema'

/** The plan's own words for its DM-only half, as the plan screen says them. */
const PLAN_SECRET_BLURB =
  'A strong start is heard, never read out. None of this travels with the night when you announce it.'

/**
 * Tonight's plan, on the screen the night is run from
 * (`dm-chronology/play-tab`).
 *
 * Which plan this is was decided on the server by `tonightsPlan`, and it is
 * **derived** — the date on the plan says which night it is for, and there is
 * no "tonight" column to set or to forget to clear. What that leaves is the
 * one case where the derivation and the evening disagree: a night that was
 * moved, or a plan written without a date that is being run right now. "Make
 * this tonight's plan" is the repair, and all it does is put today's date on
 * the plan — the same write the plan editor's date field makes, from the
 * screen where the discrepancy is noticed.
 *
 * The strong start is printed in full and behind `SecretLayer`, the same
 * marking every prep screen uses. It is a paragraph the DM reads to himself
 * and then says out loud, so truncating it would be useless and unmarking it
 * would be a phone turned around at the wrong moment.
 *
 * The scenes and the secrets are `SessionPlanChecklist`, unchanged: the
 * mid-session shape it already establishes — one full-width tap per line,
 * arranging behind a mode toggle — is exactly what this screen wants, and a
 * second implementation of a tick is a second place for it to be optimistic
 * differently.
 */
export function PlayPlan({
  campaignId,
  plan,
  initialItems,
  today,
}: {
  campaignId: string
  plan: CampaignSessionPlan
  initialItems: SessionPlanItem[]
  /** `YYYY-MM-DD` in UTC, from the server, so the row and the query agree. */
  today: string
}) {
  const [items, setItems] = useState(initialItems)
  const [sessionDate, setSessionDate] = useState(plan.sessionDate)
  const [claiming, setClaiming] = useState(false)

  const isTonight = sessionDate === today
  const scenes = items.filter((item) => item.kind === 'scene')
  const secrets = items.filter((item) => item.kind === 'secret')

  async function claimTonight() {
    if (claiming) return
    setClaiming(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionDate: today }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That did not save. Try again.')
        return
      }

      const body = (await response.json()) as { plan: CampaignSessionPlan }
      setSessionDate(body.plan.sessionDate)
      toast.success('This is tonight’s plan.')
    } catch {
      toast.error('That did not send. Check your connection.')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <Section title="Tonight’s plan">
      <div className="space-y-4 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium">{plan.title}</h3>
            <p className="text-muted-foreground text-xs">
              {sessionDate === null
                ? 'No date on it yet'
                : isTonight
                  ? 'Tonight'
                  : formatSessionDate(sessionDate)}
            </p>
          </div>

          {isTonight ? null : (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={claiming}
              onClick={() => void claimTonight()}
            >
              {claiming ? 'Saving…' : 'Make this tonight’s plan'}
            </Button>
          )}
        </div>

        {plan.strongStart ? (
          <SecretLayer blurb={PLAN_SECRET_BLURB}>
            <div className="space-y-0.5">
              <h4 className="text-muted-foreground text-xs font-medium">Strong start</h4>
              <p className="text-sm whitespace-pre-wrap">{plan.strongStart}</p>
            </div>
          </SecretLayer>
        ) : (
          <p className="text-muted-foreground text-sm">
            No strong start written. One paragraph — where they are as it opens, and what is already
            wrong.
          </p>
        )}

        <SessionPlanChecklist
          campaignId={campaignId}
          planId={plan.id}
          kind="scene"
          heading="Potential scenes"
          blurb="Three to five things that might happen. Tick one off when it does."
          addLabel="Add a scene"
          placeholder="A scene that might happen"
          empty="No scenes yet. Three to five is plenty — they are possibilities, not a running order."
          items={scenes}
          onItemsChange={(updater) => setItems((current) => updater(current))}
        />

        <SessionPlanChecklist
          campaignId={campaignId}
          planId={plan.id}
          kind="secret"
          heading="Secrets & clues"
          blurb="About ten one-liners. Tick one off the moment you drop it."
          addLabel="Add a secret or clue"
          placeholder="One thing they could learn tonight"
          empty="No secrets yet. Ten one-sentence facts the party could learn, in any order, anywhere."
          items={secrets}
          onItemsChange={(updater) => setItems((current) => updater(current))}
        />

        <Link
          href={`/dm/campaigns/${campaignId}/session-plans/${plan.id}`}
          className="text-muted-foreground inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
        >
          The whole plan — treasure, links, the editor
        </Link>
      </div>
    </Section>
  )
}

/**
 * What the Play tab says when no plan is tonight's
 * (`dm-chronology/play-tab`): one line and the way to Prep.
 *
 * Its own component rather than a branch inside the one above, so the screen
 * with a plan on it never carries the code for the screen without one — and so
 * "no plan" is one line and a link rather than an empty version of a full
 * section.
 */
export function NoPlanTonight({ campaignId }: { campaignId: string }) {
  return (
    <Section title="Tonight’s plan">
      <div className="space-y-2 p-3">
        <p className="text-muted-foreground text-sm">
          Nothing prepped for tonight. A strong start and a handful of secrets is a session.
        </p>
        <Link
          href={`/dm/campaigns/${campaignId}/session-plans`}
          className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
        >
          Plan a night in Prep
        </Link>
      </div>
    </Section>
  )
}
