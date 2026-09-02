'use client'

import { Checkbox } from '@/components/ui/checkbox'

import { OptionRow, type WizardOption } from './option-row'

/**
 * The wizard's one way of asking a many-answer question — the same
 * {@link OptionRow} card as {@link OptionList}, with a checkbox in the control
 * slot instead of a radio.
 *
 * Split from `OptionList` rather than folded into it with a `multiple` flag
 * because the two differ in everything but the card: a radio group has one
 * value and Radix's roving focus, a checklist has a set and eighteen
 * independently tabbable boxes. What has to stay identical is the row, and that
 * is the part they share.
 */
export function OptionChecklist({
  name,
  legend,
  options,
  values,
  onToggle,
}: {
  /** Distinguishes this group's input ids from another group's on the same step. */
  name: string
  legend: string
  options: readonly WizardOption[]
  values: readonly string[]
  onToggle: (value: string) => void
}) {
  const picked = new Set(values)

  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="space-y-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`
          const checked = picked.has(option.value)

          return (
            <OptionRow
              key={option.value}
              htmlFor={id}
              control={
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => onToggle(option.value)}
                />
              }
              title={option.title}
              inPlay={option.inPlay}
              meta={option.meta}
              recommended={option.recommended}
              selected={checked}
            />
          )
        })}
      </div>
    </fieldset>
  )
}
