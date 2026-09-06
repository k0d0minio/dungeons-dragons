'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DM_NOTE_TEMPLATE } from '@/lib/notes/dm-note'
import { MAX_NOTE_LENGTH } from '@/lib/notes/schema'

/**
 * What the DM knows about a character, and never shows
 * (`first-table/dm-character-notes`).
 *
 * The pair of the player's `CharacterNotesCard` with the readers reversed —
 * the same textarea and Save, the DM's pattern everywhere else in prep. A note
 * opened for the first time comes seeded with the four headings the research
 * named: *The player*, *Hooks*, *Ask next session*, *Threads*. **Headings are
 * text, not fields.** A first-time DM writes prose, and a form of eight boxes
 * is the thing that stops him; the seed is deleted or rewritten like any
 * other line.
 *
 * `/api/campaigns/[id]/party/[characterId]/dm-note` scopes on the campaign
 * being this DM's and the character being on its roster, so the owner of the
 * character never has a route to this text.
 */
export function DmNoteCard({
  campaignId,
  characterId,
  characterName,
  note: initialNote,
}: {
  campaignId: string
  characterId: string
  characterName: string
  /** The stored note, `''` when there is none yet. */
  note: string
}) {
  const seed = initialNote === '' ? DM_NOTE_TEMPLATE : initialNote
  const [saved, setSaved] = useState(initialNote)
  const [draft, setDraft] = useState(seed)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = draft !== saved

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || !dirty) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/party/${characterId}/dm-note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'Your note did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { note: { body: string } }
      setSaved(payload.note.body)
      setDraft(payload.note.body)
      toast.success('Note saved.')
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your note on {characterName}</CardTitle>
        <CardDescription>
          Only you can read this. The headings are just text — write it as you would say it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-2">
          <Label htmlFor="dm-note" className="sr-only">
            Your note on {characterName}
          </Label>
          <Textarea
            id="dm-note"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={12}
            maxLength={MAX_NOTE_LENGTH}
          />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save note'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
