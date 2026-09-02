'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

import { OptionRow, type WizardOption } from './option-row'

export type { WizardOption } from './option-row'

/**
 * The wizard's one way of asking a single-answer question
 * (`guided-creation/wizard-frame`).
 *
 * A stack of {@link OptionRow} cards, the recommended one already selected and
 * badged, each carrying its authored consequence line. Radix's radio group
 * underneath means arrow keys and screen-reader semantics come for free.
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

          return (
            <OptionRow
              key={option.value}
              htmlFor={id}
              control={<RadioGroupItem id={id} value={option.value} />}
              title={option.title}
              inPlay={option.inPlay}
              meta={option.meta}
              recommended={option.recommended}
              selected={option.value === value}
            />
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
