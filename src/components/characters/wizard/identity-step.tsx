'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { abilityModifier, formatModifier } from '@/lib/characters/display'
import { BACKGROUNDS } from '@/lib/characters/rules'
import { ABILITIES } from '@/lib/characters/schema'
import {
  derivedMaxHitPoints,
  derivedSpeed,
  finalAbilityScores,
  startingEquipmentOf,
  type WizardChoices,
} from '@/lib/characters/wizard'
import { CLASSES } from '@/lib/srd/classes'
import { SPECIES } from '@/lib/srd/species'

/**
 * Step 8, and last: the name, with the whole character laid out under it.
 *
 * Last on purpose. Naming is the part a player wants to linger on and the part
 * that decides nothing, and asking for it first is how a first evening turns
 * into twenty minutes of naming a character whose class has not been chosen.
 * By the time this screen appears there is somebody on it to be named.
 */
export function IdentityStep({
  choices,
  onChange,
  nameError,
}: {
  choices: WizardChoices
  onChange: (next: WizardChoices) => void
  nameError?: string
}) {
  const scores = finalAbilityScores(choices)
  const className = CLASSES.get(choices.classIndex)?.name ?? choices.classIndex
  const speciesName = SPECIES.get(choices.speciesIndex)?.name ?? choices.speciesIndex
  const background = BACKGROUNDS.get(choices.backgroundIndex)
  const gear = startingEquipmentOf(choices)

  const stats = [
    { label: 'HP', value: derivedMaxHitPoints(choices.classIndex, scores.constitution) },
    { label: 'Speed', value: `${derivedSpeed(choices.speciesIndex)} ft.` },
    { label: 'Gold', value: `${gear.gold} gp` },
  ]

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="wizard-name">Name</Label>
        <Input
          id="wizard-name"
          className="h-11"
          autoComplete="off"
          placeholder="Vex Ashbrand"
          value={choices.name}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'wizard-name-error' : undefined}
          onChange={(event) => onChange({ ...choices, name: event.target.value })}
        />
        {nameError ? (
          <p id="wizard-name-error" role="alert" className="text-destructive text-xs">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="font-serif text-lg font-bold">
          Level 1 {speciesName} {className}
          {background ? ` · ${background.name}` : ''}
        </p>

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                {stat.label}
              </dt>
              <dd className="font-medium">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map((ability) => (
            <li key={ability.key} className="rounded-md border p-1.5 text-center">
              <span className="text-muted-foreground block text-[0.65rem] tracking-wide uppercase">
                {ability.abbreviation}
              </span>
              <span className="font-medium">{scores[ability.key]}</span>
              <span className="text-muted-foreground block text-[0.65rem]">
                {formatModifier(abilityModifier(scores[ability.key]))}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground text-xs">
          Everything here can be changed afterwards — this is a starting point, not a contract.
        </p>
      </div>
    </div>
  )
}
