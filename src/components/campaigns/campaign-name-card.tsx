'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Campaign } from '@/lib/db/schema'

/** The same ceiling the create form and the route enforce. */
export const MAX_CAMPAIGN_NAME_LENGTH = 120

/**
 * Renaming a campaign (`dm-chronology/campaign-settings`).
 *
 * The one control on the settings page that is genuinely new rather than
 * re-homed: until now a name was typed once, into the create form, and was
 * never editable again — which matters more since D48, because the name is no
 * longer a heading on a page you can ignore, it is the chip under every tab's
 * title.
 *
 * A Save button rather than an optimistic write, like the one page and unlike
 * the gates: a half-typed name is not a state anyone wants sent, and Save only
 * lights up once the text has actually changed. `router.refresh()` afterwards
 * because the name is rendered by the server in three places on the screen
 * behind this sheet — the header, the chip, and this row's value.
 */
export function CampaignNameCard({
  campaignId,
  name,
}: {
  campaignId: string
  /** The stored column, straight off the row. */
  name: string
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(name)
  const [draft, setDraft] = useState(name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = draft.trim()
  const dirty = trimmed !== saved && trimmed.length > 0

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || !dirty) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'The name did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { campaign: Pick<Campaign, 'name'> }
      setSaved(payload.campaign.name)
      setDraft(payload.campaign.name)
      toast.success('Renamed.')
      router.refresh()
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campaign name</CardTitle>
        <CardDescription>
          What this table is called. It is the name under every tab and the one your players see on
          their campaign page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-2">
          <Label htmlFor="campaign-name">Name</Label>
          <Input
            id="campaign-name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_CAMPAIGN_NAME_LENGTH}
            disabled={saving}
          />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
