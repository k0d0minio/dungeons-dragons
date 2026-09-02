'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * A reference-data select: class and species come from the local SRD data, the
 * 2024 origin fields from the local SRD data — either way a list, never a text
 * box.
 *
 * Radix treats `value=""` as a real selection, so an unset field is passed
 * through as `undefined` to keep the placeholder showing. `null` arrives from
 * the nullable 2024 columns and means the same thing.
 *
 * Its own file since `srd-2024-migration/asi-and-feats`, which gave the level
 * planner ability and feat pickers with exactly the same shape — one select
 * that behaves the same in both places, rather than two that drift.
 */
export function ReferenceSelect({
  id,
  placeholder,
  options,
  isLoading = false,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  id: string
  placeholder: string
  options: readonly { index: string; name: string }[]
  isLoading?: boolean
  /** `null` for a field that has not been chosen — the 2024 columns' own shape. */
  value: string | null | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  invalid: boolean
}) {
  return (
    // Keyed on "is there a value at all" so clearing one — which is what
    // changing class does to the subclass — remounts the select and brings its
    // placeholder back. Radix keeps rendering the old label otherwise, leaving
    // a trigger that reads as nothing at all.
    <Select
      key={value ? 'chosen' : 'empty'}
      value={value || undefined}
      onValueChange={onChange}
      disabled={isLoading}
    >
      <SelectTrigger
        id={id}
        className="h-11 w-full"
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onBlur={onBlur}
      >
        <SelectValue placeholder={isLoading ? 'Loading…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.index} value={option.index} className="min-h-11">
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
