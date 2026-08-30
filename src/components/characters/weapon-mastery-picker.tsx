'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { WEAPONS, weaponMastery, weaponMasteryCount } from '@/lib/characters/rules'

/**
 * The weapons a character has Weapon Mastery with
 * (`srd-2024-migration/character-model-migration`).
 *
 * Weapons rather than mastery properties, because that is how the 2024 feature
 * reads: you gain the mastery property *of a kind of weapon*, and each weapon
 * carries exactly one. So the list is the SRD's 38 weapons with the property
 * each one grants named beside it, and picking Longsword is how a character
 * comes to have Sap.
 *
 * The count is the class's, and it moves with the level — a 1st-level fighter
 * has three, a 16th-level one has six, a wizard has none. Once the allowance is
 * spent the unpicked boxes go disabled rather than disappearing: a player who
 * has to swap one out needs to see what they are swapping it for, and a list
 * that shortens as you use it is a list you cannot plan against.
 *
 * Renders nothing for a class without the feature — including no class at all,
 * which is what the form starts as.
 */
export function WeaponMasteryPicker({
  classIndex,
  level,
  value,
  onChange,
}: {
  classIndex: string
  level: number
  /** Chosen weapon indexes, or `null` for none — the shape the column holds. */
  value: string[] | null
  onChange: (next: string[] | null) => void
}) {
  const allowance = weaponMasteryCount(classIndex, level)
  const chosen = value ?? []
  const picked = new Set(chosen)

  if (allowance === null) return null

  function toggle(index: string) {
    const next = picked.has(index)
      ? chosen.filter((weapon) => weapon !== index)
      : [...chosen, index]

    // `null`, not `[]`: "none chosen" has one spelling, and it is the one the
    // nullable column holds.
    onChange(next.length > 0 ? next : null)
  }

  const full = chosen.length >= allowance

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {chosen.length} of {allowance} weapons chosen
      </p>

      <ul>
        {WEAPONS.all.map((weapon) => {
          const id = `weapon-mastery-${weapon.index}`
          const isPicked = picked.has(weapon.index)
          const mastery = weaponMastery(weapon.index)

          return (
            <li key={weapon.index} className="flex min-h-11 items-center gap-3 px-1">
              <Checkbox
                id={id}
                className="size-5"
                checked={isPicked}
                disabled={full && !isPicked}
                onCheckedChange={() => toggle(weapon.index)}
              />
              <Label htmlFor={id} className="min-h-11 flex-1 items-center text-sm font-normal">
                <span>
                  {weapon.name}
                  {mastery ? (
                    <span className="text-muted-foreground text-xs"> · {mastery.name}</span>
                  ) : null}
                </span>
              </Label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
