'use client'

/* eslint-disable react-hooks/incompatible-library --
   react-hook-form's `watch()` cannot be memoized safely, so the React Compiler
   skips this component and warns that it did. Accepted: re-rendering on every
   watched change is exactly what this form wants (live modifiers, the spell
   counter), and RHF is the form library the whole character half is built on. */

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
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
import {
  BACKGROUNDS,
  BACKGROUND_ABILITY_SPREADS,
  ORIGIN_FEATS,
  SUBCLASS_LEVEL,
  hasSubclass,
  hasWeaponMastery,
  spellPreparationModel,
  subclassOptions,
} from '@/lib/characters/rules'
import type { Character } from '@/lib/db/characters'
import { useClasses, useRaces } from '@/lib/dnd-api/swr-hooks'
import { cn } from '@/lib/utils'

import { SkillProficiencyPicker } from './skill-proficiency-picker'
import { SpellPicker } from './spell-picker'
import { WeaponMasteryPicker } from './weapon-mastery-picker'

/**
 * Words for the player, keyed by status — the same pattern the sheet's
 * `use-combat-state.ts` uses. Only a 400 carries the server's own sentence
 * through: that one is the zod message, already written for a human and
 * pointing at a field. Everything else the server says ("Unauthorized") is
 * written for developers and stays off the screen.
 */
function submitMessageFor(status: number, serverError?: string): string {
  if (status === 400) return serverError ?? 'That change is not valid. Check the fields above.'
  if (status === 401) return 'You have been signed out. Sign in again to save this character.'
  if (status === 404) return 'This character is no longer there. It may have been deleted.'
  if (status === 409)
    return 'Someone else changed this character first. Refresh the page to see their version, then make your change again.'
  return 'Could not save the character. Try again in a moment.'
}

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
 * A reference-data select: class and species come from `/api/dnd5e/*`, the 2024
 * origin fields from the local SRD data — either way a list, never a text box.
 *
 * Radix treats `value=""` as a real selection, so an unset field is passed
 * through as `undefined` to keep the placeholder showing. `null` arrives from
 * the nullable 2024 columns and means the same thing.
 */
function ReferenceSelect({
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

/**
 * The character form — creation (DND-008) and editing (DND-018).
 *
 * One page, no steps: this is for a player who already knows D&D and is copying
 * a finished build off paper. The guided five-step wizard with point-buy and
 * suggestions is DND-005, deliberately post-v1.
 *
 * Editing is the same twenty fields against the same zod object, opened on
 * the stored row instead of on defaults. One form rather than two because a
 * correction is the same act as an entry — the player is looking at the same
 * paper sheet, fixing the number they mistyped — and because a second form
 * would be a second place for the rules to drift.
 *
 * Passing `character` switches it to editing: it `PATCH`es that character's
 * build fields and returns to their sheet. Level is editable as a plain number
 * — the guided level-up that works out hit points, slots and spells from it is
 * its own page (DND-032), linked from the level field.
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
  const level = watch('level')
  const backgroundIndex = watch('backgroundIndex')
  const backgroundAbilitySpread = watch('backgroundAbilitySpread')
  const backgroundAbilities = watch('backgroundAbilities')
  const knownSpellIndexes = watch('knownSpellIndexes')
  const skillProficiencies = watch('skillProficiencies')
  const skillExpertise = watch('skillExpertise')
  const selectedClass = classes.find((option) => option.index === classIndex)

  // Cleric, druid and paladin prepare from the whole class list on the sheet
  // (DND-036, D22) — there is nothing to pick at creation, and the old picker
  // was ~105 checkboxes of exactly that nothing.
  const preparesFromClassList = spellPreparationModel(classIndex) === 'class-list'
  const isSpellbookClass = spellPreparationModel(classIndex) === 'spellbook'

  // The 2024 origin block. A background's three abilities are what its spread
  // may be spent on, so the two "+2 / +1" selects below are filtered by it and
  // there is nothing to ask until one is chosen. Number.isNaN guards the level
  // field mid-typing — an emptied number input watches as NaN.
  const background = BACKGROUNDS.get(backgroundIndex ?? '')
  const spendableAbilities = (background?.abilityScores ?? []).map((key) => ({
    index: key,
    name: ABILITIES.find((ability) => ability.key === key)?.label ?? key,
  }))
  const currentLevel = Number.isNaN(level) ? 1 : level
  const subclasses = subclassOptions(classIndex)
  const hasSubclassYet = hasSubclass(classIndex, currentLevel)

  /** Write one slot of the ordered spread — 0 is the +2, 1 is the +1. */
  const setSpreadAbility = (position: number, ability: string) => {
    const next = [...(backgroundAbilities ?? [])]
    next[position] = ability
    setValue('backgroundAbilities', next, { shouldDirty: true })
  }

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

    setSubmitError(submitMessageFor(response.status, payload.error))
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
                    // Expertise is a rogue/bard feature (D21); switching away
                    // must not leave doubled skills the picker no longer shows.
                    if (value !== 'rogue' && value !== 'bard') setValue('skillExpertise', [])
                    // A subclass and a set of weapon masteries both belong to a
                    // class. Keeping a fighter's Champion on a wizard would
                    // save a subclass the new class does not have — and the
                    // server clears it anyway, so clear it where it shows.
                    setValue('subclassIndex', null)
                    setValue('masteredWeaponIndexes', null)
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

          {/* Setting the number here is still just setting the number — this
              form has no opinion about what 5e says changes with it. The flow
              that does is one link away (DND-032). */}
          {character ? (
            <p className="text-muted-foreground text-xs">
              Typing a level here only sets the number.{' '}
              <Link
                href={`/characters/${character.id}/level`}
                className="underline underline-offset-4"
              >
                Manage level
              </Link>{' '}
              works out the hit points, spell slots and spells that come with it.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* The 2024 origin block (`srd-2024-migration/character-model-migration`),
          in the same one-choice-per-field shape as everything above it. It is
          deliberately not a flow: the wizard that asks these in the order the
          rules ask them, and works the ability scores out for you, is the
          `guided-creation` epic. Every field here may be left unset — a
          character copied off paper need not have all of it written down. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Origin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            id="backgroundIndex"
            label="Background"
            error={errors.backgroundIndex}
            hint="In the 2024 rules the background is where your ability score increases and your origin feat come from."
          >
            <Controller
              control={control}
              name="backgroundIndex"
              render={({ field }) => (
                <ReferenceSelect
                  id="backgroundIndex"
                  placeholder="Choose a background"
                  options={BACKGROUNDS.all}
                  value={field.value}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.backgroundIndex)}
                  onChange={(value) => {
                    field.onChange(value)
                    // The spread was chosen among the *old* background's three
                    // abilities, so it cannot survive the change.
                    setValue('backgroundAbilitySpread', null)
                    setValue('backgroundAbilities', null)
                    // The SRD grants each background one origin feat, so fill
                    // it in — still editable, because a DM may hand out another.
                    setValue('backgroundIndex', value)
                    setValue('originFeatIndex', BACKGROUNDS.get(value)?.originFeat.index ?? null, {
                      shouldDirty: true,
                    })
                  }}
                />
              )}
            />
          </Field>

          {background ? (
            <Field
              id="backgroundAbilitySpread"
              label="Ability score increases"
              error={errors.backgroundAbilitySpread}
            >
              <Controller
                control={control}
                name="backgroundAbilitySpread"
                render={({ field }) => (
                  <ReferenceSelect
                    id="backgroundAbilitySpread"
                    placeholder="Choose a spread"
                    options={BACKGROUND_ABILITY_SPREADS.map((spread) => ({
                      index: spread.key,
                      name: spread.label,
                    }))}
                    value={field.value}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.backgroundAbilitySpread)}
                    onChange={(value) => {
                      field.onChange(value)
                      // `one-each` spends +1 on all three of the background's
                      // abilities, so there is nothing left to ask; the other
                      // spread needs the player to say which two, in order.
                      setValue(
                        'backgroundAbilities',
                        value === 'one-each' ? [...background.abilityScores] : null,
                        { shouldDirty: true },
                      )
                    }}
                  />
                )}
              />
            </Field>
          ) : null}

          {background && backgroundAbilitySpread === 'two-and-one' ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { position: 0, label: '+2 to' },
                { position: 1, label: '+1 to' },
              ].map(({ position, label }) => (
                <Field key={position} id={`backgroundAbility-${position}`} label={label}>
                  <ReferenceSelect
                    id={`backgroundAbility-${position}`}
                    placeholder="Ability"
                    options={spendableAbilities}
                    value={backgroundAbilities?.[position] ?? null}
                    invalid={false}
                    onChange={(value) => setSpreadAbility(position, value)}
                  />
                </Field>
              ))}
            </div>
          ) : null}

          <Field
            id="originFeatIndex"
            label="Origin feat"
            error={errors.originFeatIndex}
            hint={
              background
                ? `${background.name} grants ${background.originFeat.name}${background.originFeat.note ? ` (${background.originFeat.note})` : ''}.`
                : undefined
            }
          >
            <Controller
              control={control}
              name="originFeatIndex"
              render={({ field }) => (
                <ReferenceSelect
                  id="originFeatIndex"
                  placeholder="Choose an origin feat"
                  options={ORIGIN_FEATS.all}
                  value={field.value}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.originFeatIndex)}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          {/* Offered whatever the level, and explained rather than hidden below
              3rd: a player filling this in is usually reading a finished sheet,
              and "why is there no subclass field" is a worse question than a
              field that says when it starts counting. The server drops a
              subclass the character is too low to have. */}
          {subclasses.length > 0 ? (
            <Field
              id="subclassIndex"
              label="Subclass"
              error={errors.subclassIndex}
              hint={
                hasSubclassYet
                  ? undefined
                  : `Chosen at level ${SUBCLASS_LEVEL} — this character is not there yet.`
              }
            >
              <Controller
                control={control}
                name="subclassIndex"
                render={({ field }) => (
                  <ReferenceSelect
                    id="subclassIndex"
                    placeholder="Choose a subclass"
                    options={subclasses}
                    value={field.value}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.subclassIndex)}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      {/* Only the five martial classes have the feature at all, so the card is
          simply absent for the other seven — an empty "Weapon mastery" heading
          on a wizard's form reads as something missing rather than something
          they do not get. */}
      {hasWeaponMastery(classIndex) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weapon mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="masteredWeaponIndexes"
              render={({ field }) => (
                <WeaponMasteryPicker
                  classIndex={classIndex}
                  level={currentLevel}
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.masteredWeaponIndexes ? (
              <p role="alert" className="text-destructive mt-2 text-xs">
                {errors.masteredWeaponIndexes.message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
          {/* Same two-then-three shape as the ability scores above. Three
              columns on a phone left ~75px per field, and every message here
              is a full sentence ("Max HP must be a whole number between 1 and
              999") — it wrapped to a paragraph under a two-digit box. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          <CardTitle className="text-base">Skill proficiencies</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillProficiencyPicker
            classIndex={classIndex}
            classLabel={selectedClass?.name}
            proficiencies={skillProficiencies}
            expertise={skillExpertise}
            onChange={(next) => {
              setValue('skillProficiencies', next.proficiencies, { shouldDirty: true })
              setValue('skillExpertise', next.expertise, { shouldDirty: true })
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isSpellbookClass ? 'Spellbook' : 'Spells'}</CardTitle>
        </CardHeader>
        <CardContent>
          {preparesFromClassList ? (
            <p className="text-muted-foreground text-sm">
              {selectedClass?.name ?? 'This class'}s prepare from the whole class list on the sheet
              — nothing to pick here.
            </p>
          ) : (
            <>
              {isSpellbookClass ? (
                <p className="text-muted-foreground mb-3 text-xs">
                  These are the spells in the book. Which of them are prepared for the day is chosen
                  on the sheet.
                </p>
              ) : null}
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
            </>
          )}
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
          {preparesFromClassList ? null : (
            <span className="text-muted-foreground shrink-0 text-xs">
              {knownSpellIndexes.length === 1 ? '1 spell' : `${knownSpellIndexes.length} spells`}
            </span>
          )}
        </div>
      </div>
    </form>
  )
}
