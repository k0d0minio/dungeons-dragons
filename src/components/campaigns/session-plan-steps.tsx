'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
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
import {
  INSET_ROW_CLASS,
  InsetGroup,
  InsetRowBody,
  InsetRowChevron,
} from '@/components/dm/inset-list'
import { ProgressRail } from '@/components/dm/progress-rail'
import type { CampaignSessionPlan, SessionPlanItem } from '@/lib/db/schema'
import type { ResolvedSessionPlanLink, SessionPlanTargets } from '@/lib/db/session-plans'
import { formatSessionDate } from '@/lib/notes/schema'
import {
  planReadiness,
  stillToDo,
  type PartyCount,
  type PlanStep,
  type PlanStepKey,
} from '@/lib/session-plans/readiness'
import {
  MAX_SESSION_PLAN_TITLE_LENGTH,
  SESSION_PLAN_FIELDS,
  type SessionPlanField,
} from '@/lib/session-plans/schema'
import { cn } from '@/lib/utils'

import { FieldInput, SecretLayer } from './prep-fields'
import { RevealSwitch } from './reveal-switch'
import { SessionPlanChecklist } from './session-plan-checklist'
import { SessionPlanLinks } from './session-plan-links'

// One night's prep, as the Lazy DM's eight steps
// (`dm-chronology/eight-steps-plan`).
//
// This screen was five sections and two checklists stacked on one page: every
// field the plan has, open at once, in an order a DM had to already know. It is
// now a numbered rail of the eight steps the book teaches, in the book's order,
// each row saying where that step stands — so a DM who has never prepped a
// session is told what to write and in what order, by the book he is learning
// from, rather than being handed a form.
//
// **No entity is new.** Every step maps onto something the plan already
// stores: the two prose columns, the two kinds of checkable line, the three
// kinds of link, and — for the book's first step — the party the night is for.
// `planReadiness` is the one place that mapping is written, and the Prep tab's
// hero draws its rail from the same call.
//
// **One tap in, and one step at a time.** Tapping a row opens that step's
// editor in a bottom sheet: the field editor, the checklist, or the picker,
// each the component that already existed and none of them changed. The rest
// of the screen stays where it was, which is what a DM prepping on a Tuesday
// evening in ten-minute pieces actually needs — and Radix unmounts a closed
// sheet, so seven editors cost nothing until one is asked for.

/** What the DM-only block says on a plan — the same sentence it always said. */
const PLAN_SECRET_BLURB =
  'Yours. Announcing the night tells the party when it is, and nothing that is written here.'

/** The rule the footer says in words, because it is the one thing this screen is not. */
const PLAY_FOOTER =
  'On the night, Play shows this plan’s strong start, scenes and secrets, and you tick them there.'

/** What each step's sheet is for, in a sentence a screen reader also hears. */
const STEP_BLURBS: Record<PlanStepKey, string> = {
  characters: 'Who is at the table, and whether their sheets are ready for a session.',
  strongStart: 'One paragraph: where they are as the session opens, and what is already wrong.',
  scenes: 'Three to five things that might happen. Tick one off when it does.',
  secrets: 'About ten one-sentence facts they could learn tonight, in any order, anywhere.',
  locations: 'The places tonight may reach. Point the night at ones you have already written.',
  npcs: 'The people who may turn up. Point the night at ones you have already written.',
  monsters: 'The fights that may start. Build one, and it comes back to the night linked.',
  treasure: 'What there is to find tonight, and roughly what it is worth.',
}

/** A field by key, from the one list that decides which fields a plan has. */
function fieldFor(key: SessionPlanField['key']): SessionPlanField {
  const field = SESSION_PLAN_FIELDS.find((one) => one.key === key)
  if (!field) throw new Error(`No session plan field ${key}`)
  return field
}

/**
 * The inside of a step row: its number, its heading, and how it stands.
 *
 * **A step with nothing in it prints its heading in the primary colour** — it
 * is the next thing to do, and on a numbered rail that is the whole point of
 * the rail. The status line under it says the same thing in words ("Empty",
 * "None linked"), because a colour a DM cannot see at a dim table is not a
 * signal.
 */
function StepRowBody({ number, step }: { number: number; step: PlanStep }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className={cn('block font-medium', step.ready ? undefined : 'text-primary')}>
          {number}. {step.heading}
        </span>
        <span className="text-muted-foreground block text-xs">{step.status}</span>
      </span>
      <InsetRowChevron />
    </>
  )
}

/**
 * The bottom sheet a step's editor arrives in.
 *
 * The geometry is `PlanNightSheet`'s, plus a scroll: a night with ten secrets
 * on it is taller than a phone, and the sheet is where they are added.
 */
function StepSheet({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string
  description: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        // The sheet's own close button is enlarged to a 44 px target
        // (NFR-002), as every other sheet in the app does it.
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl p-0 sm:mx-auto sm:max-w-2xl [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4 pb-10">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * One prose step — the strong start, or the treasure — on its own.
 *
 * Both are the DM-only layer, so both keep `SecretLayer`'s marking inside the
 * sheet: the field a DM edits with players either side of him is marked there,
 * not only on a read view he has scrolled past.
 */
function PlanFieldForm({
  campaignId,
  plan,
  field,
  onSaved,
}: {
  campaignId: string
  plan: CampaignSessionPlan
  field: SessionPlanField
  onSaved: (plan: CampaignSessionPlan) => void
}) {
  const [value, setValue] = useState(plan[field.key] ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return

    setSaving(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Blank collapses to `null`, which is how a field is cleared.
        body: JSON.stringify({ [field.key]: value.trim() || null }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That change did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { plan: CampaignSessionPlan }
      onSaved(payload.plan)
      toast.success('Saved.')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        void save()
      }}
    >
      <SecretLayer blurb={PLAN_SECRET_BLURB}>
        <FieldInput
          id={`plan-${field.key}`}
          field={field}
          value={value}
          disabled={saving}
          onChange={setValue}
        />
      </SecretLayer>

      <Button type="submit" className="h-11 w-full" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}

/** The night's own identity — what it is called, and which evening it is. */
function PlanNightForm({
  campaignId,
  plan,
  onSaved,
}: {
  campaignId: string
  plan: CampaignSessionPlan
  onSaved: (plan: CampaignSessionPlan) => void
}) {
  const [title, setTitle] = useState(plan.title)
  const [sessionDate, setSessionDate] = useState(plan.sessionDate ?? '')
  const [saving, setSaving] = useState(false)

  const dateField = fieldFor('sessionDate')

  async function save() {
    if (saving || !title.trim()) return

    setSaving(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), sessionDate: sessionDate.trim() || null }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That change did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { plan: CampaignSessionPlan }
      onSaved(payload.plan)
      toast.success('Saved.')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
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
          value={title}
          disabled={saving}
          maxLength={MAX_SESSION_PLAN_TITLE_LENGTH}
          className="h-11"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <FieldInput
        id="plan-sessionDate"
        field={dateField}
        value={sessionDate}
        disabled={saving}
        onChange={setSessionDate}
      />

      <Button type="submit" className="h-11 w-full" disabled={saving || !title.trim()}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}

export function SessionPlanSteps({
  campaignId,
  plan: initialPlan,
  items: initialItems,
  links: initialLinks,
  targets,
  party,
  backHref,
}: {
  campaignId: string
  plan: CampaignSessionPlan
  /** Both kinds, already in the data layer's order — kind, then position. */
  items: SessionPlanItem[]
  links: ResolvedSessionPlanLink[]
  targets: SessionPlanTargets
  /** The campaign's party, for the book's first step. */
  party: PartyCount
  /** Where a deleted plan leaves you — its own list, which is a server page. */
  backHref: string
}) {
  const router = useRouter()
  const [plan, setPlan] = useState(initialPlan)
  const [items, setItems] = useState(initialItems)
  const [links, setLinks] = useState(initialLinks)
  // One open sheet at a time, keyed by the row that opened it: eight pieces of
  // boolean state would be eight chances for two sheets to think they are open.
  const [open, setOpen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const readiness = planReadiness({ plan, items, links }, party)
  const left = stillToDo(readiness)

  // Filtered rather than sorted: the data layer already returned them in order,
  // and re-sorting here would be a second opinion about it.
  const scenes = items.filter((item) => item.kind === 'scene')
  const secrets = items.filter((item) => item.kind === 'secret')

  function sheet(key: string) {
    return { open: open === key, onOpenChange: (next: boolean) => setOpen(next ? key : null) }
  }

  /** The editor behind one step's row — the component that already existed. */
  function editorFor(key: PlanStepKey): ReactNode {
    switch (key) {
      case 'strongStart':
      case 'treasure':
        return (
          <PlanFieldForm
            campaignId={campaignId}
            plan={plan}
            field={fieldFor(key)}
            onSaved={(saved) => {
              setPlan(saved)
              setOpen(null)
            }}
          />
        )
      case 'scenes':
        return (
          <SessionPlanChecklist
            campaignId={campaignId}
            planId={plan.id}
            kind="scene"
            heading="Potential scenes"
            blurb={STEP_BLURBS.scenes}
            addLabel="Add a scene"
            placeholder="A scene that might happen"
            empty="No scenes yet. Three to five is plenty — they are possibilities, not a running order."
            items={scenes}
            onItemsChange={(updater) => setItems((current) => updater(current))}
          />
        )
      case 'secrets':
        return (
          <SessionPlanChecklist
            campaignId={campaignId}
            planId={plan.id}
            kind="secret"
            heading="Secrets & clues"
            blurb={STEP_BLURBS.secrets}
            addLabel="Add a secret or clue"
            placeholder="One thing they could learn tonight"
            empty="No secrets yet. Ten one-sentence facts the party could learn, in any order, anywhere."
            items={secrets}
            onItemsChange={(updater) => setItems((current) => updater(current))}
          />
        )
      case 'locations':
      case 'npcs':
      case 'monsters':
        return (
          <SessionPlanLinks
            campaignId={campaignId}
            planId={plan.id}
            kind={key === 'locations' ? 'location' : key === 'npcs' ? 'npc' : 'encounter'}
            links={links}
            targets={targets}
            onLinksChange={setLinks}
            footer={
              key === 'monsters' ? (
                // The builder carries the plan, so the fight it makes comes
                // back linked to this night rather than to nothing
                // (`session_plan_links`, no new column).
                <Link
                  href={`/dm/campaigns/${campaignId}/encounters/new?plan=${plan.id}`}
                  className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
                >
                  Build a fight for this night
                </Link>
              ) : null
            }
          />
        )
      // The characters are the party's, not the plan's: that row is a door to
      // the party rather than an editor, and never reaches this switch.
      case 'characters':
        return null
    }
  }

  async function remove() {
    setDeleting(true)

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
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card space-y-2 rounded-xl border p-4">
        <ProgressRail readiness={readiness} />
        <p className="text-sm">
          <span className="font-medium">
            {readiness.ready} of {readiness.total} steps ready
          </span>
          <span className="text-muted-foreground">
            {left ? ` · still to do: ${left}` : ' · ready to run'}
          </span>
        </p>
      </div>

      <InsetGroup label="One night’s prep" footer={PLAY_FOOTER}>
        {readiness.steps.map((step, index) => {
          const number = index + 1

          if (step.key === 'characters') {
            return (
              <li key={step.key}>
                <Link
                  href={`/dm/campaigns/${campaignId}/party`}
                  className={cn(INSET_ROW_CLASS, 'hover:bg-accent')}
                >
                  <StepRowBody number={number} step={step} />
                </Link>
              </li>
            )
          }

          return (
            <li key={step.key}>
              <button
                type="button"
                className={cn(INSET_ROW_CLASS, 'hover:bg-accent')}
                onClick={() => setOpen(step.key)}
              >
                <StepRowBody number={number} step={step} />
              </button>

              <StepSheet
                title={`${number}. ${step.heading}`}
                description={STEP_BLURBS[step.key]}
                {...sheet(step.key)}
              >
                {editorFor(step.key)}
              </StepSheet>
            </li>
          )
        })}
      </InsetGroup>

      <InsetGroup label="The night itself">
        <li>
          <button
            type="button"
            className={cn(INSET_ROW_CLASS, 'hover:bg-accent')}
            onClick={() => setOpen('night')}
          >
            <InsetRowBody
              label="Title and date"
              value={plan.sessionDate ? formatSessionDate(plan.sessionDate) : 'No date yet'}
            />
            <InsetRowChevron />
          </button>

          <StepSheet
            title="Title and date"
            description="What you call the night, and which evening it is."
            {...sheet('night')}
          >
            <PlanNightForm
              campaignId={campaignId}
              plan={plan}
              onSaved={(saved) => {
                setPlan(saved)
                setOpen(null)
              }}
            />
          </StepSheet>
        </li>

        <li>
          <button
            type="button"
            className={cn(INSET_ROW_CLASS, 'hover:bg-accent')}
            onClick={() => setOpen('announce')}
          >
            <InsetRowBody
              label="Announce the night"
              value={plan.revealedAt ? 'Announced' : 'Not announced'}
            />
            <InsetRowChevron />
          </button>

          {/* Announcing is unchanged (`dm-run-suite/reveal-controls`): the same
              switch, over the same public layer — the title and the date, and
              nothing that is written behind the screen. It is a value row now
              rather than a control halfway down a card, which is the only
              thing about it this stub touches. */}
          <StepSheet
            title="Announce the night"
            description="Put the title and the date on your players’ phones."
            {...sheet('announce')}
          >
            <RevealSwitch
              endpoint={`/api/campaigns/${campaignId}/session-plans/${plan.id}/reveal`}
              revealedAt={plan.revealedAt}
              noun="night"
              shows="the title and the date — nothing that is written here"
              unwrap={(body) => (body as { plan: CampaignSessionPlan }).plan}
              onChanged={setPlan}
            />
          </StepSheet>
        </li>

        <li>
          <AlertDialog
            open={confirming}
            onOpenChange={(next) => {
              if (deleting) return
              setConfirming(next)
            }}
          >
            <AlertDialogTrigger
              className={cn(INSET_ROW_CLASS, 'hover:bg-accent text-destructive')}
              disabled={deleting}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">Delete this night</span>
                <span className="text-muted-foreground block text-xs">
                  The scenes, the secrets and the links go with it.
                </span>
              </span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {plan.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The scenes, the secrets and the links go with it. What they point at stays. There
                  is no undo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11" disabled={deleting}>
                  Keep it
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-11"
                  disabled={deleting}
                  onClick={(event) => {
                    event.preventDefault()
                    void remove()
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </li>
      </InsetGroup>
    </div>
  )
}
