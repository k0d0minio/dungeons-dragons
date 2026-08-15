'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Controller, useForm, type FieldError } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { abilityModifier, formatModifier } from '@/lib/characters/display'
import {
  ABILITIES,
  CHARACTER_FORM_DEFAULTS,
  characterFormSchema,
  characterFormValuesOf,
  type CharacterFormValues,
} from '@/lib/characters/schema'
import type { Character } from '@/lib/db/characters'
import { useClasses, useRaces } from '@/lib/dnd-api/swr-hooks'
import { cn } from '@/lib/utils'

import { SpellPicker } from './spell-picker'

/** Label, control and error message, stacked — one column, always. */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: FieldError
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error.message}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * A reference-data select: class or species, fed from `/api/dnd5e/*` rather
 * than a hand-typed list.
 *
 * Radix treats `value=""` as a real selection, so an unset field is passed
 * through as `undefined` to keep the placeholder showing.
 */
function ReferenceSelect({
  id,
  placeholder,
  options,
  isLoading,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  id: string
  placeholder: string
  options: Array<{ index: string; name: string }>
  isLoading: boolean
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  invalid: boolean
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={isLoading}>
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

/**
 * The character form — creation (DND-008) and editing (DND-018).
 *
 * One page, no steps: this is for a player who already knows D&D and is copying
 * a finished build off paper. The guided five-step wizard with point-buy and
 * suggestions is DND-005, deliberately post-v1.
 *
 * Editing is the same fourteen fields against the same zod object, opened on
 * the stored row instead of on defaults. One form rather than two because a
 * correction is the same act as an entry — the player is looking at the same
 * paper sheet, fixing the number they mistyped — and because a second form
 * would be a second place for the rules to drift.
 *
 * Passing `character` switches it to editing: it `PATCH`es that character's
 * build fields and returns to their sheet. Level is editable as a plain number;
 * the guided level-up that recomputes proficiency, hit points and slots from it
 * is DND-032.
 *
 * Everything is a single column with 44px controls, because the phone is the
 * primary device and the person filling this in is usually holding a character
 * sheet in the other hand.
 */
export function CharacterForm({ character }: { character?: Character }) {
  const router = useRouter()
  const { classes, isLoading: classesLoading, error: classesError } = useClasses()
  const { races, isLoading: racesLoading, error: racesError } = useRaces()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const editing = character !== undefined

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: character ? characterFormValuesOf(character) : CHARACTER_FORM_DEFAULTS,
    // Validate a field once the player has left it, then keep it live. Shouting
    // "must be between 1 and 20" at someone who has typed the first digit of
    // "12" is not help.
    mode: 'onTouched',
  })

  const classIndex = watch('classIndex')
  const knownSpellIndexes = watch('knownSpellIndexes')
  const selectedClass = classes.find((option) => option.index === classIndex)

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    let response: Response

    try {
      response = await fetch(character ? `/api/characters/${character.id}` : '/api/characters', {
        method: character ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      setSubmitError('Could not reach the server. Check your connection and try again.')
      return
    }

    if (response.ok) {
      // `refresh()` so the page landed on re-runs its owner-scoped query rather
      // than serving what it rendered before the save — the cached "nothing here
      // yet" on the list, or the pre-edit numbers on the sheet.
      router.push(character ? `/characters/${character.id}` : '/characters')
      router.refresh()
      return
    }

    const body: unknown = await response.json().catch(() => null)
    const payload = (body ?? {}) as { error?: string; fieldErrors?: Record<string, string> }

    // The server validates against the same schema, so a 400 here means the two
    // sides disagreed — surface it on the field rather than as a bare banner.
    for (const [field, message] of Object.entries(payload.fieldErrors ?? {})) {
      if (field in CHARACTER_FORM_DEFAULTS) {
        setError(field as keyof CharacterFormValues, { type: 'server', message })
      }
    }

    setSubmitError(payload.error ?? `Could not save the character (${response.status}).`)
  })

  const numberField = (name: keyof CharacterFormValues, id: string) => ({
    id,
    type: 'number' as const,
    inputMode: 'numeric' as const,
    className: 'h-11',
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${id}-error` : undefined,
    ...register(name, { valueAsNumber: true }),
  })

  // The bottom padding clears the fixed save bar, which now sits a tab bar's
  // height off the bottom of the viewport (DND-029) — hence a step up from the
  // old `pb-24`. When editing, the page puts a delete card after this form and
  // takes on that clearance itself.
  return (
    <form onSubmit={onSubmit} noValidate className={cn('space-y-4', !editing && 'pb-28')}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who they are</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="name" label="Name" error={errors.name}>
            <Input
              id="name"
              className="h-11"
              autoComplete="off"
              placeholder="Vex Ashbrand"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
              {...register('name')}
            />
          </Field>

          <Field
            id="classIndex"
            label="Class"
            error={errors.classIndex}
            hint={classesError ? 'Could not load the class list — try reloading.' : undefined}
          >
            <Controller
              control={control}
              name="classIndex"
              render={({ field }) => (
                <ReferenceSelect
                  id="classIndex"
                  placeholder="Choose a class"
                  options={classes}
                  isLoading={classesLoading}
                  value={field.value}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.classIndex)}
                  onChange={(value) => {
                    field.onChange(value)
                    // The spell list is class-filtered, so keeping a wizard's
                    // picks after a switch to fighter would silently save
                    // spells the picker no longer shows.
                    setValue('knownSpellIndexes', [])
                  }}
                />
              )}
            />
          </Field>

          <Field
            id="speciesIndex"
            label="Species"
            error={errors.speciesIndex}
            hint={racesError ? 'Could not load the species list — try reloading.' : undefined}
          >
            <Controller
              control={control}
              name="speciesIndex"
              render={({ field }) => (
                <ReferenceSelect
                  id="speciesIndex"
                  placeholder="Choose a species"
                  options={races}
                  isLoading={racesLoading}
                  value={field.value}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.speciesIndex)}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field id="level" label="Level" error={errors.level}>
            <Input {...numberField('level', 'level')} min={1} max={20} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ability scores</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Two columns on a phone, three once there is room — six single-file
              fields is a lot of scrolling for six two-digit numbers. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ABILITIES.map((ability) => {
              const score = watch(ability.key)
              const error = errors[ability.key]

              return (
                <Field
                  key={ability.key}
                  id={ability.key}
                  label={ability.abbreviation}
                  error={error}
                  hint={`${ability.label} · ${formatModifier(abilityModifier(score))}`}
                >
                  <Input {...numberField(ability.key, ability.key)} min={1} max={30} />
                </Field>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Combat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Field id="maxHitPoints" label="Max HP" error={errors.maxHitPoints}>
              <Input {...numberField('maxHitPoints', 'maxHitPoints')} min={1} max={999} />
            </Field>
            <Field id="armorClass" label="AC" error={errors.armorClass}>
              <Input {...numberField('armorClass', 'armorClass')} min={0} max={50} />
            </Field>
            <Field id="speed" label="Speed" error={errors.speed}>
              <Input {...numberField('speed', 'speed')} min={0} max={200} />
            </Field>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            {editing
              ? 'Current hit points stay where the sheet left them — unless the maximum drops below them, which brings them down with it.'
              : 'A new character starts the session at full hit points.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spells</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="knownSpellIndexes"
            render={({ field }) => (
              <SpellPicker
                classIndex={classIndex}
                classLabel={selectedClass?.name}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.knownSpellIndexes ? (
            <p role="alert" className="text-destructive mt-2 text-xs">
              {errors.knownSpellIndexes.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {submitError ? (
        <p role="alert" className="text-destructive text-sm">
          {submitError}
        </p>
      ) : null}

      {/* Pinned to the bottom of the viewport so saving is always in thumb
          reach, however far down the spell list the player has scrolled — and
          stacked directly on top of the tab bar rather than under it, so the
          two never fight over the same corner (DND-029). */}
      <div className="bg-background/95 fixed inset-x-0 bottom-[var(--bottom-nav-height)] border-t p-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <Button type="submit" className="h-11 flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Create character'}
          </Button>
          <span className="text-muted-foreground shrink-0 text-xs">
            {knownSpellIndexes.length === 1 ? '1 spell' : `${knownSpellIndexes.length} spells`}
          </span>
        </div>
      </div>
    </form>
  )
}
