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
import type { CampaignLocation } from '@/lib/db/schema'
import {
  LOCATION_FIELDS,
  LOCATION_PUBLIC_FIELDS,
  LOCATION_SECRET_FIELDS,
  MAX_LOCATION_NAME_LENGTH,
  type LocationField,
} from '@/lib/locations/schema'

import { FieldInput, ReadField, SecretLayer } from './prep-fields'
import { RevealSwitch } from './reveal-switch'

/** What the DM-only block says on a place — the same sentence in both views. */
const LOCATION_SECRET_BLURB =
  'Yours. None of this reaches a player, before or after you reveal the place.'

/** A field's value as the form holds it — `null` in the database is blank here. */
type Draft = Record<LocationField['key'], string> & { name: string }

/** Alphabetical, matching the data layer's ORDER BY so a save cannot reshuffle. */
function byName(a: CampaignLocation, b: CampaignLocation): number {
  const compared = a.name.localeCompare(b.name)
  if (compared !== 0) return compared
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

/** Replace `location` in the list, or add it if the server just created it. */
function merge(locations: CampaignLocation[], location: CampaignLocation): CampaignLocation[] {
  const known = locations.some((existing) => existing.id === location.id)
  const next = known
    ? locations.map((existing) => (existing.id === location.id ? location : existing))
    : [...locations, location]

  return next.sort(byName)
}

function draftFrom(location: CampaignLocation): Draft {
  const draft = { name: location.name } as Draft
  for (const field of LOCATION_FIELDS) draft[field.key] = location[field.key] ?? ''
  return draft
}

function emptyDraft(): Draft {
  const draft = { name: '' } as Draft
  for (const field of LOCATION_FIELDS) draft[field.key] = ''
  return draft
}

/** A draft as the API takes it: blank collapses to `null`, which clears a field. */
function payloadFrom(draft: Draft): Record<string, string | null> {
  const payload: Record<string, string | null> = { name: draft.name.trim() }
  for (const field of LOCATION_FIELDS) payload[field.key] = draft[field.key].trim() || null
  return payload
}

/**
 * The editor, used to add a place and to change one.
 *
 * Both layers, in the order the table declares them. The field lists come from
 * `@/lib/locations/schema`, so which side of the divider a field falls on is
 * decided by the module that also validates it — not by the order someone typed
 * the JSX in.
 */
function LocationEditor({
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
          maxLength={MAX_LOCATION_NAME_LENGTH}
          placeholder="What the party will call it"
          onChange={(event) => set('name', event.target.value)}
        />
      </div>

      {LOCATION_PUBLIC_FIELDS.map((field) => (
        <FieldInput
          key={field.key}
          id={`${idPrefix}-${field.key}`}
          field={field}
          value={draft[field.key]}
          disabled={saving}
          onChange={(value) => set(field.key, value)}
        />
      ))}

      <SecretLayer blurb={LOCATION_SECRET_BLURB}>
        {LOCATION_SECRET_FIELDS.map((field) => (
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
 * One place on the list: what the party will see, the DM-only block under its
 * marking, and the two things you do to prep you got wrong.
 *
 * The reveal state is shown and not settable, exactly as on the NPC roster —
 * the badge tells the truth about a column that already exists rather than
 * implying a switch that does not.
 */
function LocationRow({
  campaignId,
  location,
  onChanged,
  onDeleted,
}: {
  campaignId: string
  location: CampaignLocation
  onChanged: (location: CampaignLocation) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(location))
  const [working, setWorking] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const secrets = LOCATION_SECRET_FIELDS.filter((field) => location[field.key])

  async function save() {
    if (working || !draft.name.trim()) return

    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(draft)),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That change did not save. Try again.')
        return
      }

      const body = (await response.json()) as { location: CampaignLocation }
      onChanged(body.location)
      setDraft(draftFrom(body.location))
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
      const response = await fetch(`/api/campaigns/${campaignId}/locations/${location.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error(
          response.status === 404 ? 'That place is already gone.' : 'Could not delete that place.',
        )
        return
      }

      setConfirming(false)
      onDeleted(location.id)
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
          <h4 className="font-medium">{location.name}</h4>
          {location.summary ? (
            <p className="text-muted-foreground text-sm">{location.summary}</p>
          ) : null}
        </div>
        <Badge variant={location.revealedAt ? 'secondary' : 'outline'}>
          {location.revealedAt ? 'Revealed' : 'Hidden'}
        </Badge>
      </div>

      {editing ? (
        <LocationEditor
          idPrefix={`location-${location.id}`}
          draft={draft}
          saving={working}
          submitLabel="Save"
          onChange={setDraft}
          onSubmit={() => void save()}
          onCancel={() => {
            setDraft(draftFrom(location))
            setEditing(false)
          }}
        />
      ) : (
        <>
          {location.description ? (
            <p className="text-sm whitespace-pre-wrap">{location.description}</p>
          ) : null}

          {/* Above editing and deleting for the NPC roster's reason: this is
              the control the DM uses while the scene is happening. */}
          <RevealSwitch
            endpoint={`/api/campaigns/${campaignId}/locations/${location.id}/reveal`}
            revealedAt={location.revealedAt}
            noun="place"
            shows="its name, your one-line summary and the description"
            unwrap={(body) => (body as { location: CampaignLocation }).location}
            onChanged={onChanged}
          />

          {secrets.length > 0 ? (
            <SecretLayer blurb={LOCATION_SECRET_BLURB}>
              {secrets.map((field) => (
                <ReadField key={field.key} field={field} value={location[field.key]} />
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
                setDraft(draftFrom(location))
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
                  <AlertDialogTitle>Delete {location.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The whole entry goes, secrets and all. There is no undo.
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
 * The campaign's places, as the DM preps them
 * (`dm-prep-suite/locations-handouts`).
 *
 * The second revealable entity, and it looks like the first on purpose: a
 * public layer the party will read once the place is revealed, and a DM-only
 * block that never leaves this screen. The party's own screen
 * (`dm-run-suite/player-campaign-view`) lists places whose `revealed_at` is
 * set, through a public-column selection with no `secrets` on it — so the
 * "Hidden" badge is a statement about `revealed_at`, and the DM-only block is
 * never sent to a player either way.
 *
 * Adding is a closed form until it is asked for: a list of a dozen places read
 * on a phone should not have a five-field form permanently at the bottom of it.
 */
export function LocationRoster({
  campaignId,
  locations: initialLocations,
}: {
  campaignId: string
  locations: CampaignLocation[]
}) {
  const [locations, setLocations] = useState<CampaignLocation[]>(() =>
    [...initialLocations].sort(byName),
  )
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function create() {
    if (saving || !draft.name.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(draft)),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setError(payload?.error ?? 'That place did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { location: CampaignLocation }
      setLocations((current) => merge(current, payload.location))
      setDraft(emptyDraft())
      setAdding(false)
      toast.success(`${payload.location.name} is on the map.`)
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Places</CardTitle>
        <CardDescription>
          Everywhere the party might go. Each one has what they see on arrival and a &ldquo;behind
          the screen&rdquo; half that stays yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {locations.length > 0 ? (
          <ul className="space-y-3">
            {locations.map((location) => (
              <LocationRow
                key={location.id}
                campaignId={campaignId}
                location={location}
                onChanged={(next) => setLocations((current) => merge(current, next))}
                onDeleted={(id) => setLocations((current) => current.filter((l) => l.id !== id))}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            No places yet. A name and one line is enough to start — the rest can wait until the week
            they walk in.
          </p>
        )}

        <div className="space-y-2 border-t pt-4">
          {adding ? (
            <>
              <LocationEditor
                idPrefix="new-location"
                draft={draft}
                saving={saving}
                submitLabel="Add place"
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
              Add a place
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
