'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { abilityModifier, formatModifier } from '@/lib/characters/display'
import { BACKGROUNDS } from '@/lib/characters/rules'
import { ABILITIES } from '@/lib/characters/schema'
import {
  derivedDefaults,
  finalAbilityScores,
  startingEquipmentOf,
  type WizardChoices,
} from '@/lib/characters/wizard'
import { CLASSES } from '@/lib/srd/classes'
import { SPECIES } from '@/lib/srd/species'

import { AdvancedDetail } from '../sheet/advanced-detail'

/** The three numbers the Advanced toggle can take back off the rules engine. */
const OVERRIDES = [
  {
    key: 'manualMaxHitPoints' as const,
    label: 'Max HP',
    hint: 'Your hit die plus your Constitution — a dwarf adds one more.',
    min: 1,
    max: 999,
  },
  {
    key: 'manualArmorClass' as const,
    label: 'Armour class',
    // Says the awkward part out loud rather than letting a player type 18 and
    // find 16 on their sheet: the column is the *unarmoured* number, and worn
    // armour is what the sheet derives from (`derivedArmorClass`).
    hint: 'Used when you have no armour on. Armour you are wearing sets it instead.',
    min: 0,
    max: 50,
  },
  {
    key: 'manualSpeed' as const,
    label: 'Speed',
    hint: 'Feet per turn. Your species decides it.',
    min: 0,
    max: 200,
  },
]

/**
 * Step 8, and last: the name, with the whole character laid out under it.
 *
 * Last on purpose. Naming is the part a player wants to linger on and the part
 * that decides nothing, and asking for it first is how a first evening turns
 * into twenty minutes of naming a character whose class has not been chosen.
 * By the time this screen appears there is somebody on it to be named.
 *
 * Every number on the card is derived from the seven steps above it
 * (`guided-creation/derived-defaults`) — including the armour class, which is
 * run through the sheet's own derivation with the gear that is about to be
 * worn, so this screen and the first sheet render cannot disagree. Typing one
 * of them by hand is still possible and lives behind the Advanced toggle,
 * where a player copying a character off paper will look for it and a
 * first-timer will never have to.
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
  const derived = derivedDefaults(choices)
  const overridden = Object.values(derived.overridden).some(Boolean)

  // Named after what actually produced the number on screen, which is not
  // always what was typed: worn armour beats the column, override included, so
  // a player who types 20 and keeps their chain mail is told 16 "from your
  // armour" rather than being shown a number nobody will ever roll against.
  const armorCaption =
    derived.armorClassInPlay.source === 'equipment'
      ? derived.armorClassInPlay.shield
        ? 'armour + shield'
        : 'from your armour'
      : derived.overridden.armorClass
        ? 'by hand'
        : 'with nothing worn'

  const stats = [
    { label: 'HP', value: derived.maxHitPoints, caption: null as string | null },
    { label: 'AC', value: derived.armorClassInPlay.value, caption: armorCaption },
    { label: 'Speed', value: `${derived.speed} ft.`, caption: null },
    { label: 'Gold', value: `${gear.gold} gp`, caption: null },
  ]

  const setOverride = (key: (typeof OVERRIDES)[number]['key'], value: number) => {
    onChange({ ...choices, [key]: Number.isNaN(value) ? null : value })
  }

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
              <dd className="font-medium">
                {stat.value}
                {stat.caption ? (
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    {stat.caption}
                  </span>
                ) : null}
              </dd>
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

      <AdvancedDetail
        label="Set the numbers by hand"
        summary="Hit points, armour class and speed are worked out for you."
        relevant={overridden}
      >
        <p className="text-muted-foreground text-sm">
          These follow from your class, species and gear. Type one only if you are copying a
          character you already have — leave a box empty to go back to the worked-out number.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OVERRIDES.map((override) => (
            <div key={override.key} className="space-y-1.5">
              <Label htmlFor={`override-${override.key}`}>{override.label}</Label>
              <Input
                id={`override-${override.key}`}
                type="number"
                inputMode="numeric"
                className="h-11"
                min={override.min}
                max={override.max}
                placeholder={String(
                  override.key === 'manualMaxHitPoints'
                    ? derived.maxHitPoints
                    : override.key === 'manualArmorClass'
                      ? derived.armorClass
                      : derived.speed,
                )}
                value={choices[override.key] === null ? '' : String(choices[override.key])}
                onChange={(event) => setOverride(override.key, event.target.valueAsNumber)}
              />
              <p className="text-muted-foreground text-xs">{override.hint}</p>
            </div>
          ))}
        </div>
      </AdvancedDetail>
    </div>
  )
}
