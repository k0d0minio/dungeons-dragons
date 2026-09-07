'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** What the carry-forward control needs to know about a campaign: its name. */
export interface CarryableCampaign {
  id: string
  name: string
}

/**
 * A campaign that was made, whose carry-forward has not landed yet — the one
 * thing this form remembers across a failure (`triage/carry-forward-rerun`).
 */
interface UnfinishedCarry {
  id: string
  name: string
  source: CarryableCampaign
}

/** Send JSON and come back with either the body or a sentence to show. */
async function send(
  url: string,
  method: string,
  body: unknown,
  fallback: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const problem = (await response.json().catch(() => null)) as { error?: string } | null
      return { ok: false, error: problem?.error ?? fallback }
    }

    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
    return { ok: true, data: data ?? {} }
  } catch {
    return { ok: false, error: 'That did not send. Check your connection and try again.' }
  }
}

function createdId(data: Record<string, unknown>): string | null {
  const campaign = data.campaign
  if (typeof campaign !== 'object' || campaign === null) return null
  const id = (campaign as { id?: unknown }).id
  return typeof id === 'string' ? id : null
}

/**
 * One field, one button: a campaign is a name and a DM (DND-046).
 *
 * And, since `first-table/one-night-campaign`, one checkbox: **carry the table
 * forward**. The tutorial is a campaign that starts and ends in a night, and
 * the real campaign after it has the same seats — so rather than a new join
 * link sent round and everyone joining again, the new campaign can start with
 * every member and every character of one the DM already runs (usually the one
 * just closed). Unticked by default, because most campaigns start empty; the
 * sentence under it says what crosses, and it is only ever a campaign this DM
 * runs — the route refuses any other pointer.
 *
 * One campaign is a checkbox naming it; more than one is the checkbox and a
 * plain `<select>` beside it. A native select rather than the Radix one, on
 * purpose: it is a list of a handful of names on a screen visited between
 * sessions, and the OS picker on a phone is the better control for that.
 *
 * **Two calls, and the second one can be pressed again**
 * (`triage/carry-forward-rerun`). Create, then carry: the campaign is made by
 * `POST /api/campaigns` and the table is brought across by `PUT
 * /api/campaigns/[id]/carry-from`, which is idempotent. A carry that fails is
 * therefore not a campaign to be remade — the id is held here, the form
 * becomes the one button that finishes the job, and only a finished carry
 * refreshes the page out from under it. Leaving it is a real answer too: the
 * campaign exists, and its own page offers the same carry.
 */
export function CreateCampaignForm({ campaigns }: { campaigns: CarryableCampaign[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [carry, setCarry] = useState(false)
  const [carryFrom, setCarryFrom] = useState(campaigns[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [unfinished, setUnfinished] = useState<UnfinishedCarry | null>(null)

  const source = campaigns.find((campaign) => campaign.id === carryFrom) ?? campaigns[0] ?? null

  /** The campaign is made and the table is across: start the form again. */
  function done() {
    setName('')
    setCarry(false)
    setUnfinished(null)
    router.refresh()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      let pending = unfinished

      if (!pending) {
        const created = await send(
          '/api/campaigns',
          'POST',
          { name: name.trim() },
          'That did not save. Try again.',
        )

        if (!created.ok) {
          setError(created.error)
          return
        }

        // Nothing to carry: the campaign is the whole job.
        if (!carry || !source) {
          done()
          return
        }

        const id = createdId(created.data)

        if (id === null) {
          setError(
            'The campaign was made, but the app did not get its id back. Open it and carry the table across from there.',
          )
          done()
          return
        }

        pending = { id, name: name.trim(), source }
      }

      const carried = await send(
        `/api/campaigns/${pending.id}/carry-from`,
        'PUT',
        { campaignId: pending.source.id },
        'The table did not carry across. Try again.',
      )

      if (!carried.ok) {
        // The campaign stands; only the carry is owed. Holding its id here is
        // what makes the button below a re-run rather than a second campaign.
        setUnfinished(pending)
        setError(carried.error)
        return
      }

      done()
    } finally {
      setSubmitting(false)
    }
  }

  if (unfinished) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm">
          <span className="font-medium">{unfinished.name}</span> was created, but the table did not
          carry across from <span className="font-medium">{unfinished.source.name}</span>. Nothing
          was doubled — pressing again finishes the job.
        </p>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11" disabled={submitting}>
            {submitting ? 'Carrying…' : 'Carry the table across'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={submitting}
            onClick={done}
          >
            Leave it for now
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Leaving it keeps the campaign. Its own page offers the same carry, and the join link still
          works.
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="campaign-name">New campaign</Label>
          <Input
            id="campaign-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Curse of the Wednesday Table"
            maxLength={120}
          />
        </div>
        <Button type="submit" className="h-11" disabled={submitting || !name.trim()}>
          {submitting ? 'Creating…' : 'Create'}
        </Button>
      </div>

      {campaigns.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* The row is the control: a thumb between the box and its words
                still ticks it, and the box itself is the pickers' 20px. */}
            <Label
              htmlFor="carry-forward"
              className="flex min-h-11 cursor-pointer items-center gap-3 font-normal"
            >
              <Checkbox
                id="carry-forward"
                className="size-5"
                checked={carry}
                disabled={submitting}
                onCheckedChange={(checked) => setCarry(checked === true)}
              />
              <span>
                {campaigns.length === 1 ? (
                  <>
                    Carry the table forward from <span className="font-medium">{source?.name}</span>
                  </>
                ) : (
                  'Carry the table forward from'
                )}
              </span>
            </Label>
            {campaigns.length > 1 ? (
              <select
                aria-label="Campaign to carry forward from"
                value={carryFrom}
                disabled={submitting || !carry}
                onChange={(event) => setCarryFrom(event.target.value)}
                className="border-input bg-background h-11 min-w-0 flex-1 rounded-md border px-3 text-sm disabled:opacity-50"
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            Everyone seated there and every character at that table start on the new campaign, with
            the same parts of the sheet switched on. Nobody needs a new join link.
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </form>
  )
}
