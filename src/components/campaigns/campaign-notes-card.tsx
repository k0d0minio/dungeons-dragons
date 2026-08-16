'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { QuickNoteForm } from '@/components/campaigns/quick-note-form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { CampaignNote } from '@/lib/db/schema'
import { formatSessionDate, MAX_NOTE_LENGTH, todaySessionDate } from '@/lib/notes/schema'

/**
 * Notes, newest session first. Sorting here rather than re-fetching keeps a
 * quick capture — which may create tonight's note — in the right place without
 * a round trip, and matches the data layer's ORDER BY exactly.
 */
function bySessionThenCreated(a: CampaignNote, b: CampaignNote): number {
  if (a.sessionDate !== b.sessionDate) return a.sessionDate < b.sessionDate ? 1 : -1
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

/** Replace `note` in the list, or add it if the server just created it. */
function mergeNote(notes: CampaignNote[], note: CampaignNote): CampaignNote[] {
  const known = notes.some((existing) => existing.id === note.id)
  const next = known
    ? notes.map((existing) => (existing.id === note.id ? note : existing))
    : [note, ...notes]

  return next.sort(bySessionThenCreated)
}

/**
 * One session note as the DM sees it: the text, the switch that decides whether
 * the party may read it, and the two things you do to a note you got wrong.
 *
 * The switch is the register's visibility rule at the point of use — "a DM's
 * own notes are not player-readable" — so the label says what turning it on
 * actually does rather than naming the column.
 */
function NoteRow({
  campaignId,
  note,
  onChanged,
  onDeleted,
}: {
  campaignId: string
  note: CampaignNote
  onChanged: (note: CampaignNote) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const [working, setWorking] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function patch(change: { body?: string; sharedWithPlayers?: boolean }, success?: string) {
    if (working) return false

    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That change did not save. Try again.')
        return false
      }

      const body = (await response.json()) as { note: CampaignNote }
      onChanged(body.note)
      if (success) toast.success(success)
      return true
    } catch {
      toast.error('That did not send. Check your connection and try again.')
      return false
    } finally {
      setWorking(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    if (await patch({ body: draft.trim() })) setEditing(false)
  }

  async function remove() {
    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/notes/${note.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error(
          response.status === 404 ? 'That note is already gone.' : 'Could not delete that note.',
        )
        return
      }

      setConfirming(false)
      onDeleted(note.id)
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <li className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-medium">{formatSessionDate(note.sessionDate)}</h4>

        <div className="flex items-center gap-2">
          <Switch
            id={`shared-${note.id}`}
            checked={note.sharedWithPlayers}
            disabled={working}
            onCheckedChange={(checked) =>
              void patch(
                { sharedWithPlayers: checked },
                checked ? 'The party can read this note.' : 'This note is yours again.',
              )
            }
          />
          <Label htmlFor={`shared-${note.id}`} className="text-muted-foreground text-xs">
            Players can read
          </Label>
        </div>
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-2">
          <Label htmlFor={`note-body-${note.id}`} className="sr-only">
            Note
          </Label>
          <Textarea
            id={`note-body-${note.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            maxLength={MAX_NOTE_LENGTH}
          />
          <div className="flex gap-2">
            <Button type="submit" className="h-11" disabled={working || !draft.trim()}>
              {working ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={working}
              onClick={() => {
                setDraft(note.body)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          {/* `whitespace-pre-wrap` is load-bearing: quick capture joins lines
              with newlines, and without it a session reads as one paragraph. */}
          <p className="text-sm whitespace-pre-wrap">{note.body}</p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={working}
              onClick={() => {
                setDraft(note.body)
                setEditing(true)
              }}
            >
              Edit
            </Button>

            <AlertDialog
              open={confirming}
              onOpenChange={(next) => {
                if (working) return
                setConfirming(next)
              }}
            >
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="h-11" disabled={working}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete the note for {formatSessionDate(note.sessionDate)}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Everything written and captured for that session goes with it. There is no undo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11" disabled={working}>
                    Keep it
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90 h-11 text-white"
                    disabled={working}
                    onClick={(event) => {
                      event.preventDefault()
                      void remove()
                    }}
                  >
                    {working ? 'Deleting…' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </li>
  )
}

/**
 * Campaign and session notes, as the DM writes them (DND-058).
 *
 * Both halves of the answer to "typed during play or written up afterwards?"
 * live here, because the honest answer turned out to be both: the quick-capture
 * field at the top is used one-handed mid-session, and the dated long-form
 * notes below it are what a laptop writes up afterwards. They are the same
 * notes — a captured line lands on the end of the same body the form edits.
 *
 * Notes are the DM's by default. The per-note switch is the only thing that
 * lets a player read one, and a shared note reaches them on their character
 * sheet — the smallest read surface that exists, and the reason this feature
 * needed no player campaign screen.
 */
export function CampaignNotesCard({
  campaignId,
  notes: initialNotes,
}: {
  campaignId: string
  notes: CampaignNote[]
}) {
  // Sorted here as well as in the data layer's ORDER BY: "newest session first"
  // is this card's own invariant, and a quick capture can add a note to the
  // list without a round trip that would re-establish it.
  const [notes, setNotes] = useState<CampaignNote[]>(() =>
    [...initialNotes].sort(bySessionThenCreated),
  )
  const [body, setBody] = useState('')
  const [sessionDate, setSessionDate] = useState(todaySessionDate())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const today = todaySessionDate()
  const tonight = notes.find((note) => note.sessionDate === today)

  async function create(event: FormEvent) {
    event.preventDefault()
    if (saving || !body.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), sessionDate }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'That note did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { note: CampaignNote }
      setNotes((current) => mergeNote(current, payload.note))
      setBody('')
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
        <CardTitle className="text-base">Session notes</CardTitle>
        <CardDescription>
          Yours unless you share one. Quick notes go on the end of tonight&apos;s note; a shared
          note shows up on the party&apos;s character sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <QuickNoteForm
            campaignId={campaignId}
            onCaptured={(note) => setNotes((current) => mergeNote(current, note))}
          />
          {/* Says where the line is about to land, so the date rule is on screen
              rather than being something the DM has to remember. */}
          <p className="text-muted-foreground text-xs">
            {tonight
              ? `Adds to tonight’s note (${formatSessionDate(today)}).`
              : `Starts tonight’s note (${formatSessionDate(today)}).`}
          </p>
        </div>

        {notes.length > 0 ? (
          <ul className="space-y-3">
            {notes.map((note) => (
              <NoteRow
                key={note.id}
                campaignId={campaignId}
                note={note}
                onChanged={(next) => setNotes((current) => mergeNote(current, next))}
                onDeleted={(id) => setNotes((current) => current.filter((n) => n.id !== id))}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No notes yet.</p>
        )}

        <form onSubmit={create} className="space-y-2 border-t pt-4">
          <Label htmlFor="new-note-date">New session note</Label>
          <Input
            id="new-note-date"
            type="date"
            value={sessionDate}
            onChange={(event) => setSessionDate(event.target.value)}
            className="w-auto"
          />
          <Label htmlFor="new-note-body" className="sr-only">
            What happened
          </Label>
          <Textarea
            id="new-note-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What happened, who they met, what they owe."
            rows={4}
            maxLength={MAX_NOTE_LENGTH}
          />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11" disabled={saving || !body.trim()}>
            {saving ? 'Saving…' : 'Save note'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
