'use client'

import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type {
  ResolvedSessionPlanLink,
  SessionPlanLink,
  SessionPlanTargets,
} from '@/lib/db/session-plans'
import type { SessionPlanLinkKind } from '@/lib/db/schema'

// One of the three link steps of a night's prep — the fantastic locations, the
// important NPCs, or the monsters (`dm-chronology/eight-steps-plan`).
//
// A plan points at prep that already exists rather than restating it: the NPC
// who turns up, the place they may reach, the fight that may start. Each link
// is a tap through to the thing itself, so mid-session "who was the
// harbourmaster again" is one tap and a back button.
//
// **One kind per instance**, which is the change the eight steps made. This
// used to be a single "Tonight touches" block with three picker buttons across
// the top, because the plan screen was five sections and the three kinds shared
// one of them. The book names them as three separate steps, so the screen does
// too, and each one opens its own sheet holding exactly this component — the
// picker is already open when the sheet is, because the reason a DM tapped
// "Important NPCs" is to add one.
//
// **The picker is a list of buttons, not a dropdown.** A native or Radix select
// on a phone is a small target that opens a smaller one; a DM linking four
// things at prep time and one more mid-session is better served by full-width
// rows. Already-linked things are absent from the list rather than greyed out —
// there is nothing to learn from a row you cannot press.

/** The three kinds, with the words and the destination for each. */
const KINDS: Record<
  SessionPlanLinkKind,
  {
    /** What one of them is, in a sentence — "Unlink this place". */
    noun: string
    /** The pool this kind picks from, on the campaign's prep. */
    pool: (targets: SessionPlanTargets) => { id: string; name: string }[]
    href: (campaignId: string, targetId: string) => string
    /** What the picker says when the campaign has nothing of this kind. */
    barren: string
    /** What it says when everything of this kind is already on the night. */
    exhausted: string
  }
> = {
  npc: {
    noun: 'person',
    pool: (targets) => targets.npcs,
    href: (campaignId) => `/dm/campaigns/${campaignId}/npcs`,
    barren: 'No NPCs written yet. Write one, then bring them to the night.',
    exhausted: 'Everybody you have written is already on the night.',
  },
  location: {
    noun: 'place',
    pool: (targets) => targets.locations,
    href: (campaignId) => `/dm/campaigns/${campaignId}/locations`,
    barren: 'No places written yet. Write one, then point the night at it.',
    exhausted: 'Every place you have written is already on the night.',
  },
  encounter: {
    noun: 'fight',
    pool: (targets) => targets.encounters,
    href: (_campaignId, targetId) => `/dm/encounters/${targetId}`,
    barren: 'No fights built yet.',
    exhausted: 'Every fight you have built is already on the night.',
  },
}

export function SessionPlanLinks({
  campaignId,
  planId,
  kind,
  links,
  targets,
  onLinksChange,
  footer,
}: {
  campaignId: string
  planId: string
  /** Which step this is. One instance renders one kind and nothing else. */
  kind: SessionPlanLinkKind
  /** **Every** link on the plan — the callback hands back the whole set. */
  links: ResolvedSessionPlanLink[]
  targets: SessionPlanTargets
  onLinksChange: (links: ResolvedSessionPlanLink[]) => void
  /** Anything that belongs under the picker — the way to build a fight. */
  footer?: ReactNode
}) {
  const [busy, setBusy] = useState(false)

  const base = `/api/campaigns/${campaignId}/session-plans/${planId}/links`
  const entry = KINDS[kind]

  const mine = links.filter((link) => link.kind === kind)
  const linked = new Set(links.map((link) => link.targetId))
  const pool = entry.pool(targets)
  const available = pool.filter((target) => !linked.has(target.id))

  async function add(target: { id: string; name: string }) {
    if (busy) return

    setBusy(true)

    try {
      const response = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, targetId: target.id }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That did not link. Try again.')
        return
      }

      const payload = (await response.json()) as { link: SessionPlanLink }
      onLinksChange([
        ...links,
        { id: payload.link.id, kind, targetId: target.id, label: target.name },
      ])
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(link: ResolvedSessionPlanLink) {
    if (busy) return

    setBusy(true)

    try {
      const response = await fetch(`${base}/${link.id}`, { method: 'DELETE' })

      if (!response.ok) {
        toast.error('Could not unlink that.')
        return
      }

      onLinksChange(links.filter((one) => one.id !== link.id))
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {mine.length > 0 ? (
        <ul className="space-y-2">
          {mine.map((link) => (
            <li key={link.id} className="flex items-center gap-2">
              <Link
                href={entry.href(campaignId, link.targetId)}
                className="hover:bg-accent flex min-h-11 flex-1 items-center rounded-md border p-3"
              >
                <span className="min-w-0 truncate text-sm">{link.label}</span>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="text-destructive size-11 shrink-0"
                aria-label={`Unlink ${link.label}`}
                disabled={busy}
                onClick={() => void remove(link)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {mine.length > 0 ? `Add another ${entry.noun}` : `Add a ${entry.noun}`}
        </h4>

        {available.length > 0 ? (
          <ul className="space-y-2">
            {available.map((target) => (
              <li key={target.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-start"
                  disabled={busy}
                  onClick={() => void add(target)}
                >
                  {target.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {pool.length === 0 ? entry.barren : entry.exhausted}
          </p>
        )}
      </div>

      {footer}
    </div>
  )
}
