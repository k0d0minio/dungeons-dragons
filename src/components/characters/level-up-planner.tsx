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
  applyAsiChoice,
  featureGains,
  hasAdjustedSpellSlots,
  levelledSpellSlots,
  planAsi,
  planHitPoints,
  planSubclass,
  spellAllowanceChanges,
  spellSlotsWouldChange,
  type HitPointMethod,
} from '@/lib/characters/level-up'
import {
  ABILITIES,
  averageHitDieRoll,
  hitDie,
  MAX_CHARACTER_LEVEL,
  MIN_CHARACTER_LEVEL,
  proficiencyBonus,
  spellPreparationModel,
  type AbilityKey,
} from '@/lib/characters/rules'
import type { AsiChoice, Character } from '@/lib/db/schema'
import { CLASSES } from '@/lib/srd/classes'
import { GENERAL_FEATS } from '@/lib/srd/feats'
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
 * The choice for one ASI level: +2/+1+1 to ability scores (the recommended
 * default, for the beginner) or a general feat behind a toggle, mirroring the
 * way the wizard's spell picker is scoped out of the default flow.
 *
 * Ability-score increases are steppers over the six abilities. The build
 * enforces the two constraints the rule cares about — two points spent total,
 * and a score never climbing past 20 — by disabling the buttons that would
 * break either, rather than letting an invalid combination through and failing
 * at the wire.
 */
function AsiLevelCard({
  level,
  current,
  value,
  onChange,
}: {
  level: number
  current: Pick<
    Character,
    'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'
  >
  value: AsiChoice | undefined
  onChange: (choice: AsiChoice) => void
}) {
  const isFeat = value?.type === 'feat'
  const abilities = value?.type === 'asi' ? value.abilities : {}
  const spent = Object.values(abilities).reduce((total, increment) => total + (increment ?? 0), 0)

  function setAbility(key: AbilityKey, increment: number) {
    const next: Partial<Record<AbilityKey, number>> = { ...abilities }
    if (increment === 0) delete next[key]
    else next[key] = increment
    onChange({ type: 'asi', abilities: next })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Level {level}: ability score increase or feat</CardTitle>
        <CardDescription>
          The 2024 rules grant +2 to one ability, +1 to two — or one general feat in their place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id={`asi-feat-${level}`}
            checked={isFeat}
            onCheckedChange={(takeFeat) =>
              onChange(
                takeFeat
                  ? { type: 'feat', featIndex: GENERAL_FEATS.indexes[0] }
                  : { type: 'asi', abilities: {} },
              )
            }
          />
          <Label htmlFor={`asi-feat-${level}`} className="min-h-11 flex-1 items-center font-normal">
            Take a feat instead of increasing ability scores
          </Label>
        </div>

        {isFeat ? (
          <RadioGroup
            value={value.type === 'feat' ? value.featIndex : undefined}
            onValueChange={(featIndex) => onChange({ type: 'feat', featIndex })}
            className="gap-2"
          >
            {GENERAL_FEATS.all.map((feat) => (
              <div key={feat.index} className="flex items-start gap-3">
                <RadioGroupItem
                  value={feat.index}
                  id={`feat-${level}-${feat.index}`}
                  className="mt-0.5 size-5"
                />
                <Label htmlFor={`feat-${level}-${feat.index}`} className="font-normal">
                  <span className="block font-medium">{feat.name}</span>
                  <span className="text-muted-foreground block text-sm">{feat.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="space-y-1">
            {ABILITIES.map((ability) => {
              const increment = abilities[ability.key] ?? 0
              const atCap = current[ability.key] + increment >= 20

              return (
                <div key={ability.key} className="flex items-center gap-3 py-1">
                  <span className="w-28 shrink-0 text-sm">{ability.label}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={increment <= 0}
                    onClick={() => setAbility(ability.key, increment - 1)}
                    aria-label={`Decrease ${ability.label}`}
                  >
                    −
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">{increment}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={atCap || spent >= 2}
                    onClick={() => setAbility(ability.key, increment + 1)}
                    aria-label={`Increase ${ability.label}`}
                  >
                    +
                  </Button>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {current[ability.key]} → {Math.min(20, current[ability.key] + increment)}
                  </span>
                </div>
              )
            })}
            <p className="text-muted-foreground pt-1 text-xs">
              {spent === 2
                ? '2 of 2 points spent.'
                : `${2 - spent} point${2 - spent === 1 ? '' : 's'} left — +2 to one ability or +1 to two.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
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
 * - **The subclass** — 2024 gives every class its subclass at level 3, so a
 *   change that crosses 3 has one more thing to say, and the SRD publishes
 *   exactly one subclass per class, so what it says is a confirmation with the
 *   features spelled out rather than a menu.
 * - **ASI or feat** — each ASI level this change crosses (4/8/12/16; a fighter
 *   also 6/14, a rogue also 10) asks for the 2024 choice: +2/+1+1 to ability
 *   scores (recommended, for the beginner) or a general feat behind a toggle.
 *   The scores it moves are written with the change; a feat is recorded by
 *   name. Either way it respects the 20 cap.
 * - **Spells prepared** — the class tables say how many; which ones is the
 *   player's, and where they choose them depends on the class: a wizard adds to
 *   their spellbook here, everyone else prepares from the class list on the
 *   sheet, at dawn.
 */
export function LevelUpPlanner({ character }: { character: Character }) {
  const router = useRouter()
  // Local SRD data — the twelve classes are already in this bundle.
  const classes = CLASSES.all

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

  // Working copy of the ASI choices. Seeded from the stored record so a choice
  // made on an earlier visit survives a partial save and re-render.
  const [asi, setAsi] = useState<Record<string, AsiChoice>>(() => ({
    ...character.asiChoices,
  }))

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
  const subclass = planSubclass(character, targetLevel)
  // Only the wizard picks spells on this screen: their spellbook is a stored
  // list that grows two a level. Every other 2024 caster prepares from their
  // class list at dawn, on the sheet, so a picker here would write a column
  // that means nothing to them.
  const picksSpellsHere = spellPreparationModel(character.classIndex) === 'spellbook'

  // The ASI levels this change crosses that have no choice recorded yet.
  const pendingAsi = useMemo(() => planAsi(character, targetLevel), [character, targetLevel])

  // Every pending level needs a complete choice before the change may save: an
  // ASI with both points spent, or a feat picked.
  const asiComplete = pendingAsi.every((step) => {
    const choice = asi[String(step.level)]
    if (!choice) return false
    if (choice.type === 'feat') return true
    return Object.values(choice.abilities).reduce((total, increment) => total + (increment ?? 0), 0) === 2
  })
  const asiNeedsInput = pendingAsi.length > 0 && !asiComplete
  const asiChanged = pendingAsi.length > 0 && asiComplete

  // The ability scores this change leaves the character on. The current scores
  // already reflect every choice stored in `character.asiChoices`, so this new
  // change folds only the *pending* levels' choices on top — a stored choice is
  // never applied twice. Each increase is capped at 20 by `applyAsiChoice`.
  const nextScores = useMemo(() => {
    const initial: Record<AbilityKey, number> = {
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
    }
    const pendingLevels = new Set(pendingAsi.map((step) => String(step.level)))
    return Object.entries(asi).reduce((scores, [level, choice]) => {
      if (!pendingLevels.has(level) || choice.type !== 'asi') return scores
      return applyAsiChoice(scores, choice.abilities)
    }, initial)
  }, [asi, character, pendingAsi])

  // The scores that actually move, for the wire: only these keys are sent.
  const scoresPatch = useMemo(() => {
    const changed: Partial<Record<AbilityKey, number>> = {}
    for (const ability of ABILITIES) {
      const next = nextScores[ability.key]
      if (next !== character[ability.key]) changed[ability.key] = next
    }
    return changed
  }, [nextScores, character])

  const spellsChanged = useMemo(() => {
    if (knownSpellIndexes.length !== character.knownSpellIndexes.length) return true
    const before = new Set(character.knownSpellIndexes)
    return knownSpellIndexes.some((index) => !before.has(index))
  }, [character.knownSpellIndexes, knownSpellIndexes])

  const willWriteSlots = replaceSlots && slotsChange
  const hasChanges =
    levelChanged ||
    spellsChanged ||
    willWriteSlots ||
    maxHitPoints !== character.maxHitPoints ||
    asiChanged

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
          // ASI choices plus the score columns they move, only when this change
          // crosses an ASI level and every crossed level has a complete choice.
          ...(asiChanged ? { asiChoices: asi, ...scoresPatch } : {}),
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

  // Features come from the local SRD 5.2.1 data rather than the reference API:
  // `/api/2024/classes/{index}/levels` is a 404 upstream, and the 2014 rows it
  // used to read have no subclass features a 2024 character could use.
  const gainedFeatures = featureGains(character, targetLevel)

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

      {subclass?.chosenNow ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subclass</CardTitle>
            <CardDescription>
              Level {subclass.level} is where every 2024 class takes its subclass — this is that
              level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subclass.options.length > 0 ? (
              subclass.options.map((option) => (
                <div key={option.index} className="space-y-1">
                  <p className="text-sm font-medium">{option.name}</p>
                  {option.summary ? (
                    <p className="text-muted-foreground text-sm">{option.summary}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No subclass on record for {classLabel} — check your book.
              </p>
            )}
            {subclass.options.length === 1 ? (
              <p className="text-muted-foreground text-xs">
                The one the SRD publishes for {classLabel}. Its features are in &ldquo;What you
                gain&rdquo; below; anything else your table allows is a conversation with your DM.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {pendingAsi.map((step) => (
        <AsiLevelCard
          key={step.level}
          level={step.level}
          current={character}
          value={asi[String(step.level)]}
          onChange={(choice) => setAsi((current) => ({ ...current, [String(step.level)]: choice }))}
        />
      ))}

      {allowances.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spells</CardTitle>
            <CardDescription>
              What the class tables entitle a level {targetLevel} {classLabel} to.
              {picksSpellsHere
                ? ' Which spells go in the book is yours to choose — pick the new ones here.'
                : ' Which spells you prepare is chosen on the sheet, and changes after every long rest.'}
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

            {picksSpellsHere ? (
              <SpellPicker
                classIndex={character.classIndex}
                classLabel={classLabel}
                value={knownSpellIndexes}
                onChange={setKnownSpellIndexes}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {gainedFeatures.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What you gain</CardTitle>
            <CardDescription>
              From the SRD 5.2.1 class table, subclass features included from level{' '}
              {subclass?.level ?? 3}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {gainedFeatures.map((feature) => (
                <li key={`${feature.level}-${feature.name}`} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground w-14 shrink-0 tabular-nums">
                    Level {feature.level}
                  </span>
                  <span>
                    {feature.name}
                    {feature.subclass ? (
                      <span className="text-muted-foreground"> · subclass</span>
                    ) : null}
                  </span>
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
          disabled={
            saving ||
            !hasChanges ||
            asiNeedsInput ||
            !Number.isFinite(maxHitPoints) ||
            maxHitPoints < 1
          }
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
