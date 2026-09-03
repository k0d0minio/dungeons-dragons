'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SessionPlanItem, SessionPlanItemKind } from '@/lib/db/schema'
import { MAX_SESSION_PLAN_ITEM_LENGTH } from '@/lib/session-plans/schema'

// A plan's scenes or its secrets, as a list you tick off with one thumb
// (`dm-prep-suite/session-plans`).
//
// One component for both kinds, because a scene and a secret are the same
// thing on screen — a line, an order, and whether it has happened — and the
// only differences are the words around them. `kind` picks the list; the copy
// arrives as props.
//
// **The mid-session shape is the default one.** Reading mode gives each line a
// single full-width button and nothing else: no arrows to nudge, no delete to
// hit by mistake, one tap anywhere on the row ticks it. Arranging and rewording
// live behind a mode toggle, because a DM doing either is prepping, and a DM
// ticking a secret off has a table waiting.
//
// Ticks are optimistic. A tap has to land instantly on a phone with a table
// watching, so the row flips first and the request follows; a failure puts it
// back and says so, which is the honest order for a thing that is almost always
// going to succeed.

/** How high a row has to be before a thumb hits it and not its neighbour. */
const ROW_HEIGHT = 'min-h-14'

function moved<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list

  const next = [...list]
  const [lifted] = next.splice(from, 1)
  next.splice(to, 0, lifted)
  return next
}

/** One line in reading mode: the whole row is the tick. */
function TickableRow({
  item,
  busy,
  onToggle,
}: {
  item: SessionPlanItem
  busy: boolean
  onToggle: () => void
}) {
  const checked = item.checkedAt !== null

  return (
    <li>
      <button
        type="button"
        // `aria-pressed` rather than a checkbox role: the row is a toggle, and
        // a screen reader should hear the line, not "checkbox, unchecked, line".
        aria-pressed={checked}
        disabled={busy}
        onClick={onToggle}
        className={`hover:bg-accent flex w-full items-center gap-3 rounded-md border p-3 text-left ${ROW_HEIGHT} ${
          checked ? 'text-muted-foreground' : ''
        }`}
      >
        <span
          aria-hidden
          className={`flex size-7 shrink-0 items-center justify-center rounded-md border ${
            checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
          }`}
        >
          {checked ? <Check className="size-4" /> : null}
        </span>
        <span className={`min-w-0 text-sm ${checked ? 'line-through' : ''}`}>{item.body}</span>
      </button>
    </li>
  )
}

/** One line in arranging mode: reword it, move it, or throw it away. */
function ArrangeableRow({
  item,
  busy,
  first,
  last,
  onReword,
  onMove,
  onDelete,
}: {
  item: SessionPlanItem
  busy: boolean
  first: boolean
  last: boolean
  onReword: (body: string) => void
  onMove: (offset: number) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(item.body)

  return (
    <li className="flex items-center gap-2 rounded-md border p-2">
      <Input
        aria-label="Line"
        value={draft}
        disabled={busy}
        maxLength={MAX_SESSION_PLAN_ITEM_LENGTH}
        className="h-11"
        onChange={(event) => setDraft(event.target.value)}
        // Saved on blur rather than behind a per-row Save button: a list of ten
        // lines with ten Save buttons is a list nobody edits.
        onBlur={() => {
          const trimmed = draft.trim()
          if (trimmed && trimmed !== item.body) onReword(trimmed)
          else setDraft(item.body)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0"
        aria-label="Move up"
        disabled={busy || first}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0"
        aria-label="Move down"
        disabled={busy || last}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="text-destructive size-11 shrink-0"
        aria-label={`Delete ${item.body}`}
        disabled={busy}
        onClick={onDelete}
      >
        <X className="size-4" />
      </Button>
    </li>
  )
}

export function SessionPlanChecklist({
  campaignId,
  planId,
  kind,
  heading,
  blurb,
  addLabel,
  placeholder,
  empty,
  items,
  onItemsChange,
}: {
  campaignId: string
  planId: string
  kind: SessionPlanItemKind
  heading: string
  blurb: string
  addLabel: string
  placeholder: string
  empty: string
  /** This kind's lines only, already in order. */
  items: SessionPlanItem[]
  onItemsChange: (updater: (all: SessionPlanItem[]) => SessionPlanItem[]) => void
}) {
  const [arranging, setArranging] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const base = `/api/campaigns/${campaignId}/session-plans/${planId}/items`
  const ticked = items.filter((item) => item.checkedAt !== null).length

  async function toggle(item: SessionPlanItem) {
    const checked = item.checkedAt === null

    // Optimistic: the row flips now, the request follows. `new Date()` is a
    // placeholder for the server's stamp, which arrives with the response.
    const optimistic = { ...item, checkedAt: checked ? new Date() : null }
    onItemsChange((all) => all.map((one) => (one.id === item.id ? optimistic : one)))

    try {
      const response = await fetch(`${base}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      })

      if (!response.ok) {
        onItemsChange((all) => all.map((one) => (one.id === item.id ? item : one)))
        toast.error('That did not save. Tap it again.')
        return
      }

      const payload = (await response.json()) as { item: SessionPlanItem }
      onItemsChange((all) => all.map((one) => (one.id === item.id ? payload.item : one)))
    } catch {
      onItemsChange((all) => all.map((one) => (one.id === item.id ? item : one)))
      toast.error('That did not send. Check your connection.')
    }
  }

  async function add() {
    const body = draft.trim()
    if (busy || !body) return

    setBusy(true)

    try {
      const response = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, body }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That line did not save. Try again.')
        return
      }

      const payload = (await response.json()) as { item: SessionPlanItem }
      onItemsChange((all) => [...all, payload.item])
      setDraft('')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function reword(item: SessionPlanItem, body: string) {
    setBusy(true)

    try {
      const response = await fetch(`${base}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })

      if (!response.ok) {
        toast.error('That change did not save.')
        return
      }

      const payload = (await response.json()) as { item: SessionPlanItem }
      onItemsChange((all) => all.map((one) => (one.id === item.id ? payload.item : one)))
    } catch {
      toast.error('That did not send. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: SessionPlanItem) {
    setBusy(true)

    try {
      const response = await fetch(`${base}/${item.id}`, { method: 'DELETE' })

      if (!response.ok) {
        toast.error('Could not delete that line.')
        return
      }

      onItemsChange((all) => all.filter((one) => one.id !== item.id))
    } catch {
      toast.error('That did not send. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  async function move(index: number, offset: number) {
    const reordered = moved(items, index, index + offset)
    if (reordered === items) return

    const ids = reordered.map((item) => item.id)

    setBusy(true)
    // Optimistic here too: an arrow that waits on a round trip before the row
    // moves gets pressed twice.
    onItemsChange((all) => withOrder(all, reordered))

    try {
      const response = await fetch(base, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, ids }),
      })

      if (!response.ok) {
        onItemsChange((all) => withOrder(all, items))
        toast.error('That order did not save.')
        return
      }

      const payload = (await response.json()) as { items: SessionPlanItem[] }
      onItemsChange((all) => withOrder(all, sortByOrder(payload.items)))
    } catch {
      onItemsChange((all) => withOrder(all, items))
      toast.error('That did not send. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-medium">{heading}</h4>
          <p className="text-muted-foreground text-xs">{blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {ticked}/{items.length}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            aria-pressed={arranging}
            onClick={() => setArranging((current) => !current)}
          >
            {arranging ? 'Done' : 'Arrange'}
          </Button>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) =>
            arranging ? (
              <ArrangeableRow
                // Keyed by body as well as id so a reword re-seeds the row's
                // own draft state after a save from somewhere else.
                key={`${item.id}-${item.body}`}
                item={item}
                busy={busy}
                first={index === 0}
                last={index === items.length - 1}
                onReword={(body) => void reword(item, body)}
                onMove={(offset) => void move(index, offset)}
                onDelete={() => void remove(item)}
              />
            ) : (
              <TickableRow
                key={item.id}
                item={item}
                busy={busy}
                onToggle={() => void toggle(item)}
              />
            ),
          )}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{empty}</p>
      )}

      <div className="flex gap-2">
        <Input
          aria-label={addLabel}
          value={draft}
          disabled={busy}
          placeholder={placeholder}
          maxLength={MAX_SESSION_PLAN_ITEM_LENGTH}
          className="h-11"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void add()
          }}
        />
        <Button
          type="button"
          className="h-11 shrink-0"
          disabled={busy || !draft.trim()}
          onClick={() => void add()}
        >
          Add
        </Button>
      </div>
    </section>
  )
}

/** This kind's rows in `ordered`, every other kind's row left where it was. */
function withOrder(all: SessionPlanItem[], ordered: SessionPlanItem[]): SessionPlanItem[] {
  const replacing = new Set(ordered.map((item) => item.id))
  const queue = [...ordered]

  return all.map((item) => (replacing.has(item.id) ? (queue.shift() ?? item) : item))
}

/** The server's order, as the data layer returns it. */
function sortByOrder(items: SessionPlanItem[]): SessionPlanItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}
