'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CampaignSessionPlan, SessionPlanItem } from '@/lib/db/schema'
import type { ResolvedSessionPlanLink, SessionPlanTargets } from '@/lib/db/session-plans'
import {
  MAX_SESSION_PLAN_TITLE_LENGTH,
  SESSION_PLAN_FIELDS,
  SESSION_PLAN_PUBLIC_FIELDS,
  SESSION_PLAN_SECRET_FIELDS,
  type SessionPlanField,
} from '@/lib/session-plans/schema'

import { FieldInput, ReadField, SecretLayer } from './prep-fields'
import { RevealSwitch } from './reveal-switch'
import { SessionPlanChecklist } from './session-plan-checklist'
import { SessionPlanLinks } from './session-plan-links'

// One night's prep, in the Lazy DM shape (`dm-prep-suite/session-plans`).
//
// Five sections, in the order the eight steps put them: the night itself, a
// strong start, the scenes that might happen, the secrets to drop, what there
// is to find, and the prep it all leans on. Two of those — the scenes and the
// secrets — are lists rather than prose, because they are ticked off during
// play rather than read.
//
// **The read view is the default and the whole page is thumb-sized.** A DM
// opens this with the session running: the prose is there to glance at, the
// lists are there to tap, and the editor is behind a button so a stray touch
// cannot land in the middle of the strong start.
//
// The DM-only marking is `SecretLayer`, the same component the NPC, place and
// handout screens use. A strong start is *heard* at the table, never read off
// the plan, so it sits behind that marking with the treasure — only the night's
// title and date are the public layer, and that is what the reveal switch
// announces (`first-table/announce-the-night`): the same `RevealSwitch` the
// NPC, place and handout screens carry, in the read view under the date it
// puts on the party's phones. Un-announcing is the same switch.

/** What the DM-only block says on a plan — the same sentence in both views. */
const PLAN_SECRET_BLURB =
  'Yours. Announcing the night tells the party when it is, and nothing that is written here.'

/** A field's value as the form holds it — `null` in the database is blank here. */
type Draft = Record<SessionPlanField['key'], string> & { title: string }

function draftFrom(plan: CampaignSessionPlan): Draft {
  const draft = { title: plan.title } as Draft
  for (const field of SESSION_PLAN_FIELDS) draft[field.key] = plan[field.key] ?? ''
  return draft
}

/** A draft as the API takes it: blank collapses to `null`, which clears a field. */
function payloadFrom(draft: Draft): Record<string, string | null> {
  const payload: Record<string, string | null> = { title: draft.title.trim() }
  for (const field of SESSION_PLAN_FIELDS) payload[field.key] = draft[field.key].trim() || null
  return payload
}

export function SessionPlanBoard({
  campaignId,
  plan: initialPlan,
  items: initialItems,
  links: initialLinks,
  targets,
  backHref,
}: {
  campaignId: string
  plan: CampaignSessionPlan
  /** Both kinds, already in the data layer's order — kind, then position. */
  items: SessionPlanItem[]
  links: ResolvedSessionPlanLink[]
  targets: SessionPlanTargets
  /** Where a deleted plan leaves you — its own list, which is a server page. */
  backHref: string
}) {
  const router = useRouter()
  const [plan, setPlan] = useState(initialPlan)
  const [items, setItems] = useState(initialItems)
  const [links, setLinks] = useState(initialLinks)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initialPlan))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Filtered rather than sorted: the data layer already returned them in order,
  // and re-sorting here would be a second opinion about it.
  const scenes = items.filter((item) => item.kind === 'scene')
  const secrets = items.filter((item) => item.kind === 'secret')

  const written = SESSION_PLAN_SECRET_FIELDS.filter((field) => plan[field.key])

  async function save() {
    if (saving || !draft.title.trim()) return

    setSaving(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(draft)),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That change did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { plan: CampaignSessionPlan }
      setPlan(payload.plan)
      setDraft(draftFrom(payload.plan))
      setEditing(false)
      toast.success('Saved.')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setSaving(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-plans/${plan.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error(
          response.status === 404 ? 'That plan is already gone.' : 'Could not delete that plan.',
        )
        return
      }

      setConfirming(false)
      // `refresh` as well as `push`: the list is server-rendered, so without it
      // the deleted plan is still on the page you land back on.
      router.push(backHref)
      router.refresh()
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-base">The night</CardTitle>
            <Badge variant={plan.revealedAt ? 'secondary' : 'outline'}>
              {plan.revealedAt ? 'Announced' : 'Not announced'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <form
              className="space-y-4"
              onSubmit={(event: FormEvent) => {
                event.preventDefault()
                void save()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="plan-title">Title</Label>
                <Input
                  id="plan-title"
                  value={draft.title}
                  disabled={saving}
                  maxLength={MAX_SESSION_PLAN_TITLE_LENGTH}
                  className="h-11"
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </div>

              {SESSION_PLAN_PUBLIC_FIELDS.map((field) => (
                <FieldInput
                  key={field.key}
                  id={`plan-${field.key}`}
                  field={field}
                  value={draft[field.key]}
                  disabled={saving}
                  onChange={(value) => setDraft({ ...draft, [field.key]: value })}
                />
              ))}

              <SecretLayer blurb={PLAN_SECRET_BLURB}>
                {SESSION_PLAN_SECRET_FIELDS.map((field) => (
                  <FieldInput
                    key={field.key}
                    id={`plan-${field.key}`}
                    field={field}
                    value={draft[field.key]}
                    disabled={saving}
                    onChange={(value) => setDraft({ ...draft, [field.key]: value })}
                  />
                ))}
              </SecretLayer>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="h-11" disabled={saving || !draft.title.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={saving}
                  onClick={() => {
                    setDraft(draftFrom(plan))
                    setEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              {SESSION_PLAN_PUBLIC_FIELDS.map((field) => (
                <ReadField key={field.key} field={field} value={plan[field.key]} />
              ))}

              {written.length > 0 ? (
                <SecretLayer blurb={PLAN_SECRET_BLURB}>
                  {written.map((field) => (
                    <ReadField key={field.key} field={field} value={plan[field.key]} />
                  ))}
                </SecretLayer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No strong start yet. One paragraph — where they are as it opens, and what is
                  already wrong.
                </p>
              )}

              {/* Announcing puts the title and the date at the top of the
                  party's campaign page and on their sheets — and only those:
                  the player-facing read selects the public columns and nothing
                  behind the screen (`first-table/announce-the-night`). */}
              <RevealSwitch
                endpoint={`/api/campaigns/${campaignId}/session-plans/${plan.id}/reveal`}
                revealedAt={plan.revealedAt}
                noun="night"
                shows="the title and the date — nothing that is written here"
                unwrap={(body) => (body as { plan: CampaignSessionPlan }).plan}
                onChanged={setPlan}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={saving}
                  onClick={() => {
                    setDraft(draftFrom(plan))
                    setEditing(true)
                  }}
                >
                  Edit
                </Button>

                <AlertDialog
                  open={confirming}
                  onOpenChange={(next) => {
                    if (saving) return
                    setConfirming(next)
                  }}
                >
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" className="h-11" disabled={saving}>
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {plan.title}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The scenes, the secrets and the links go with it. What they point at stays.
                        There is no undo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="h-11" disabled={saving}>
                        Keep it
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-11"
                        disabled={saving}
                        onClick={(event) => {
                          event.preventDefault()
                          void remove()
                        }}
                      >
                        {saving ? 'Deleting…' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <SessionPlanChecklist
            campaignId={campaignId}
            planId={plan.id}
            kind="scene"
            heading="Potential scenes"
            blurb="Three to five things that might happen. Tick one off when it does."
            addLabel="Add a scene"
            placeholder="A scene that might happen"
            empty="No scenes yet. Three to five is plenty — they are possibilities, not a running order."
            items={scenes}
            onItemsChange={(updater) => setItems((current) => updater(current))}
          />

          <SessionPlanChecklist
            campaignId={campaignId}
            planId={plan.id}
            kind="secret"
            heading="Secrets & clues"
            blurb="About ten one-liners. Tick one off the moment you drop it."
            addLabel="Add a secret or clue"
            placeholder="One thing they could learn tonight"
            empty="No secrets yet. Ten one-sentence facts the party could learn, in any order, anywhere."
            items={secrets}
            onItemsChange={(updater) => setItems((current) => updater(current))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <SessionPlanLinks
            campaignId={campaignId}
            planId={plan.id}
            links={links}
            targets={targets}
            onLinksChange={setLinks}
          />
        </CardContent>
      </Card>
    </div>
  )
}
