'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { CampaignNote } from '@/lib/db/schema'
import { formatSessionDate, MAX_NOTE_LENGTH } from '@/lib/notes/schema'

// The DM's own notes, filed under the night they were written for
// (`dm-chronology/sessions-tab`).
//
// **Notes moved here.** They were a card on the campaign hub — a stack of
// dated blocks with a switch on each, above and below the rest of a scroll —
// and every one of them is *about a night*, which is the epic's whole claim
// (Jamie, 2026-09-07, answer 7). So they are rows on the night they belong to:
// the list says which are shared in a word, and the note itself opens in a
// sheet, which is the epic's rail for a quick edit.
//
// Quick capture is untouched. A line typed on the tracker or the Play tab
// still lands on the end of tonight's open note by `session_date`
// (`appendToSessionNote`), and that note is one of these rows on tonight's
// page — the two surfaces write the same row rather than two.
//
// Every write here is one of the three note routes that already existed. This
// file adds a shape, not an endpoint.

/** The first line of a note, which is what a DM titled it whether they meant to or not. */
function summarise(body: string): string {
  const first = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!first) return 'Empty note'

  return first.length > 60 ? `${first.slice(0, 60).trimEnd()}…` : first
}

/** How many lines the DM has written under this date. */
function lineCount(body: string): string {
  const lines = body.split('\n').filter((line) => line.trim().length > 0).length

  return `${lines} ${lines === 1 ? 'line' : 'lines'}`
}

/** The sheet both the edit row and the write row open — one form, two jobs. */
function NoteSheet({
  open,
  onOpenChange,
  title,
  description,
  body,
  onBody,
  sessionDate,
  onSessionDate,
  shared,
  onShared,
  saving,
  error,
  onSave,
  onDelete,
  canShare = true,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  title: string
  description: string
  body: string
  onBody: (next: string) => void
  sessionDate: string
  onSessionDate: ((next: string) => void) | null
  shared: boolean
  onShared: (next: boolean) => void
  saving: boolean
  error: string | null
  onSave: () => void
  onDelete?: () => void
  canShare?: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl p-0 sm:mx-auto sm:max-w-2xl [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <form
          className="space-y-4 p-4 pb-10"
          onSubmit={(event) => {
            event.preventDefault()
            onSave()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="night-note-body">What happened</Label>
            <Textarea
              id="night-note-body"
              value={body}
              disabled={saving}
              rows={8}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="What happened, who they met, what they owe."
              onChange={(event) => onBody(event.target.value)}
            />
          </div>

          {onSessionDate ? (
            <div className="space-y-1.5">
              <Label htmlFor="night-note-date">The night it belongs to</Label>
              <Input
                id="night-note-date"
                type="date"
                value={sessionDate}
                disabled={saving}
                className="h-11 w-auto"
                onChange={(event) => onSessionDate(event.target.value)}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Filed under {formatSessionDate(sessionDate)}.
            </p>
          )}

          {canShare ? (
            <div className="flex items-center gap-3">
              <Switch
                id="night-note-shared"
                checked={shared}
                disabled={saving}
                onCheckedChange={onShared}
              />
              <Label htmlFor="night-note-shared" className="text-sm font-normal">
                Players can read this
              </Label>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-11" disabled={saving || !body.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {onDelete ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={saving}
                onClick={onDelete}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** One note as a row, with the whole of it — and its Private/Shared state — behind it. */
function NoteRow({
  campaignId,
  note,
  onChanged,
  onDeleted,
  fixedDate,
  canDelete = true,
  label,
}: {
  campaignId: string
  note: CampaignNote
  onChanged: (note: CampaignNote) => void
  onDeleted: (id: string) => void
  /** True on a night's page: the date is the night, and the sheet says so. */
  fixedDate: boolean
  canDelete?: boolean
  /** What the row is called. Defaults to the note's first line. */
  label?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState(note.body)
  const [sessionDate, setSessionDate] = useState(note.sessionDate)
  const [shared, setShared] = useState(note.sharedWithPlayers)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openSheet() {
    setBody(note.body)
    setSessionDate(note.sessionDate)
    setShared(note.sharedWithPlayers)
    setError(null)
    setOpen(true)
  }

  async function save() {
    if (saving || !body.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), sessionDate, sharedWithPlayers: shared }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'That change did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { note: CampaignNote }
      onChanged(payload.note)
      setOpen(false)
      // The night's counts and, when the date moved, which night this note is
      // even on are the server's answer — so the page re-reads rather than
      // this list guessing at it.
      router.refresh()
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (saving) return

    setSaving(true)

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

      setOpen(false)
      onDeleted(note.id)
      router.refresh()
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li>
      <button type="button" onClick={openSheet} className={`${INSET_ROW_CLASS} hover:bg-accent`}>
        <InsetRowBody
          label={label ?? summarise(note.body)}
          hint={`${formatSessionDate(note.sessionDate)} · ${lineCount(note.body)}`}
          value={note.sharedWithPlayers ? 'Shared' : 'Private'}
        />
        <InsetRowChevron />
      </button>

      <NoteSheet
        open={open}
        onOpenChange={setOpen}
        title={label ?? 'Your note'}
        description={`Yours unless you share it. ${formatSessionDate(note.sessionDate)}.`}
        body={body}
        onBody={setBody}
        sessionDate={sessionDate}
        onSessionDate={fixedDate ? null : setSessionDate}
        shared={shared}
        onShared={setShared}
        saving={saving}
        error={error}
        onSave={() => void save()}
        onDelete={canDelete ? () => void remove() : undefined}
      />
    </li>
  )
}

/** The row that starts a note already filed under this night. */
function WriteNoteRow({
  campaignId,
  sessionDate,
  onCreated,
}: {
  campaignId: string
  sessionDate: string
  onCreated: (note: CampaignNote) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [shared, setShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openSheet() {
    setBody('')
    setShared(false)
    setError(null)
    setOpen(true)
  }

  async function create() {
    if (saving || !body.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The night decides the date. That is the whole point of the form
        // living here rather than on a hub: a note written on this page is
        // about this night, and nobody has to pick the date twice.
        body: JSON.stringify({ body: body.trim(), sessionDate, sharedWithPlayers: shared }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'That note did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { note: CampaignNote }
      onCreated(payload.note)
      setOpen(false)
      toast.success('Note saved.')
      router.refresh()
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li>
      <button type="button" onClick={openSheet} className={`${INSET_ROW_CLASS} hover:bg-accent`}>
        <InsetRowBody
          label="Write a note"
          hint={`Filed under ${formatSessionDate(sessionDate)}.`}
        />
        <InsetRowChevron />
      </button>

      <NoteSheet
        open={open}
        onOpenChange={setOpen}
        title="Write a note"
        description={`Yours unless you share it. Filed under ${formatSessionDate(sessionDate)}.`}
        body={body}
        onBody={setBody}
        sessionDate={sessionDate}
        onSessionDate={null}
        shared={shared}
        onShared={setShared}
        saving={saving}
        error={error}
        onSave={() => void create()}
      />
    </li>
  )
}

/**
 * The notes of one night, as rows inside an inset group.
 *
 * Returns list items rather than a list: the group around them is the night
 * page's, so the notes sit in the same inset list as everything else on the
 * screen instead of being a card wearing a list's clothes.
 */
export function NightNotes({
  campaignId,
  notes: initial,
  writeFor = null,
  fixedDate = true,
  readOnly = false,
}: {
  campaignId: string
  notes: CampaignNote[]
  /** The date a new note is filed under. Null when there is nothing to write on. */
  writeFor?: string | null
  /** False in the orphan group, where changing the date is the point. */
  fixedDate?: boolean
  readOnly?: boolean
}) {
  const [notes, setNotes] = useState(initial)

  return (
    <>
      {notes.map((note) => (
        <NoteRow
          key={note.id}
          campaignId={campaignId}
          note={note}
          fixedDate={fixedDate}
          canDelete={!readOnly}
          onChanged={(next) =>
            setNotes((current) => current.map((one) => (one.id === next.id ? next : one)))
          }
          onDeleted={(id) => setNotes((current) => current.filter((one) => one.id !== id))}
        />
      ))}

      {writeFor && !readOnly ? (
        <WriteNoteRow
          campaignId={campaignId}
          sessionDate={writeFor}
          onCreated={(note) => setNotes((current) => [note, ...current])}
        />
      ) : null}
    </>
  )
}

/**
 * The recap, and the one row that edits it.
 *
 * The recap is a note like the others and is deliberately not one of them on
 * this screen: it is the thing the party is already reading, so it is printed
 * in full at the top under a header that says so, and the only act on it is
 * Edit. Deleting it would delete the night — `listNights` keys a played night
 * by its recap — so this row cannot.
 */
export function RecapNote({ campaignId, note }: { campaignId: string; note: CampaignNote }) {
  return (
    <>
      <li className="px-4 py-3">
        {/* Quick capture joins lines with newlines; without pre-wrap a whole
            evening reads as one paragraph. */}
        <p className="text-sm whitespace-pre-wrap">{note.body}</p>
      </li>
      <NoteRow
        campaignId={campaignId}
        note={note}
        fixedDate
        canDelete={false}
        label="Edit the recap"
        onChanged={() => undefined}
        onDeleted={() => undefined}
      />
    </>
  )
}
