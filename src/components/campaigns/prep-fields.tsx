'use client'

import { type ReactNode } from 'react'
import { EyeOff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PrepField } from '@/lib/prep/fields'

// The three pieces every prep screen is built from (`dm-prep-suite`).
//
// `npc-roster` wrote these inside `npc-roster.tsx` because there was one prep
// screen. There are three now — NPCs, places, handouts — and one of them,
// `SecretLayer`, carries a property rather than a style: it is the marking that
// tells a DM which half of the phone he can turn around at a table with players
// either side of him. Three copies of that is three chances for one screen to
// mark the DM-only block a little less clearly than the others.

/**
 * The DM-only layer, marked as secret wherever it appears.
 *
 * One component for every editor and every read view, so the marking cannot be
 * present on one and forgotten on the other. Three signals rather than one: a
 * dashed border and a tinted ground set the block apart from the public fields
 * above it, the heading carries an eye-with-a-slash and a "DM only" badge, and
 * the line under it says the rule in words. The badge is not decoration —
 * `aria-label` makes it the same sentence for a screen reader.
 *
 * `blurb` is the one thing that varies, because the rule reads differently for
 * a person than for a piece of paper: revealing an NPC shows the party a face,
 * revealing a handout puts the thing in their hands, and in both cases none of
 * this goes with it.
 */
export function SecretLayer({ blurb, children }: { blurb: string; children: ReactNode }) {
  return (
    <section className="bg-muted/40 space-y-3 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <EyeOff className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <h4 className="text-sm font-medium">Behind the screen</h4>
        <Badge variant="secondary" aria-label="DM only — never shown to players">
          DM only
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">{blurb}</p>
      {children}
    </section>
  )
}

/** One labelled field, single-line or growable, driven by the field list. */
export function FieldInput({
  id,
  field,
  value,
  disabled,
  onChange,
}: {
  id: string
  field: PrepField
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.kind === 'line' ? (
        <Input
          id={id}
          value={value}
          disabled={disabled}
          maxLength={field.max}
          aria-describedby={`${id}-hint`}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Textarea
          id={id}
          value={value}
          disabled={disabled}
          rows={3}
          maxLength={field.max}
          aria-describedby={`${id}-hint`}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {field.hint}
      </p>
    </div>
  )
}

/** One written field in a read view. Nothing renders for one left blank. */
export function ReadField({ field, value }: { field: PrepField; value: string | null }) {
  if (!value) return null

  return (
    <div className="space-y-0.5">
      <h5 className="text-muted-foreground text-xs font-medium">{field.label}</h5>
      {/* `whitespace-pre-wrap`: prep is typed in paragraphs and read at speed. */}
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  )
}
