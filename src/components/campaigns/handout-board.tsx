'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { HandoutForDm } from '@/lib/db/handouts'
import {
  HANDOUT_FIELDS,
  HANDOUT_PUBLIC_FIELDS,
  HANDOUT_SECRET_FIELDS,
  MAX_HANDOUT_TITLE_LENGTH,
  type HandoutField,
} from '@/lib/handouts/schema'

import { ImageSlotField } from './image-slot-field'
import { FieldInput, ReadField, SecretLayer } from './prep-fields'
import { RevealSwitch } from './reveal-switch'

/** What the DM-only block says on a handout — the same sentence in both views. */
const HANDOUT_SECRET_BLURB =
  'Yours. None of this goes across the table with the handout, before or after you reveal it.'

/** A field's value as the form holds it — `null` in the database is blank here. */
type Draft = Record<HandoutField['key'], string> & { title: string }

/** Alphabetical, matching the data layer's ORDER BY so a save cannot reshuffle. */
function byTitle(a: HandoutForDm, b: HandoutForDm): number {
  const compared = a.title.localeCompare(b.title)
  if (compared !== 0) return compared
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

/** Replace `handout` in the list, or add it if the server just created it. */
function merge(handouts: HandoutForDm[], handout: HandoutForDm): HandoutForDm[] {
  const known = handouts.some((existing) => existing.id === handout.id)
  const next = known
    ? handouts.map((existing) => (existing.id === handout.id ? handout : existing))
    : [...handouts, handout]

  return next.sort(byTitle)
}

function draftFrom(handout: HandoutForDm): Draft {
  const draft = { title: handout.title } as Draft
  for (const field of HANDOUT_FIELDS) draft[field.key] = handout[field.key] ?? ''
  return draft
}

function emptyDraft(): Draft {
  const draft = { title: '' } as Draft
  for (const field of HANDOUT_FIELDS) draft[field.key] = ''
  return draft
}

/** A draft as the API takes it: blank collapses to `null`, which clears a field. */
function payloadFrom(draft: Draft): Record<string, string | null> {
  const payload: Record<string, string | null> = { title: draft.title.trim() }
  for (const field of HANDOUT_FIELDS) payload[field.key] = draft[field.key].trim() || null
  return payload
}

/**
 * The editor, used to add a handout and to change one.
 *
 * Text only — the picture is not in here, and that is not a layout choice. An
 * image goes to its own endpoint the moment it is picked, and a control that
 * saved immediately sitting inside a form with a Save button would be lying
 * about which of the two had happened.
 */
function HandoutEditor({
  idPrefix,
  draft,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: {
  idPrefix: string
  draft: Draft
  saving: boolean
  submitLabel: string
  onChange: (draft: Draft) => void
  onSubmit: () => void
  onCancel?: () => void
}) {
  function set(key: keyof Draft, value: string) {
    onChange({ ...draft, [key]: value })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          value={draft.title}
          disabled={saving}
          maxLength={MAX_HANDOUT_TITLE_LENGTH}
          placeholder="What you call it — not what it says on it"
          onChange={(event) => set('title', event.target.value)}
        />
      </div>

      {HANDOUT_PUBLIC_FIELDS.map((field) => (
        <FieldInput
          key={field.key}
          id={`${idPrefix}-${field.key}`}
          field={field}
          value={draft[field.key]}
          disabled={saving}
          onChange={(value) => set(field.key, value)}
        />
      ))}

      <SecretLayer blurb={HANDOUT_SECRET_BLURB}>
        {HANDOUT_SECRET_FIELDS.map((field) => (
          <FieldInput
            key={field.key}
            id={`${idPrefix}-${field.key}`}
            field={field}
            value={draft[field.key]}
            disabled={saving}
            onChange={(value) => set(field.key, value)}
          />
        ))}
      </SecretLayer>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11" disabled={saving || !draft.title.trim()}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}

/**
 * One handout: the artefact, its picture, the DM-only block under its marking,
 * and the two things you do to prep you got wrong.
 *
 * The picture sits outside the editor and outside the delete confirmation,
 * because it is the one thing on this screen that saves the instant it is
 * touched — its endpoint takes the bytes and answers with the handout.
 */
function HandoutRow({
  campaignId,
  handout,
  onChanged,
  onDeleted,
}: {
  campaignId: string
  handout: HandoutForDm
  onChanged: (handout: HandoutForDm) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(handout))
  const [working, setWorking] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const secrets = HANDOUT_SECRET_FIELDS.filter((field) => handout[field.key])

  async function save() {
    if (working || !draft.title.trim()) return

    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/handouts/${handout.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(draft)),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That change did not save. Try again.')
        return
      }

      const body = (await response.json()) as { handout: HandoutForDm }
      onChanged(body.handout)
      setDraft(draftFrom(body.handout))
      setEditing(false)
      toast.success('Saved.')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  async function remove() {
    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/handouts/${handout.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error(
          response.status === 404
            ? 'That handout is already gone.'
            : 'Could not delete that handout.',
        )
        return
      }

      setConfirming(false)
      onDeleted(handout.id)
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <li className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 font-medium">{handout.title}</h4>
        <Badge variant={handout.revealedAt ? 'secondary' : 'outline'}>
          {handout.revealedAt ? 'Revealed' : 'Hidden'}
        </Badge>
      </div>

      {editing ? (
        <HandoutEditor
          idPrefix={`handout-${handout.id}`}
          draft={draft}
          saving={working}
          submitLabel="Save"
          onChange={setDraft}
          onSubmit={() => void save()}
          onCancel={() => {
            setDraft(draftFrom(handout))
            setEditing(false)
          }}
        />
      ) : (
        <>
          {/* The sliding-across-the-table act, and the one reveal that also
              publishes a file: the picture is served behind the same
              `revealed_at` check, so hiding it again withdraws the bytes. */}
          <RevealSwitch
            endpoint={`/api/campaigns/${campaignId}/handouts/${handout.id}/reveal`}
            revealedAt={handout.revealedAt}
            noun="handout"
            shows="its title, the text and the picture"
            unwrap={(body) => (body as { handout: HandoutForDm }).handout}
            onChanged={onChanged}
          />

          {handout.body ? <p className="text-sm whitespace-pre-wrap">{handout.body}</p> : null}

          <ImageSlotField
            endpoint={`/api/campaigns/${campaignId}/handouts/${handout.id}/image`}
            image={handout.image}
            label="The thing itself"
            hint="A scan, a photo of the page, a slice of the map."
            alt={handout.title}
            unwrap={(body) => (body as { handout: HandoutForDm }).handout}
            onChanged={onChanged}
          />

          {secrets.length > 0 ? (
            <SecretLayer blurb={HANDOUT_SECRET_BLURB}>
              {secrets.map((field) => (
                <ReadField key={field.key} field={field} value={handout[field.key]} />
              ))}
            </SecretLayer>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={working}
              onClick={() => {
                setDraft(draftFrom(handout))
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
                  <AlertDialogTitle>Delete {handout.title}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The entry goes and so does the picture, wherever it was stored. There is no
                    undo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11" disabled={working}>
                    Keep it
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-11"
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
 * The campaign's handouts, as the DM stages them
 * (`dm-prep-suite/locations-handouts`).
 *
 * The third revealable entity, and the one that made this ticket decide where
 * images live. A handout is a letter, a map fragment, a symbol — the public
 * layer *is* the artefact, and what stays behind the screen is what it really
 * is and when to produce it.
 *
 * Nothing on this screen is player-visible, and the reveal switch is what
 * changes that (`dm-run-suite/reveal-controls`): it stamps `revealed_at`, which
 * is the same column the authed image route asks about before it serves the
 * picture — so hiding a handout again withdraws the bytes, not just the row.
 */
export function HandoutBoard({
  campaignId,
  handouts: initialHandouts,
}: {
  campaignId: string
  handouts: HandoutForDm[]
}) {
  const [handouts, setHandouts] = useState<HandoutForDm[]>(() => [...initialHandouts].sort(byTitle))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function create() {
    if (saving || !draft.title.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/handouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(draft)),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'That handout did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { handout: HandoutForDm }
      setHandouts((current) => merge(current, payload.handout))
      setDraft(emptyDraft())
      setAdding(false)
      toast.success(`${payload.handout.title} is staged.`)
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Handouts</CardTitle>
        <CardDescription>
          What you hand across the table. Add the title now and the picture when you have it — a
          handout can be text, an image, or both.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {handouts.length > 0 ? (
          <ul className="space-y-3">
            {handouts.map((handout) => (
              <HandoutRow
                key={handout.id}
                campaignId={campaignId}
                handout={handout}
                onChanged={(next) => setHandouts((current) => merge(current, next))}
                onDeleted={(id) => setHandouts((current) => current.filter((h) => h.id !== id))}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nothing staged yet. A title on its own is enough — the scan can come the night before.
          </p>
        )}

        <div className="space-y-2 border-t pt-4">
          {adding ? (
            <>
              <HandoutEditor
                idPrefix="new-handout"
                draft={draft}
                saving={saving}
                submitLabel="Add handout"
                onChange={setDraft}
                onSubmit={() => void create()}
                onCancel={() => {
                  setDraft(emptyDraft())
                  setError(null)
                  setAdding(false)
                }}
              />
              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
            </>
          ) : (
            <Button type="button" className="h-11" onClick={() => setAdding(true)}>
              Add a handout
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
