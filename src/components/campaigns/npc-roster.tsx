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
import { ImageSlotField } from '@/components/campaigns/image-slot-field'
import { FieldInput, ReadField, SecretLayer } from '@/components/campaigns/prep-fields'
import { RevealSwitch } from '@/components/campaigns/reveal-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NpcForDm } from '@/lib/db/npcs'
import {
  MAX_NPC_NAME_LENGTH,
  NPC_FIELDS,
  NPC_PUBLIC_FIELDS,
  NPC_SECRET_FIELDS,
  type NpcField,
} from '@/lib/npcs/schema'

/** A field's value as the form holds it — `null` in the database is blank here. */
type Draft = Record<NpcField['key'], string> & { name: string }

/** Alphabetical, matching the data layer's ORDER BY so a save cannot reshuffle. */
function byName(a: NpcForDm, b: NpcForDm): number {
  const compared = a.name.localeCompare(b.name)
  if (compared !== 0) return compared
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

/** Replace `npc` in the list, or add it if the server just created it. */
function mergeNpc(npcs: NpcForDm[], npc: NpcForDm): NpcForDm[] {
  const known = npcs.some((existing) => existing.id === npc.id)
  const next = known
    ? npcs.map((existing) => (existing.id === npc.id ? npc : existing))
    : [...npcs, npc]

  return next.sort(byName)
}

function draftFrom(npc: NpcForDm): Draft {
  const draft = { name: npc.name } as Draft
  for (const field of NPC_FIELDS) draft[field.key] = npc[field.key] ?? ''
  return draft
}

function emptyDraft(): Draft {
  const draft = { name: '' } as Draft
  for (const field of NPC_FIELDS) draft[field.key] = ''
  return draft
}

/** A draft as the API takes it: blank collapses to `null`, which clears a field. */
function payloadFrom(draft: Draft): Record<string, string | null> {
  const payload: Record<string, string | null> = { name: draft.name.trim() }
  for (const field of NPC_FIELDS) payload[field.key] = draft[field.key].trim() || null
  return payload
}

// `SecretLayer`, `FieldInput` and `ReadField` moved to
// `./prep-fields.tsx` when `locations-handouts` added two more prep screens.
// The marking on the DM-only block is a safety property read at a table with
// players either side of the phone, and three copies of it would be three
// chances for one screen to say it less clearly than the others.

/** What the DM-only block says on an NPC — the same sentence in both views. */
const NPC_SECRET_BLURB = 'Yours. None of this reaches a player, before or after you reveal the NPC.'

/**
 * The editor, used to add an NPC and to change one.
 *
 * Both layers, in the order the table declares them: the name, the public
 * fields the party will eventually read, then the DM-only block. The field
 * lists come from `@/lib/npcs/schema`, so which side of the divider a field
 * falls on is decided by the module that also validates it — not by the order
 * someone typed the JSX in.
 */
function NpcEditor({
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
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          disabled={saving}
          maxLength={MAX_NPC_NAME_LENGTH}
          placeholder="Who the party will call them"
          onChange={(event) => set('name', event.target.value)}
        />
      </div>

      {NPC_PUBLIC_FIELDS.map((field) => (
        <FieldInput
          key={field.key}
          id={`${idPrefix}-${field.key}`}
          field={field}
          value={draft[field.key]}
          disabled={saving}
          onChange={(value) => set(field.key, value)}
        />
      ))}

      <SecretLayer blurb={NPC_SECRET_BLURB}>
        {NPC_SECRET_FIELDS.map((field) => (
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
        <Button type="submit" className="h-11" disabled={saving || !draft.name.trim()}>
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
 * One NPC on the roster: the public face, the DM-only block under its marking,
 * the reveal switch, and the two things you do to prep you got wrong.
 *
 * The badge says which state the NPC is in and the switch below changes it
 * (`dm-run-suite/reveal-controls`). Both read the same `revealed_at`, and the
 * switch is the only thing on this screen that writes it — the editor's PATCH
 * cannot, by construction.
 */
function NpcRow({
  campaignId,
  npc,
  onChanged,
  onDeleted,
}: {
  campaignId: string
  npc: NpcForDm
  onChanged: (npc: NpcForDm) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(npc))
  const [working, setWorking] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const secrets = NPC_SECRET_FIELDS.filter((field) => npc[field.key])

  async function save() {
    if (working || !draft.name.trim()) return

    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(draft)),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That change did not save. Try again.')
        return
      }

      const body = (await response.json()) as { npc: NpcForDm }
      onChanged(body.npc)
      setDraft(draftFrom(body.npc))
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
      const response = await fetch(`/api/campaigns/${campaignId}/npcs/${npc.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error(
          response.status === 404 ? 'That NPC is already gone.' : 'Could not delete that NPC.',
        )
        return
      }

      setConfirming(false)
      onDeleted(npc.id)
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <li className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-medium">{npc.name}</h4>
          {npc.summary ? <p className="text-muted-foreground text-sm">{npc.summary}</p> : null}
        </div>
        <Badge variant={npc.revealedAt ? 'secondary' : 'outline'}>
          {npc.revealedAt ? 'Revealed' : 'Hidden'}
        </Badge>
      </div>

      {editing ? (
        <NpcEditor
          idPrefix={`npc-${npc.id}`}
          draft={draft}
          saving={working}
          submitLabel="Save"
          onChange={setDraft}
          onSubmit={() => void save()}
          onCancel={() => {
            setDraft(draftFrom(npc))
            setEditing(false)
          }}
        />
      ) : (
        <>
          {npc.description ? (
            <p className="text-sm whitespace-pre-wrap">{npc.description}</p>
          ) : null}

          {/* First control on the row, above editing and deleting: mid-scene
              this is the one a DM reaches for, and the two below it are prep. */}
          <RevealSwitch
            endpoint={`/api/campaigns/${campaignId}/npcs/${npc.id}/reveal`}
            revealedAt={npc.revealedAt}
            noun="NPC"
            shows="their name, your one-line summary, the description and the portrait"
            unwrap={(body) => (body as { npc: NpcForDm }).npc}
            onChanged={onChanged}
          />

          <ImageSlotField
            endpoint={`/api/campaigns/${campaignId}/npcs/${npc.id}/portrait`}
            image={npc.portrait}
            label="Portrait"
            hint="Public layer — this is the face the party sees when you reveal them."
            alt={`Portrait of ${npc.name}`}
            unwrap={(body) => (body as { npc: NpcForDm }).npc}
            onChanged={onChanged}
          />

          {secrets.length > 0 ? (
            <SecretLayer blurb={NPC_SECRET_BLURB}>
              {secrets.map((field) => (
                <ReadField key={field.key} field={field} value={npc[field.key]} />
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
                setDraft(draftFrom(npc))
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
                  <AlertDialogTitle>Delete {npc.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Their whole entry goes, secrets and all. There is no undo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11" disabled={working}>
                    Keep them
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
 * The campaign's NPCs, as the DM preps them (`dm-prep-suite/npc-roster`).
 *
 * A roster of people with two layers each: a public face the party will read
 * once the NPC is revealed, and a DM-only block that never leaves this screen.
 * Nothing on this screen is player-visible. The party's own screen
 * (`dm-run-suite/player-campaign-view`) lists NPCs whose `revealed_at` is set,
 * and reads a public-column selection that has no DM-only field on it — so the
 * "Hidden" badge is a statement about `revealed_at`, and the block below it is
 * never sent to a player either way.
 *
 * Adding is a closed form until it is asked for: a roster of a dozen people
 * read on a phone should not have a nine-field form permanently at the bottom
 * of it.
 */
export function NpcRoster({
  campaignId,
  npcs: initialNpcs,
}: {
  campaignId: string
  npcs: NpcForDm[]
}) {
  const [npcs, setNpcs] = useState<NpcForDm[]>(() => [...initialNpcs].sort(byName))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function create() {
    if (saving || !draft.name.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/npcs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(draft)),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'That NPC did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { npc: NpcForDm }
      setNpcs((current) => mergeNpc(current, payload.npc))
      setDraft(emptyDraft())
      setAdding(false)
      toast.success(`${payload.npc.name} is on the roster.`)
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">NPCs</CardTitle>
        <CardDescription>
          Everyone the party might meet. Each one has a face they will eventually see and a
          &ldquo;behind the screen&rdquo; half that stays yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {npcs.length > 0 ? (
          <ul className="space-y-3">
            {npcs.map((npc) => (
              <NpcRow
                key={npc.id}
                campaignId={campaignId}
                npc={npc}
                onChanged={(next) => setNpcs((current) => mergeNpc(current, next))}
                onDeleted={(id) => setNpcs((current) => current.filter((n) => n.id !== id))}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No NPCs yet. A name and one line is enough to start — the rest can wait until the week
            it matters.
          </p>
        )}

        <div className="space-y-2 border-t pt-4">
          {adding ? (
            <>
              <NpcEditor
                idPrefix="new-npc"
                draft={draft}
                saving={saving}
                submitLabel="Add NPC"
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
              Add an NPC
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
