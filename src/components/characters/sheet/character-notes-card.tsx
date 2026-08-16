'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MAX_NOTE_LENGTH } from '@/lib/notes/schema'

/**
 * A player's own notes for their character (DND-058) — "owe 50gp to the smith",
 * "don't trust the mayor".
 *
 * On the sheet's *read* half, and saved like the build form rather than through
 * `useCombatState`: notes are not combat state, nobody races the player for
 * them, and routing them through the version-guarded pipeline would mean a
 * half-typed thought could answer 409. An explicit Save button for the same
 * reason — the combat cards save on tap because a tap is the whole gesture, but
 * a paragraph is not finished until its author says so.
 *
 * **Only the owner ever sees this card.** `/api/characters/[id]/notes` scopes on
 * `characters.owner_id`, not the DND-027 viewer predicate, so a DM reading this
 * sheet gets neither the text nor the card.
 */
export function CharacterNotesCard({
  characterId,
  notes: initialNotes,
}: {
  characterId: string
  notes: string
}) {
  const [saved, setSaved] = useState(initialNotes)
  const [draft, setDraft] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = draft !== saved

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || !dirty) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/characters/${characterId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'Your notes did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { notes: { body: string } }
      setSaved(payload.notes.body)
      setDraft(payload.notes.body)
      toast.success('Notes saved.')
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your notes</CardTitle>
        <CardDescription>
          Private to you — your DM cannot read these, even though they can see the rest of this
          sheet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-2">
          <Label htmlFor="character-notes" className="sr-only">
            Your notes
          </Label>
          <Textarea
            id="character-notes"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Who owes you money, what you overheard, what you meant to ask."
            rows={5}
            maxLength={MAX_NOTE_LENGTH}
          />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save notes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
