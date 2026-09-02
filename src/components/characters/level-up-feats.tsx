'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import {
  abilityScoresOf,
  applyAbilityIncreases,
  clampIncreases,
  increasePoints,
  planFeats,
  type AbilityScoreFields,
  type FeatStep,
} from '@/lib/characters/level-up'
import {
  ABILITIES,
  ABILITY_SCORE_IMPROVEMENT_INDEX,
  ABILITY_SCORE_IMPROVEMENT_POINTS,
  FEATS,
  MAX_ABILITY_SCORE,
  type AbilityKey,
  type AbilityScores,
} from '@/lib/characters/rules'
import type { AbilityIncreases, LevelFeat } from '@/lib/db/schema'

import { ReferenceSelect } from './reference-select'

/** The two shapes an Ability Score Improvement comes in. */
export type FeatSpread = 'plus-two' | 'one-and-one'

/**
 * One feat level as the screen holds it, before it becomes a {@link LevelFeat}.
 *
 * `featIndex` is the advanced branch: `null` means the level is taking the
 * ability increase, which is the Ability Score Improvement feat and so still a
 * feat when it is written down (`src/lib/db/schema.ts`).
 */
export interface FeatSelection {
  spread: FeatSpread
  /** The +2, or the first +1; and the second +1 when the spread wants one. */
  abilities: [AbilityKey | null, AbilityKey | null]
  featIndex: string | null
}

const ABILITY_KEYS = ABILITIES.map((ability) => ability.key)

const ABILITY_LABELS: Readonly<Record<AbilityKey, string>> = Object.fromEntries(
  ABILITIES.map((ability) => [ability.key, ability.label]),
) as Record<AbilityKey, string>

/** The abilities an increase can still be spent on — everything below the cap. */
export function spendableAbilities(scores: AbilityScores): AbilityKey[] {
  return ABILITY_KEYS.filter((key) => scores[key] < MAX_ABILITY_SCORE)
}

/**
 * The selection a level opens on: the recommendation the rules layer derived
 * from the class, unpacked into the two controls that can edit it.
 *
 * A pre-filled default rather than a "recommended" radio option of its own, so
 * there is one thing on screen to change rather than two — and so the player
 * can see *what* is being recommended without choosing it first.
 */
export function defaultFeatSelection(step: FeatStep): FeatSelection {
  const chosen = ABILITY_KEYS.filter((key) => (step.recommended[key] ?? 0) > 0)
  const spread: FeatSpread =
    (step.recommended[chosen[0] as AbilityKey] ?? 0) === ABILITY_SCORE_IMPROVEMENT_POINTS
      ? 'plus-two'
      : 'one-and-one'

  return { spread, abilities: [chosen[0] ?? null, chosen[1] ?? null], featIndex: null }
}

/** What a selection adds to the scores — nothing at all when it is a feat. */
export function selectionIncreases(selection: FeatSelection): AbilityIncreases {
  const [first, second] = selection.abilities

  if (selection.featIndex !== null || first === null) return {}

  if (selection.spread === 'plus-two') return { [first]: ABILITY_SCORE_IMPROVEMENT_POINTS }

  // A second score that was never chosen — or that is the first one again —
  // spends one point rather than two. The cap does the same thing to a score
  // sitting on 19, and both are honest: the level is spent either way.
  return second === null || second === first ? { [first]: 1 } : { [first]: 1, [second]: 1 }
}

/** A selection as the ledger stores it. */
export function selectionToLevelFeat(step: FeatStep, selection: FeatSelection): LevelFeat {
  if (selection.featIndex !== null) return { level: step.level, featIndex: selection.featIndex }

  const increases = selectionIncreases(selection)

  return {
    level: step.level,
    featIndex: ABILITY_SCORE_IMPROVEMENT_INDEX,
    ...(increasePoints(increases) > 0 ? { increases } : {}),
  }
}

/** One feat level, resolved: what is chosen there and what the scores are under it. */
export interface PlannedFeatLevel {
  step: FeatStep
  selection: FeatSelection
  choice: LevelFeat
  /** The scores as this level finds them — the earlier levels of the same change applied. */
  scores: AbilityScores
}

/**
 * Every feat level a change crosses, with the player's choices layered over the
 * class's recommendations.
 *
 * A plain function rather than something the screen computes inline, because
 * the levels are cumulative: a +2 taken at 4th is what 8th's cap has to work
 * under, and that running total is a loop the React Compiler will not have
 * inside a component.
 */
export function planFeatSelections(
  character: AbilityScoreFields & { classIndex: string; level: number },
  targetLevel: number,
  selections: Readonly<Record<number, FeatSelection>>,
): PlannedFeatLevel[] {
  let scores = abilityScoresOf(character)

  return planFeats(character, targetLevel).map((step) => {
    const selection = selections[step.level] ?? defaultFeatSelection(step)
    const choice = selectionToLevelFeat(step, selection)
    const before = scores

    scores = applyAbilityIncreases(before, clampIncreases(before, choice.increases ?? {}))

    return { step, selection, choice, scores: before }
  })
}

/** "+2 Intelligence", "+1 Dexterity and +1 Wisdom" — a spread in words. */
export function describeIncreases(increases: AbilityIncreases): string {
  const parts = ABILITY_KEYS.filter((key) => (increases[key] ?? 0) > 0).map(
    (key) => `+${increases[key]} ${ABILITY_LABELS[key]}`,
  )

  return parts.length === 0 ? 'nothing left to raise' : parts.join(' and ')
}

/**
 * The prompt for one Ability Score Improvement level (SRD 5.2.1).
 *
 * The shape the ticket asks for, and the one the creation flow already uses:
 * the increase is the default and is fully visible, while the feats sit behind
 * a toggle. That is not a judgement about feats — it is about who is at this
 * table. A first character's 4th level arrives right after the starter box
 * ends, and "+2 Intelligence, because you are a Wizard" is a decision a
 * beginner can make in a second, where seventeen feats is a decision they
 * cannot make at all without reading all of them.
 */
export function FeatChoiceCard({
  step,
  scores,
  selection,
  classLabel,
  onChange,
}: {
  step: FeatStep
  /** The scores as this level finds them — earlier levels in the same change applied. */
  scores: AbilityScores
  selection: FeatSelection
  classLabel: string
  onChange: (selection: FeatSelection) => void
}) {
  const spendable = spendableAbilities(scores)
  const options = spendable.map((key) => ({ index: key, name: ABILITY_LABELS[key] }))
  const [first, second] = selection.abilities
  const takingFeat = selection.featIndex !== null
  const feat = takingFeat ? FEATS.get(selection.featIndex ?? '') : null
  const increases = selectionIncreases(selection)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {step.epicBoon ? 'Epic Boon' : 'Ability Score Improvement'}
        </CardTitle>
        <CardDescription>
          Level {step.level} is where a {classLabel} raises two ability points or takes a feat
          instead
          {step.epicBoon ? ', and 19th is the level the Epic Boons open at' : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {takingFeat ? (
          <div className="space-y-2">
            <Label htmlFor={`feat-${step.level}`}>Feat</Label>
            <ReferenceSelect
              id={`feat-${step.level}`}
              placeholder="Choose a feat"
              options={step.feats}
              value={selection.featIndex}
              invalid={false}
              onChange={(value) => onChange({ ...selection, featIndex: value })}
            />
            {feat ? (
              <div className="space-y-1">
                {feat.abilityPrerequisite ? (
                  <p className="text-sm font-medium">Requires {feat.abilityPrerequisite}.</p>
                ) : null}
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {feat.description}
                </p>
              </div>
            ) : null}
            <p className="text-muted-foreground text-xs">
              A feat that also raises a score — Grappler, any Epic Boon — raises it on the character
              form: this screen records the feat, and never edits a score you did not choose here.
            </p>
          </div>
        ) : spendable.length === 0 ? (
          <p className="text-sm">
            Every ability is already at {MAX_ABILITY_SCORE}, so there is nothing left to raise —
            take a feat instead.
          </p>
        ) : (
          <>
            <RadioGroup
              value={selection.spread}
              onValueChange={(value) => onChange({ ...selection, spread: value as FeatSpread })}
              className="gap-3"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="plus-two"
                  id={`asi-${step.level}-plus-two`}
                  className="size-5"
                />
                <Label
                  htmlFor={`asi-${step.level}-plus-two`}
                  className="min-h-11 flex-1 items-center font-normal"
                >
                  +2 to one score
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem
                  value="one-and-one"
                  id={`asi-${step.level}-one-and-one`}
                  className="size-5"
                />
                <Label
                  htmlFor={`asi-${step.level}-one-and-one`}
                  className="min-h-11 flex-1 items-center font-normal"
                >
                  +1 to two scores
                </Label>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`asi-${step.level}-first`}>
                  {selection.spread === 'plus-two' ? '+2 to' : '+1 to'}
                </Label>
                <ReferenceSelect
                  id={`asi-${step.level}-first`}
                  placeholder="Ability"
                  options={options}
                  value={first}
                  invalid={false}
                  onChange={(value) =>
                    onChange({
                      ...selection,
                      // Picking the score already holding the other +1 swaps them
                      // rather than spending both points on one, which is not a
                      // spread the rules have.
                      abilities: [value as AbilityKey, second === value ? first : second],
                    })
                  }
                />
              </div>
              {selection.spread === 'one-and-one' ? (
                <div className="space-y-1.5">
                  <Label htmlFor={`asi-${step.level}-second`}>and +1 to</Label>
                  <ReferenceSelect
                    id={`asi-${step.level}-second`}
                    placeholder="Ability"
                    options={options}
                    value={second}
                    invalid={false}
                    onChange={(value) =>
                      onChange({
                        ...selection,
                        abilities: [first === value ? second : first, value as AbilityKey],
                      })
                    }
                  />
                </div>
              ) : null}
            </div>

            <p className="text-muted-foreground text-xs">
              {describeIncreases(step.recommended)} is what this app suggests for a {classLabel}.
              Nothing may pass {MAX_ABILITY_SCORE}.
            </p>
          </>
        )}

        <div className="flex items-center gap-3 border-t pt-3">
          <Switch
            id={`take-feat-${step.level}`}
            checked={takingFeat}
            onCheckedChange={(checked) =>
              onChange({
                ...selection,
                featIndex: checked ? (step.feats[0]?.index ?? null) : null,
              })
            }
          />
          <Label
            htmlFor={`take-feat-${step.level}`}
            className="min-h-11 flex-1 items-center font-normal"
          >
            Take a feat instead
          </Label>
        </div>

        {!takingFeat && increasePoints(increases) > 0 ? (
          <p className="text-sm" aria-live="polite">
            This level: {describeIncreases(increases)}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
