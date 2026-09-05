'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Campaign } from '@/lib/db/schema'
import { MAX_PREP_TEXT_LENGTH } from '@/lib/prep/fields'

/**
 * The headings the one page is seeded with — plain lines of text, not fields.
 *
 * Research §2: a session zero writes down the pitch, the tone, how the party
 * knows each other, how deadly the game is, the phone rule and the schedule,
 * and "one page is plenty". They are text rather than six inputs because the
 * page is written *as it would be said*, and a DM who wants to drop a heading
 * or add one should be able to, on a phone, without a form fighting them.
 */
export const SESSION_ZERO_HEADINGS = [
  'The pitch —',
  'The tone —',
  'How you know each other —',
  'How deadly —',
  'Phones —',
  'When we play —',
] as const

/** The seed: one heading per paragraph, so the players' page reads as six. */
export const SESSION_ZERO_TEMPLATE = SESSION_ZERO_HEADINGS.join('\n\n')

/**
 * The DM's editor for the one page (`first-table/session-zero-one-pager`).
 *
 * The one thing the DM writes that the players read straight off the campaign
 * row, so it is the character-notes card's shape — a textarea and a Save
 * button, nothing optimistic — rather than a prep entity's: there is no secret
 * half to mark, and a paragraph is not finished until its author says so.
 * Seeded with the headings when nothing has been written, and an untouched
 * seed is not "dirty": Save only lights up once the DM has actually written
 * something, so six empty headings never reach six phones by a stray tap.
 */
export function SessionZeroCard({
  campaignId,
  body,
}: {
  campaignId: string
  /** The column, straight off the row — null until the DM writes it. */
  body: string | null
}) {
  const initial = body ?? SESSION_ZERO_TEMPLATE
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = draft !== saved

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || !dirty) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-zero`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'The page did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { campaign: Pick<Campaign, 'sessionZero'> }
      const stored = payload.campaign.sessionZero ?? ''
      setSaved(stored)
      setDraft(stored)
      toast.success(stored ? 'Saved. Your players can read it on their campaign page.' : 'Cleared.')
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">The one page</CardTitle>
        <CardDescription>
          Your players read this on their campaign page. Write it as you would say it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-2">
          <Label htmlFor="session-zero" className="sr-only">
            The one page
          </Label>
          <Textarea
            id="session-zero"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={10}
            maxLength={MAX_PREP_TEXT_LENGTH}
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
