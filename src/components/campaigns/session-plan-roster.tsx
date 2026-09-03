'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CampaignSessionPlan } from '@/lib/db/schema'
import { formatSessionDate } from '@/lib/notes/schema'
import {
  MAX_SESSION_PLAN_TITLE_LENGTH,
  SESSION_PLAN_PUBLIC_FIELDS,
} from '@/lib/session-plans/schema'

import { FieldInput } from './prep-fields'

// The campaign's session plans, newest night first
// (`dm-prep-suite/session-plans`).
//
// A list rather than the plans themselves: a plan is five sections and two
// checklists, and reading a week's worth of that on a phone is not a list. Each
// row is a tap through to the night, and the night is where everything happens.
//
// Adding takes a title and, if it is fixed yet, a date — the four other
// sections are written on the plan's own screen over the week. Nothing here can
// announce a night: `revealedAt` is absent from the schema this posts to, and
// the badge reports the column rather than offering a switch
// (`dm-run-suite/reveal-controls`).

/** Newest night first, undated plans above the lot — the data layer's order. */
function byNight(a: CampaignSessionPlan, b: CampaignSessionPlan): number {
  if (a.sessionDate !== b.sessionDate) {
    if (!a.sessionDate) return -1
    if (!b.sessionDate) return 1
    return b.sessionDate.localeCompare(a.sessionDate)
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

export function SessionPlanRoster({
  campaignId,
  plans: initialPlans,
}: {
  campaignId: string
  plans: CampaignSessionPlan[]
}) {
  const [plans, setPlans] = useState<CampaignSessionPlan[]>(() => [...initialPlans].sort(byNight))
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dateField = SESSION_PLAN_PUBLIC_FIELDS.find((field) => field.key === 'sessionDate')

  function reset() {
    setTitle('')
    setSessionDate('')
    setError(null)
  }

  async function create() {
    if (saving || !title.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), sessionDate: sessionDate.trim() || null }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'That plan did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { plan: CampaignSessionPlan }
      setPlans((current) => [...current, payload.plan].sort(byNight))
      reset()
      setAdding(false)
      toast.success(`${payload.plan.title} is on the calendar.`)
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Session plans</CardTitle>
        <CardDescription>
          One night at a time: a strong start, the scenes that might happen, the secrets to drop,
          the treasure, and the prep it leans on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.length > 0 ? (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/dm/campaigns/${campaignId}/session-plans/${plan.id}`}
                  className="hover:bg-accent flex min-h-14 items-center justify-between gap-3 rounded-md border p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{plan.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {plan.sessionDate ? formatSessionDate(plan.sessionDate) : 'No date yet'}
                    </span>
                  </span>
                  <Badge variant={plan.revealedAt ? 'secondary' : 'outline'} className="shrink-0">
                    {plan.revealedAt ? 'Announced' : 'Not announced'}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No plans yet. A title is enough to start one — the five sections fill in over the week.
          </p>
        )}

        <div className="space-y-2 border-t pt-4">
          {adding ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void create()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="new-plan-title">Title</Label>
                <Input
                  id="new-plan-title"
                  value={title}
                  disabled={saving}
                  maxLength={MAX_SESSION_PLAN_TITLE_LENGTH}
                  placeholder="Session 4 — the shrine"
                  className="h-11"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              {dateField ? (
                <FieldInput
                  id="new-plan-session-date"
                  field={dateField}
                  value={sessionDate}
                  disabled={saving}
                  onChange={setSessionDate}
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="h-11" disabled={saving || !title.trim()}>
                  {saving ? 'Saving…' : 'Add plan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={saving}
                  onClick={() => {
                    reset()
                    setAdding(false)
                  }}
                >
                  Cancel
                </Button>
              </div>

              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
            </form>
          ) : (
            <Button type="button" className="h-11" onClick={() => setAdding(true)}>
              Plan a session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
