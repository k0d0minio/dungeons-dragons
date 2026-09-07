'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { FieldInput } from '@/components/campaigns/prep-fields'
import { INSET_ROW_CLASS, InsetRowBody, InsetRowChevron } from '@/components/dm/inset-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { CampaignSessionPlan } from '@/lib/db/schema'
import {
  MAX_SESSION_PLAN_TITLE_LENGTH,
  SESSION_PLAN_PUBLIC_FIELDS,
} from '@/lib/session-plans/schema'

/**
 * Start a night, from the Prep tab (`dm-chronology/prep-tab`).
 *
 * The form is `SessionPlanRoster`'s — a title and, if it is fixed yet, the
 * date — moved into a bottom sheet so the tab underneath stays where it was.
 * That is the epic's sixth rail: a quick edit is a sheet over the list, not a
 * page you have to walk back from.
 *
 * **It lands you on the night it made.** The roster stayed put and toasted,
 * because it was a list of plans and the new one appeared in it. A tab is not
 * that list: the reason to name a night is to prep it, and the plan screen is
 * where the eight steps are — so the successful POST navigates. The tab
 * re-renders with the new hero on the way back.
 *
 * Two shapes, one component, because the empty state and the filled tab both
 * offer exactly this and must offer the same form: a list row under Nights,
 * and the single call to action in the hero when there is no plan at all.
 */
export function PlanNightSheet({
  campaignId,
  label,
  hint,
  variant = 'row',
}: {
  campaignId: string
  label: string
  hint?: string
  /** `row` sits in an inset group; `button` is the empty state's one control. */
  variant?: 'row' | 'button'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateField = SESSION_PLAN_PUBLIC_FIELDS.find((field) => field.key === 'sessionDate')

  function openSheet() {
    setTitle('')
    setSessionDate('')
    setError(null)
    setOpen(true)
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

      const { plan } = (await response.json()) as { plan: CampaignSessionPlan }
      setOpen(false)
      toast.success(`${plan.title} is on the calendar.`)
      router.push(`/dm/campaigns/${campaignId}/session-plans/${plan.id}`)
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const trigger =
    variant === 'row' ? (
      <li>
        <button type="button" onClick={openSheet} className={`${INSET_ROW_CLASS} hover:bg-accent`}>
          <InsetRowBody label={label} hint={hint} />
          <InsetRowChevron />
        </button>
      </li>
    ) : (
      <Button type="button" className="h-11 w-full sm:w-auto" onClick={openSheet}>
        {label}
      </Button>
    )

  return (
    <>
      {trigger}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-xl p-0 sm:mx-auto sm:max-w-2xl [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
        >
          <SheetHeader className="border-b pr-14">
            <SheetTitle className="text-lg">Plan a night</SheetTitle>
            <SheetDescription>
              A title is enough to start. The rest of the prep fills in over the week.
            </SheetDescription>
          </SheetHeader>

          <form
            className="space-y-4 p-4 pb-10"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="plan-night-title">Title</Label>
              <Input
                id="plan-night-title"
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
                id="plan-night-session-date"
                field={dateField}
                value={sessionDate}
                disabled={saving}
                onChange={setSessionDate}
              />
            ) : null}

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="h-11 w-full" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : 'Start the night'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
