'use client'

import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** One card in a wizard step: what it is, what it means, why it is suggested. */
export interface WizardOption {
  value: string
  title: string
  /**
   * The authored "what this means in play" line — the whole point of
   * `guided-creation/inline-consequences`. Comes out of
   * `src/lib/srd/in-play.ts`, never composed in a component, and absent only
   * where nothing is authored (a spell outside the curated hand).
   */
  inPlay?: string
  /** Short facts worth seeing without opening anything: "d10 hit die", "35 ft". */
  meta?: string[]
  /** Marks the pre-selected suggestion, so "recommended" is visible, not implied. */
  recommended?: boolean
}

/**
 * The one row every wizard step renders an option as.
 *
 * There is exactly one of these because the consequence line has to look the
 * same everywhere it appears: a class, a skill, a spell and a bundle of gear
 * are wildly different things, and the sentence under each of them is the same
 * promise — *this is what happens at the table if you pick this*. A step that
 * drew its own row would drift, and the line would read as decoration on the
 * steps that styled it smaller.
 *
 * The control is passed in rather than chosen here: the class step is a radio
 * group, the spells step is checkboxes, and the skills step shows rows that
 * are not a control at all. All three want the same card.
 *
 * With `htmlFor` the card is a `<label>` and the whole 44px-tall thing is the
 * tap target — on a phone, at a table, nobody is aiming at a 16px circle.
 * Without it the card is a plain `<div>`. Everything inside is a `<span>` so
 * both roots are valid.
 */
export function OptionRow({
  htmlFor,
  control,
  title,
  inPlay,
  meta,
  recommended,
  trailing,
  selected = false,
  className,
}: {
  /** Id of the control this card labels; omit for a card that is not a choice. */
  htmlFor?: string
  /** The radio or checkbox itself, or nothing on a read-only card. */
  control?: ReactNode
  title: string
  inPlay?: string
  meta?: string[]
  recommended?: boolean
  /** Anything that belongs at the far end of the row — the expertise toggle. */
  trailing?: ReactNode
  selected?: boolean
  className?: string
}) {
  const Root = htmlFor ? Label : 'div'

  return (
    <Root
      {...(htmlFor ? { htmlFor } : {})}
      className={cn(
        'flex min-h-11 items-start gap-3 rounded-lg border p-3 font-normal transition-colors',
        htmlFor && 'cursor-pointer',
        selected ? 'border-primary bg-accent/50' : htmlFor && 'hover:bg-accent/30',
        className,
      )}
    >
      {control ? <span className="mt-0.5 flex shrink-0 items-center">{control}</span> : null}

      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{title}</span>
          {recommended ? (
            <Badge variant="secondary" className="shrink-0">
              Suggested
            </Badge>
          ) : null}
        </span>
        {inPlay ? <span className="text-muted-foreground block text-sm">{inPlay}</span> : null}
        {meta && meta.length > 0 ? (
          <span className="text-muted-foreground block text-xs">{meta.join(' · ')}</span>
        ) : null}
      </span>

      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </Root>
  )
}
