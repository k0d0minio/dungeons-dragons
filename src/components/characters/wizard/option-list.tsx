'use client'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

/** One card in a wizard step: what it is, what it means, why it is suggested. */
export interface WizardOption {
  value: string
  title: string
  /** The plain-language line — what you actually *do* with this choice. */
  summary?: string
  /** Short facts worth seeing without opening anything: "d10 hit die", "35 ft". */
  meta?: string[]
  /** Marks the pre-selected suggestion, so "recommended" is visible, not implied. */
  recommended?: boolean
}

/**
 * The wizard's one way of asking a question (`guided-creation/wizard-frame`).
 *
 * Every step that is a choice is this component: a stack of tappable cards, the
 * recommended one already selected and badged, each carrying a line of plain
 * language under its name. Radix's radio group underneath means arrow keys and
 * screen-reader semantics come for free, and the whole card is the target —
 * on a phone, at a table, nobody is aiming at a 16px circle.
 *
 * `inline-consequences` widens the `summary` line to every option the wizard
 * can show and moves the copy into the SRD data; the shape it renders into is
 * this one, which is why the field is here rather than in each step.
 */
export function OptionList({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 1,
}: {
  /** Distinguishes the group's input ids from another group's on the same step. */
  name: string
  legend: string
  options: readonly WizardOption[]
  value: string
  onChange: (value: string) => void
  /** Two columns for short-titled sets — the nine species, the ability scores. */
  columns?: 1 | 2
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        aria-label={legend}
        className={cn(columns === 2 && 'grid-cols-2')}
      >
        {options.map((option) => {
          const id = `${name}-${option.value}`
          const selected = option.value === value

          return (
            <Label
              key={option.value}
              htmlFor={id}
              className={cn(
                'flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors',
                selected ? 'border-primary bg-accent/50' : 'hover:bg-accent/30',
              )}
            >
              <RadioGroupItem id={id} value={option.value} className="mt-1 shrink-0" />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{option.title}</span>
                  {option.recommended ? (
                    <Badge variant="secondary" className="shrink-0">
                      Suggested
                    </Badge>
                  ) : null}
                </span>
                {option.summary ? (
                  <span className="text-muted-foreground block text-sm">{option.summary}</span>
                ) : null}
                {option.meta && option.meta.length > 0 ? (
                  <span className="text-muted-foreground block text-xs">
                    {option.meta.join(' · ')}
                  </span>
                ) : null}
              </span>
            </Label>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
