'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  ResolvedSessionPlanLink,
  SessionPlanLink,
  SessionPlanTargets,
} from '@/lib/db/session-plans'
import type { SessionPlanLinkKind } from '@/lib/db/schema'

// What tonight touches (`dm-prep-suite/session-plans`).
//
// A plan points at prep that already exists rather than restating it: the NPC
// who turns up, the place they may reach, the fight that may start. Each link
// is a tap through to the thing itself, so mid-session "who was the
// harbourmaster again" is one tap and a back button.
//
// **The picker is a list of buttons, not a dropdown.** A native or Radix select
// on a phone is a small target that opens a smaller one; a DM linking four
// things at prep time and one more mid-session is better served by full-width
// rows. Already-linked things are absent from the list rather than greyed out —
// there is nothing to learn from a row you cannot press.

/** The three kinds, with the words and the destination for each. */
const KINDS: {
  kind: SessionPlanLinkKind
  label: string
  plural: string
  href: (campaignId: string, targetId: string) => string
}[] = [
  {
    kind: 'npc',
    label: 'NPC',
    plural: 'NPCs',
    href: (campaignId) => `/dm/campaigns/${campaignId}/npcs`,
  },
  {
    kind: 'location',
    label: 'Place',
    plural: 'Places',
    href: (campaignId) => `/dm/campaigns/${campaignId}/locations`,
  },
  {
    kind: 'encounter',
    label: 'Encounter',
    plural: 'Encounters',
    href: (_campaignId, targetId) => `/dm/encounters/${targetId}`,
  },
]

export function SessionPlanLinks({
  campaignId,
  planId,
  links,
  targets,
  onLinksChange,
}: {
  campaignId: string
  planId: string
  links: ResolvedSessionPlanLink[]
  targets: SessionPlanTargets
  onLinksChange: (links: ResolvedSessionPlanLink[]) => void
}) {
  const [picking, setPicking] = useState<SessionPlanLinkKind | null>(null)
  const [busy, setBusy] = useState(false)

  const base = `/api/campaigns/${campaignId}/session-plans/${planId}/links`
  const linked = new Set(links.map((link) => link.targetId))

  /** The campaign's things of one kind that this plan has not linked yet. */
  function available(kind: SessionPlanLinkKind) {
    const pool =
      kind === 'npc' ? targets.npcs : kind === 'location' ? targets.locations : targets.encounters

    return pool.filter((target) => !linked.has(target.id))
  }

  async function add(kind: SessionPlanLinkKind, target: { id: string; name: string }) {
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
      setPicking(null)
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
    <section className="space-y-3">
      <div>
        <h4 className="font-medium">Tonight touches</h4>
        <p className="text-muted-foreground text-xs">
          The prep this session leans on. Tap through to any of it mid-session.
        </p>
      </div>

      {links.length > 0 ? (
        <ul className="space-y-2">
          {links.map((link) => {
            const kind = KINDS.find((one) => one.kind === link.kind)

            return (
              <li key={link.id} className="flex items-center gap-2">
                <Link
                  href={kind ? kind.href(campaignId, link.targetId) : '#'}
                  className="hover:bg-accent flex min-h-11 flex-1 items-center gap-2 rounded-md border p-3"
                >
                  <Badge variant="outline" className="shrink-0">
                    {kind?.label ?? link.kind}
                  </Badge>
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
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nothing linked yet. Point the night at the people, places and fights you already wrote
          down.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {KINDS.map((entry) => (
          <Button
            key={entry.kind}
            type="button"
            variant="outline"
            className="h-11"
            aria-pressed={picking === entry.kind}
            disabled={busy}
            onClick={() => setPicking((current) => (current === entry.kind ? null : entry.kind))}
          >
            {entry.plural}
          </Button>
        ))}
      </div>

      {picking ? (
        <ul className="space-y-2 rounded-md border p-2">
          {available(picking).length > 0 ? (
            available(picking).map((target) => (
              <li key={target.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full justify-start"
                  disabled={busy}
                  onClick={() => void add(picking, target)}
                >
                  {target.name}
                </Button>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground p-2 text-sm">
              Nothing left to link here. Everything you have prepped of this kind is already on the
              night.
            </li>
          )}
        </ul>
      ) : null}
    </section>
  )
}
