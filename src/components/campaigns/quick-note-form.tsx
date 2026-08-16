'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CampaignNote } from '@/lib/db/schema'
import { MAX_QUICK_NOTE_LENGTH } from '@/lib/notes/schema'

/**
 * The one-thumb half of DND-058 — "typed during play".
 *
 * One field and one button, because it is used mid-session with a phone in one
 * hand: the innkeeper's name goes in, the field clears, and the line is on the
 * end of tonight's note. Deliberately not a textarea — Enter submits, which is
 * the whole interaction, and a multi-line box would swallow it.
 *
 * Shared by the campaign page and the encounter tracker so the two cannot drift;
 * both land in the same note, decided server-side by date.
 */
export function QuickNoteForm({
  campaignId,
  onCaptured,
  autoFocus = false,
}: {
  campaignId: string
  /** The note as it stands after the append, so a list on screen can repaint. */
  onCaptured?: (note: CampaignNote) => void
  autoFocus?: boolean
}) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()

    const line = text.trim()
    if (saving || !line) return

    setSaving(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/notes/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: line }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That note did not save. Try again.')
        return
      }

      const body = (await response.json()) as { note: CampaignNote }

      // Cleared only on success: a failed line stays in the field to be sent
      // again, rather than being lost by the thing meant to catch it.
      setText('')
      onCaptured?.(body.note)
      toast.success('Added to tonight’s note.')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor={`quick-note-${campaignId}`}>Quick note</Label>
        <Input
          id={`quick-note-${campaignId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="e.g. Innkeeper is called Bram"
          maxLength={MAX_QUICK_NOTE_LENGTH}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>
      <Button type="submit" className="h-11" disabled={saving || !text.trim()}>
        {saving ? 'Adding…' : 'Add'}
      </Button>
    </form>
  )
}
