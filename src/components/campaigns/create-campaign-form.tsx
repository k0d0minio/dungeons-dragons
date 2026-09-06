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
 * One field, one button: a campaign is a name and a DM (DND-046).
 *
 * And, since `first-table/one-night-campaign`, one checkbox: **carry the table
 * forward**. The tutorial is a campaign that starts and ends in a night, and
 * the real campaign after it has the same seats — so rather than a new join
 * link sent round and everyone joining again, the new campaign can start with
 * every member and every character of one the DM already runs (usually the one
 * just closed). Unticked by default, because most campaigns start empty; the
 * sentence under it says what crosses, and it is only ever a campaign this DM
 * runs — the route refuses any other pointer before creating anything.
 *
 * One campaign is a checkbox naming it; more than one is the checkbox and a
 * plain `<select>` beside it. A native select rather than the Radix one, on
 * purpose: it is a list of a handful of names on a screen visited between
 * sessions, and the OS picker on a phone is the better control for that.
 */
export function CreateCampaignForm({ campaigns }: { campaigns: CarryableCampaign[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [carry, setCarry] = useState(false)
  const [carryFrom, setCarryFrom] = useState(campaigns[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const source = campaigns.find((campaign) => campaign.id === carryFrom) ?? campaigns[0] ?? null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(carry && source ? { carryFrom: source.id } : {}),
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'That did not save. Try again.')
        return
      }

      setName('')
      setCarry(false)
      router.refresh()
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
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
