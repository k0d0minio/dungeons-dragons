'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { abilityModifier, formatModifier } from '@/lib/characters/display'
import { BACKGROUNDS } from '@/lib/characters/rules'
import { ABILITIES, type AbilityKey } from '@/lib/characters/schema'
import {
  abilityScoresFromAssignment,
  finalAbilityScores,
  STANDARD_ARRAY,
  swapAbilityAssignment,
  type WizardChoices,
} from '@/lib/characters/wizard'
import { ABILITY_IN_PLAY } from '@/lib/srd/in-play'
import { cn } from '@/lib/utils'

import { ReferenceSelect } from '../reference-select'
import { AdvancedDetail } from '../sheet/advanced-detail'

const ABILITY_OPTIONS = ABILITIES.map((ability) => ({
  index: ability.key as string,
  name: ability.label,
}))

/**
 * Step 4: where the six numbers go.
 *
 * The standard array, poured into the class's own priority order and shown as
 * six rows that can be swapped: picking Strength in the "15" row moves whatever
 * had Strength into the row Strength came from, so the six numbers stay the six
 * numbers however much they are shuffled. Point buy is a budget a first-timer
 * has to learn before they can spend it; six fixed numbers to place is not.
 *
 * The background's +2/+1 lands on top and is shown landing — "15 +2 = 17" —
 * because a score that silently became a 17 is the single most confusing thing
 * a new player meets on a finished sheet.
 */
export function AbilitiesStep({
  choices,
  onChange,
}: {
  choices: WizardChoices
  onChange: (next: WizardChoices) => void
}) {
  const base = choices.manualScores ?? abilityScoresFromAssignment(choices.abilityAssignment)
  const final = finalAbilityScores(choices)
  const background = BACKGROUNDS.get(choices.backgroundIndex)
  const spendable = (background?.abilityScores ?? []).map((key) => ({
    index: key as string,
    name: ABILITIES.find((ability) => ability.key === key)?.label ?? key,
  }))

  const setManual = (ability: AbilityKey, value: number) => {
    onChange({
      ...choices,
      manualScores: { ...base, [ability]: Number.isNaN(value) ? 0 : value },
    })
  }

  const setSpread = (position: number, ability: string) => {
    const next = [...choices.backgroundAbilities]
    // The two increases cannot both land on one ability, so choosing an ability
    // that already holds the other slot swaps them rather than doubling up.
    const other = next.findIndex((key, index) => key === ability && index !== position)
    if (other !== -1) next[other] = next[position]
    next[position] = ability as AbilityKey

    onChange({ ...choices, backgroundAbilities: next })
  }

  return (
    <div className="space-y-5">
      {choices.manualScores === null ? (
        <div className="space-y-2">
          {STANDARD_ARRAY.map((score, position) => {
            const ability = choices.abilityAssignment[position]

            return (
              <div key={score} className="flex items-start gap-3 rounded-lg border p-3">
                <span className="w-10 shrink-0 text-center font-serif text-2xl font-bold">
                  {score}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <ReferenceSelect
                    id={`ability-slot-${position}`}
                    placeholder="Ability"
                    options={ABILITY_OPTIONS}
                    value={ability ?? null}
                    invalid={false}
                    onChange={(value) =>
                      onChange({
                        ...choices,
                        abilityAssignment: swapAbilityAssignment(
                          choices.abilityAssignment,
                          position,
                          value as AbilityKey,
                        ),
                      })
                    }
                  />
                  {/* The same authored line every other step prints, from the
                      same table — but not through `OptionRow`, because this
                      step's control is a select rather than a card: the six
                      numbers are being *moved* between abilities, not picked
                      from a list (`guided-creation/inline-consequences`). */}
                  {ability && ABILITY_IN_PLAY[ability] ? (
                    <p className="text-muted-foreground text-sm">{ABILITY_IN_PLAY[ability]}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ABILITIES.map((ability) => (
            <div key={ability.key} className="space-y-1.5">
              <Label htmlFor={`manual-${ability.key}`}>{ability.abbreviation}</Label>
              <Input
                id={`manual-${ability.key}`}
                type="number"
                inputMode="numeric"
                className="h-11"
                min={1}
                max={30}
                value={String(base[ability.key])}
                onChange={(event) => setManual(ability.key, event.target.valueAsNumber)}
              />
            </div>
          ))}
        </div>
      )}

      {background ? (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">{background.name} raises two of your scores</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { position: 0, label: '+2 to' },
              { position: 1, label: '+1 to' },
            ].map(({ position, label }) => (
              <div key={position} className="space-y-1.5">
                <Label htmlFor={`spread-${position}`}>{label}</Label>
                <ReferenceSelect
                  id={`spread-${position}`}
                  placeholder="Ability"
                  options={spendable}
                  value={choices.backgroundAbilities[position] ?? null}
                  invalid={false}
                  onChange={(value) => setSpread(position, value)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium">What you end up with</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ABILITIES.map((ability) => {
            const raised = final[ability.key] - base[ability.key]

            return (
              <li
                key={ability.key}
                className={cn(
                  'rounded-lg border p-2 text-center',
                  raised > 0 && 'border-primary bg-accent/40',
                )}
              >
                <span className="text-muted-foreground block text-xs tracking-wide uppercase">
                  {ability.abbreviation}
                </span>
                <span className="font-serif text-xl font-bold">{final[ability.key]}</span>
                <span className="text-muted-foreground block text-xs">
                  {formatModifier(abilityModifier(final[ability.key]))}
                  {raised > 0 ? ` · ${base[ability.key]} +${raised}` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <AdvancedDetail
        label="Enter scores by hand"
        summary="Rolled at the table, or copying a sheet you already have."
        relevant={choices.manualScores !== null}
      >
        <p className="text-muted-foreground text-sm">
          {choices.manualScores === null
            ? 'Switch off the standard array and type the six numbers yourself. Your background’s increases still apply on top.'
            : 'These are your scores before the background’s increases.'}
        </p>
        <button
          type="button"
          className="text-primary min-h-11 text-sm underline underline-offset-4"
          onClick={() =>
            onChange({
              ...choices,
              manualScores:
                choices.manualScores === null
                  ? abilityScoresFromAssignment(choices.abilityAssignment)
                  : null,
            })
          }
        >
          {choices.manualScores === null ? 'Type them myself' : 'Back to the standard array'}
        </button>
      </AdvancedDetail>
    </div>
  )
}
