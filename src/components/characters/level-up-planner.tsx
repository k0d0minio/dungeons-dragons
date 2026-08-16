'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { formatModifier, formatReferenceIndex } from '@/lib/characters/display'
import {
  hasAdjustedSpellSlots,
  levelledSpellSlots,
  planHitPoints,
  spellAllowanceChanges,
  spellSlotsWouldChange,
  type HitPointMethod,
} from '@/lib/characters/level-up'
import {
  averageHitDieRoll,
  hitDie,
  MAX_CHARACTER_LEVEL,
  MIN_CHARACTER_LEVEL,
  proficiencyBonus,
} from '@/lib/characters/rules'
import type { Character } from '@/lib/db/characters'
import { useClasses, useClassLevels } from '@/lib/dnd-api/swr-hooks'
import { cn } from '@/lib/utils'

import { SpellPicker } from './spell-picker'

/** A before → after row: the shape almost everything on this screen has. */
function Change({
  label,
  from,
  to,
  suffix,
}: {
  label: string
  from: string | number
  to: string | number
  suffix?: string
}) {
  const moved = String(from) !== String(to)

  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <span className="shrink-0 text-sm tabular-nums">
        <span className={cn(moved && 'text-muted-foreground line-through')}>{from}</span>
        {moved ? <span className="font-semibold"> → {to}</span> : null}
        {suffix ? <span className="text-muted-foreground"> {suffix}</span> : null}
      </span>
    </div>
  )
}

/**
 * Levelling a character up, and back down again (DND-032).
 *
 * A between-sessions builder, not a play surface. Every comparable product puts
 * level-up behind its own door — D&D Beyond under "Manage Levels", Demiplane in
 * a separate Character Builder — because it is a thing you do at a kitchen
 * table with the book open, not one-handed in dim light mid-combat. So this
 * screen is allowed to be a form: several decisions, laid out to be read.
 *
 * What a level change actually moves:
 *
 * - **Proficiency bonus** — nothing to do. It is a pure function of `level`
 *   (`proficiencyBonus`) computed wherever it is shown, so writing the level is
 *   writing the bonus. It appears below as a consequence, not as a field.
 * - **Hit points** — 5e lets you take the average or roll. The average is this
 *   app's default and says so on screen; rolling is a number you type, because
 *   the app does not roll dice (register D8).
 * - **Spell slots** — the standard table for the new level, replacing the old
 *   layout wholesale so warlock pact magic moves its single pool up a slot
 *   level instead of accumulating pools. Slots a player has adjusted by hand
 *   are never overwritten without being asked.
 * - **Spells known or prepared** — the class tables say how many; which ones is
 *   the player's, so the picker is here and the counts are advice.
 */
export function LevelUpPlanner({ character }: { character: Character }) {
  const router = useRouter()
  const { classes } = useClasses()
  const { levels: classLevels } = useClassLevels(character.classIndex)

  const [targetLevel, setTargetLevel] = useState(character.level)
  const [method, setMethod] = useState<HitPointMethod>('average')
  const [rolls, setRolls] = useState<Record<number, number>>({})
  const [hitPointOverride, setHitPointOverride] = useState<number | null>(null)
  const [knownSpellIndexes, setKnownSpellIndexes] = useState<string[]>([
    ...character.knownSpellIndexes,
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adjustedSlots = hasAdjustedSpellSlots(character)
  // A player who has set their own maxima keeps them unless they say otherwise;
  // everyone else gets the table, which is what they had before the level-up.
  const [replaceSlots, setReplaceSlots] = useState(!adjustedSlots)

  const classLabel =
    classes.find((option) => option.index === character.classIndex)?.name ??
    formatReferenceIndex(character.classIndex)

  const die = hitDie(character.classIndex)
  const plan = planHitPoints(character, targetLevel, method, rolls)
  const maxHitPoints = hitPointOverride ?? plan.to

  const levelChanged = targetLevel !== character.level
  const slotsChange = spellSlotsWouldChange(character, targetLevel)
  const nextSlots = levelledSpellSlots(character, targetLevel)
  const allowances = spellAllowanceChanges(character, targetLevel)

  const spellsChanged = useMemo(() => {
    if (knownSpellIndexes.length !== character.knownSpellIndexes.length) return true
    const before = new Set(character.knownSpellIndexes)
    return knownSpellIndexes.some((index) => !before.has(index))
  }, [character.knownSpellIndexes, knownSpellIndexes])

  const willWriteSlots = replaceSlots && slotsChange
  const hasChanges =
    levelChanged || spellsChanged || willWriteSlots || maxHitPoints !== character.maxHitPoints

  /** Changing how hit points are decided drops a hand-typed maximum. */
  function chooseMethod(next: HitPointMethod) {
    setMethod(next)
    setHitPointOverride(null)
  }

  function chooseLevel(next: number) {
    setTargetLevel(Math.min(MAX_CHARACTER_LEVEL, Math.max(MIN_CHARACTER_LEVEL, next)))
    // A hand-typed maximum was typed for a different level, so it goes; rolls
    // are keyed by the level they were rolled for and survive, which is what
    // nudging the target back and forth expects.
    setHitPointOverride(null)
  }

  async function save() {
    setSaving(true)
    setError(null)

    let response: Response

    try {
      response = await fetch(`/api/characters/${character.id}/level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: targetLevel,
          maxHitPoints,
          // Omitted entirely when the player is keeping their own maxima —
          // the route leaves a column it is not sent alone.
          ...(willWriteSlots ? { spellSlots: nextSlots } : {}),
          ...(spellsChanged ? { knownSpellIndexes } : {}),
        }),
      })
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setSaving(false)
      return
    }

    if (response.ok) {
      router.push(`/characters/${character.id}`)
      router.refresh()
      return
    }

    const body: unknown = await response.json().catch(() => null)
    const payload = (body ?? {}) as { error?: string }

    setError(payload.error ?? `Could not apply the level change (${response.status}).`)
    setSaving(false)
  }

  // Features are the one part of a level-up the static rules tables cannot
  // supply, so they come from the reference API — and their absence is not an
  // error worth blocking on, only a card that says less.
  const gainedFeatures = classLevels
    .filter((row) => !row.subclass && row.level > character.level && row.level <= targetLevel)
    .flatMap((row) => (row.features ?? []).map((feature) => ({ level: row.level, ...feature })))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Level</CardTitle>
          <CardDescription>
            {classLabel} · levelling down works the same way, for a button pressed by mistake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12"
              aria-label="One level lower"
              disabled={targetLevel <= MIN_CHARACTER_LEVEL}
              onClick={() => chooseLevel(targetLevel - 1)}
            >
              −
            </Button>
            <div className="text-center">
              <p className="text-4xl font-bold tabular-nums" aria-live="polite">
                {targetLevel}
              </p>
              <p className="text-muted-foreground text-xs">
                {levelChanged ? `from level ${character.level}` : 'current level'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12"
              aria-label="One level higher"
              disabled={targetLevel >= MAX_CHARACTER_LEVEL}
              onClick={() => chooseLevel(targetLevel + 1)}
            >
              +
            </Button>
          </div>

          {levelChanged ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={() => chooseLevel(character.level)}
              >
                Back to level {character.level}
              </Button>
            </div>
          ) : null}

          <div className="border-t pt-2">
            <Change
              label="Proficiency bonus"
              from={formatModifier(proficiencyBonus(character.level))}
              to={formatModifier(proficiencyBonus(targetLevel))}
            />
            <p className="text-muted-foreground text-xs">
              Derived from level wherever it is shown, so there is nothing to set.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hit points</CardTitle>
          <CardDescription>
            {plan.unknownHitDie
              ? `No hit die on record for ${classLabel} — set the new maximum yourself.`
              : 'Taking the average is the default. Roll instead if your table does — with real dice; type in what they say.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {targetLevel > character.level && die !== null ? (
            <>
              <RadioGroup
                value={method}
                onValueChange={(value) => chooseMethod(value as HitPointMethod)}
                className="gap-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="average" id="hp-average" className="size-5" />
                  <Label htmlFor="hp-average" className="min-h-11 flex-1 items-center font-normal">
                    Take the average — {averageHitDieRoll(die)} per level on a d{die}
                    <span className="text-muted-foreground"> (default)</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="rolled" id="hp-rolled" className="size-5" />
                  <Label htmlFor="hp-rolled" className="min-h-11 flex-1 items-center font-normal">
                    I rolled — enter each d{die}
                  </Label>
                </div>
              </RadioGroup>

              {method === 'rolled' ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {plan.perLevel.map((entry) => (
                    <div key={entry.level} className="space-y-1.5">
                      <Label htmlFor={`roll-${entry.level}`}>Level {entry.level}</Label>
                      <Input
                        id={`roll-${entry.level}`}
                        type="number"
                        inputMode="numeric"
                        className="h-11"
                        min={1}
                        max={die}
                        placeholder={String(averageHitDieRoll(die))}
                        value={Number.isFinite(rolls[entry.level]) ? rolls[entry.level] : ''}
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value, 10)
                          setHitPointOverride(null)
                          setRolls((current) => ({ ...current, [entry.level]: value }))
                        }}
                      />
                      <p className="text-muted-foreground text-xs">+{entry.hitPoints} HP</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="maxHitPoints">New maximum hit points</Label>
            <Input
              id="maxHitPoints"
              type="number"
              inputMode="numeric"
              className="h-11"
              min={1}
              max={999}
              value={Number.isFinite(maxHitPoints) ? maxHitPoints : ''}
              onChange={(event) => setHitPointOverride(Number.parseInt(event.target.value, 10))}
            />
            <p className="text-muted-foreground text-xs">
              {hitPointOverride !== null
                ? 'Your number — the rules above are not overwriting it.'
                : targetLevel < character.level
                  ? 'Levelling down takes the average back off per level, because what was rolled at the time is not recorded. Type the real number if you have it.'
                  : 'Worked out from the rules above. Type over it if your table does something else.'}
            </p>
          </div>

          <Change label="Maximum" from={plan.from} to={maxHitPoints} suffix="HP" />
          {character.currentHitPoints > maxHitPoints ? (
            <p className="text-muted-foreground text-xs">
              Current hit points come down to {maxHitPoints} with the maximum.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {Object.keys(nextSlots).length > 0 || Object.keys(character.spellSlots).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spell slots</CardTitle>
            <CardDescription>
              The standard table for a level {targetLevel} {classLabel}. Slots you have already
              spent stay spent — levelling up is not a rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {adjustedSlots ? (
              <div className="border-primary/40 bg-muted/40 space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Your slots do not match the standard table.</p>
                <p className="text-muted-foreground text-sm">
                  They were adjusted on the sheet, so this level-up leaves them alone unless you say
                  otherwise — pact magic, a third-caster subclass or a DM&rsquo;s ruling all live
                  outside these tables.
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="replaceSlots"
                    checked={replaceSlots}
                    onCheckedChange={setReplaceSlots}
                  />
                  <Label
                    htmlFor="replaceSlots"
                    className="min-h-11 flex-1 items-center font-normal"
                  >
                    Replace them with the standard table
                  </Label>
                </div>
              </div>
            ) : null}

            <div>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9]
                .filter(
                  (level) =>
                    character.spellSlots[String(level)] !== undefined ||
                    nextSlots[String(level)] !== undefined,
                )
                .map((level) => (
                  <Change
                    key={level}
                    label={`Level ${level} slots`}
                    from={character.spellSlots[String(level)]?.max ?? 0}
                    to={
                      replaceSlots
                        ? (nextSlots[String(level)]?.max ?? 0)
                        : (character.spellSlots[String(level)]?.max ?? 0)
                    }
                  />
                ))}
            </div>

            {!slotsChange && !adjustedSlots ? (
              <p className="text-muted-foreground text-xs">
                No change at this level — the table gives the same slots.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {allowances.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spells</CardTitle>
            <CardDescription>
              What the class tables entitle a level {targetLevel} {classLabel} to. Which spells is
              yours to choose — pick the new ones here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              {allowances.map((allowance) => (
                <Change
                  key={allowance.key}
                  label={allowance.label}
                  from={allowance.from}
                  to={allowance.to}
                />
              ))}
            </div>

            <SpellPicker
              classIndex={character.classIndex}
              classLabel={classLabel}
              value={knownSpellIndexes}
              onChange={setKnownSpellIndexes}
            />
          </CardContent>
        </Card>
      ) : null}

      {gainedFeatures.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What you gain</CardTitle>
            <CardDescription>
              From the SRD class table. Subclass features are not tracked yet — check your subclass
              separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {gainedFeatures.map((feature) => (
                <li key={`${feature.level}-${feature.index}`} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground w-14 shrink-0 tabular-nums">
                    Level {feature.level}
                  </span>
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          className="h-11 flex-1"
          disabled={saving || !hasChanges || !Number.isFinite(maxHitPoints) || maxHitPoints < 1}
          onClick={save}
        >
          {saving
            ? 'Applying…'
            : levelChanged
              ? `Apply level ${targetLevel}`
              : 'Save these changes'}
        </Button>
      </div>
      {!hasChanges ? (
        <p className="text-muted-foreground text-xs">
          Nothing to apply yet — change the level above.
        </p>
      ) : null}
    </div>
  )
}
