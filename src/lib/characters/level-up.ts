// What a level change means, in rules (DND-032).
//
// DND-018 made `level` an editable number. This module is the layer that makes
// the number mean something: change it and proficiency bonus, hit points, spell
// slots and the size of a spell list all move with it.
//
// Pure, like `combat.ts` — no fetch, no clock, no React — and imported by both
// sides of the wire: the level-up planner computes a change in the browser and
// posts it, and `POST /api/characters/[id]/level` validates and re-normalises
// the same shape before it reaches the database.
//
// Two things are deliberately *not* here. Proficiency bonus is not written by a
// level change: it is a pure function of `level` (see `proficiencyBonus`) and
// stays computed at render time, so there is nothing to keep in step. And
// nothing picks spells for the player — the class tables say how many a level
// entitles them to, and choosing which is theirs.
//
// The 2024 rules add the one milestone every class shares: **level 3 is the
// subclass**. There is no level-1 Cleric domain and no level-2 Wizard school
// any more, so a planner that used to have nothing to say about subclasses now
// has exactly one thing to say, at exactly one level, for all twelve classes —
// see {@link planSubclass}.
import { z } from 'zod'

import type { AbilityIncreases, Character, LevelFeat, SpellSlotState } from '@/lib/db/schema'
import type { SrdFeat } from '@/lib/srd/types'

import { MAX_SLOTS_PER_LEVEL } from './combat'
import { abilityModifier } from './display'
import { ABILITIES, isAbilityKey, type AbilityKey } from './schema'
import {
  ABILITY_SCORE_IMPROVEMENT_INDEX,
  ABILITY_SCORE_IMPROVEMENT_POINTS,
  averageHitDieRoll,
  clampCharacterLevel,
  EPIC_BOON_LEVEL,
  featLevelsBetween,
  FEATS,
  featuresUpTo,
  hitDie,
  isFeatLevel,
  MAX_FEAT_LEVELS,
  MAX_ABILITY_SCORE,
  MAX_CHARACTER_LEVEL,
  MIN_CHARACTER_LEVEL,
  primaryAbilities,
  spellAllowances,
  standardSpellSlots,
  subclassLevelFor,
  subclassOptions,
  type AbilityScores,
  type FeatureGain,
  type SpellAllowance,
} from './rules'

/** The upper bound `characterFormSchema` puts on a maximum, kept in step here. */
const MAX_HIT_POINTS = 999

/**
 * The columns a level change reads. A `Character` satisfies it; so does the
 * planner's working copy, which is why these functions take this rather than a
 * whole row.
 */
export type LevelChangeFields = Pick<
  Character,
  | 'classIndex'
  | 'subclassIndex'
  | 'level'
  | 'maxHitPoints'
  | 'spellSlots'
  | 'featChoices'
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma'
>

// ---------------------------------------------------------------------------
// Hit points
// ---------------------------------------------------------------------------

/**
 * How the hit points for a level were decided.
 *
 * 5e offers both and prefers neither, so this app has to choose a default and
 * say so: `average` is it. Rolling stays available, but the app never rolls —
 * physical dice are the point of a physical table (register D8), so a rolled
 * level is a number the player types in after rolling one.
 */
export type HitPointMethod = 'average' | 'rolled'

export const DEFAULT_HIT_POINT_METHOD: HitPointMethod = 'average'

/**
 * The hit points one level adds: the hit die — its fixed average, or what the
 * player rolled — plus the Constitution modifier, and never less than 1.
 *
 * That floor is 5e's own: a character with a wretched Constitution still gains
 * a hit point a level rather than shrinking as they advance.
 */
export function hitPointsForLevel(die: number, constitution: number, roll?: number): number {
  const rolled = roll === undefined ? averageHitDieRoll(die) : clampRoll(roll, die)

  return Math.max(1, rolled + abilityModifier(constitution))
}

/** A typed roll as a die can actually produce it. `NaN` from an emptied input falls back to the average. */
function clampRoll(roll: number, die: number): number {
  if (!Number.isFinite(roll)) return averageHitDieRoll(die)

  return Math.min(die, Math.max(1, Math.floor(roll)))
}

export interface HitPointPlan {
  /** The maximum the character has now. */
  from: number
  /** The maximum this change would leave them on. */
  to: number
  /** One entry per level *gained*, in level order. Empty when levelling down. */
  perLevel: Array<{ level: number; die: number; hitPoints: number }>
  /**
   * True when the class's hit die is unknown, so the arithmetic could not be
   * done and `to` is simply `from` — the player has to type the new maximum.
   */
  unknownHitDie: boolean
}

/**
 * What a move to `targetLevel` does to the character's maximum hit points.
 *
 * Levelling down cannot undo what levelling up actually rolled — no history of
 * it is stored — so it takes the average back off per level lost. That is an
 * approximation, and the planner says so and leaves the number editable, which
 * is the honest version of a mistaken tap being undoable.
 */
export function planHitPoints(
  character: LevelChangeFields,
  targetLevel: number,
  method: HitPointMethod = DEFAULT_HIT_POINT_METHOD,
  rolls: Readonly<Record<number, number>> = {},
): HitPointPlan {
  const from = clampCharacterLevel(character.level)
  const to = clampCharacterLevel(targetLevel)
  const die = hitDie(character.classIndex)

  const unchanged: HitPointPlan = {
    from: character.maxHitPoints,
    to: character.maxHitPoints,
    perLevel: [],
    unknownHitDie: die === null,
  }

  if (die === null || to === from) return unchanged

  if (to < from) {
    const perLostLevel = hitPointsForLevel(die, character.constitution)

    return {
      ...unchanged,
      to: Math.max(1, character.maxHitPoints - (from - to) * perLostLevel),
    }
  }

  const perLevel: HitPointPlan['perLevel'] = []

  for (let level = from + 1; level <= to; level += 1) {
    perLevel.push({
      level,
      die,
      hitPoints: hitPointsForLevel(
        die,
        character.constitution,
        method === 'rolled' ? rolls[level] : undefined,
      ),
    })
  }

  const gained = perLevel.reduce((total, entry) => total + entry.hitPoints, 0)

  return {
    ...unchanged,
    to: Math.min(MAX_HIT_POINTS, character.maxHitPoints + gained),
    perLevel,
  }
}

// ---------------------------------------------------------------------------
// Spell slots
// ---------------------------------------------------------------------------

/** The slot levels a stored layout actually has, as string keys. */
function pooledLevels(slots: SpellSlotState): string[] {
  return Object.keys(slots).filter((level) => (slots[level]?.max ?? 0) > 0)
}

/**
 * True when the character's stored slot maxima are something other than what
 * the standard table gives them at the level they are on now.
 *
 * This is the guard that stops a level-up quietly overwriting a player's own
 * numbers. Slot maxima are stored rather than derived precisely because pact
 * magic, a third-caster subclass and a DM's ruling all leave the tables behind
 * (`src/lib/db/schema.ts`), so a sheet that has been adjusted by hand is a
 * legitimate state and not a stale one.
 *
 * A character whose slots have never been set up at all reads as *not*
 * adjusted: there is nothing there to overwrite, so there is nothing to warn
 * about.
 */
export function hasAdjustedSpellSlots(character: LevelChangeFields): boolean {
  const stored = character.spellSlots ?? {}
  const storedLevels = pooledLevels(stored)

  if (storedLevels.length === 0) return false

  const standard = standardSpellSlots(character.classIndex, character.level)
  const standardLevels = Object.keys(standard)

  if (storedLevels.length !== standardLevels.length) return true

  return standardLevels.some((level) => stored[level]?.max !== standard[level].max)
}

/**
 * The slot layout `targetLevel` calls for, keeping what has already been spent.
 *
 * A replacement rather than a merge, and that is the warlock case specifically:
 * pact magic moves its *one* pool up a slot level as the warlock advances — two
 * 3rd-level slots at 5th become two 4th-level slots at 7th — so a merge would
 * leave the 3rd-level pool behind and hand them twice the slots they have.
 * Replacing the layout wholesale is the only shape that is right for both pact
 * magic and the standard table.
 *
 * `used` survives the change where the level still exists, because levelling up
 * between sessions is not a rest: a wizard who has spent two 1st-level slots
 * still has them spent afterwards.
 */
export function levelledSpellSlots(
  character: LevelChangeFields,
  targetLevel: number,
): SpellSlotState {
  const standard = standardSpellSlots(character.classIndex, targetLevel)
  const stored = character.spellSlots ?? {}
  const next: SpellSlotState = {}

  for (const [level, slot] of Object.entries(standard)) {
    next[level] = { max: slot.max, used: Math.min(stored[level]?.used ?? 0, slot.max) }
  }

  return next
}

/** True when applying {@link levelledSpellSlots} would change anything at all. */
export function spellSlotsWouldChange(character: LevelChangeFields, targetLevel: number): boolean {
  const next = levelledSpellSlots(character, targetLevel)
  const stored = character.spellSlots ?? {}
  const levels = new Set([...pooledLevels(stored), ...Object.keys(next)])

  return Array.from(levels).some((level) => stored[level]?.max !== next[level]?.max)
}

// ---------------------------------------------------------------------------
// Spells known and prepared
// ---------------------------------------------------------------------------

export interface AllowanceChange extends Omit<SpellAllowance, 'count'> {
  from: number
  to: number
}

/**
 * How the class tables' spell counts differ between the character's level and
 * `targetLevel` — the "you now prepare nine spells rather than eight" line.
 *
 * A count that exists at one level and not the other reads as zero on the side
 * it is missing from. In the 2024 tables that no longer happens for a paladin
 * or ranger, who cast from level 1; it still does for a character whose class
 * is being read out of a row this build does not recognise.
 */
export function spellAllowanceChanges(
  character: LevelChangeFields,
  targetLevel: number,
): AllowanceChange[] {
  const before = spellAllowances(character.classIndex, character.level)
  const after = spellAllowances(character.classIndex, targetLevel)

  const keys = [...before, ...after].map((allowance) => allowance.key)

  return Array.from(new Set(keys)).map((key) => {
    const previous = before.find((allowance) => allowance.key === key)
    const next = after.find((allowance) => allowance.key === key)
    // One of the two is always defined — the key came from one of the lists.
    const { label } = (next ?? previous) as SpellAllowance

    return { key, label, from: previous?.count ?? 0, to: next?.count ?? 0 }
  })
}

// ---------------------------------------------------------------------------
// The subclass, and what else the level gives (2024)
// ---------------------------------------------------------------------------

/** What a level change has to say about the character's subclass. */
export interface SubclassStep {
  /** The level this class chooses its subclass at — 3 for every 2024 class. */
  level: number
  /** True when this change crosses that level: the choice is being made now. */
  chosenNow: boolean
  /** True when the character was already at or past it before the change. */
  alreadyChosen: boolean
  /**
   * The subclasses the SRD publishes for the class. Exactly one, for all
   * twelve — the other Player's Handbook subclasses are not CC-BY and never
   * enter this data, so the "choice" is a confirmation with the features
   * spelled out rather than a menu.
   */
  options: ReturnType<typeof subclassOptions>
}

/**
 * The subclass milestone for a move to `targetLevel`, or `null` for a class
 * whose subclass level this build does not know.
 *
 * Answered for every move, not only the one that crosses level 3, because the
 * planner needs all three states: not yet (a 1st → 2nd level fighter), now (2nd
 * → 3rd), and long since (5th → 6th). Levelling *down* past 3 reports neither
 * `chosenNow` nor `alreadyChosen`, which is the honest reading of a character
 * who no longer has one.
 */
export function planSubclass(
  character: Pick<LevelChangeFields, 'classIndex' | 'level'>,
  targetLevel: number,
): SubclassStep | null {
  const level = subclassLevelFor(character.classIndex)
  if (level === null) return null

  const from = clampCharacterLevel(character.level)
  const to = clampCharacterLevel(targetLevel)

  return {
    level,
    chosenNow: from < level && to >= level,
    alreadyChosen: from >= level && to >= level,
    options: subclassOptions(character.classIndex),
  }
}

/**
 * The features a move from the character's level to `targetLevel` grants, in
 * level order — class features and, once level 3 is reached, the subclass's.
 *
 * Local SRD 5.2.1 data rather than the reference API, which is what makes
 * subclass features showable at all: `/api/2024/classes/{index}/levels` is a
 * 404 upstream, and the 2014 namespace it used to be read from has no subclass
 * rows a 2024 character could use.
 *
 * The subclass comes off the row (`subclass_index`,
 * `srd-2024-migration/character-model-migration`), falling back to the class's
 * only SRD one for a character who has not recorded theirs yet. The fallback is
 * the assumption this function has always made and it still costs nothing —
 * the SRD publishes exactly one subclass per class — but it is now a fallback
 * rather than the rule, so a row that says which one it is gets listened to.
 *
 * Empty when levelling down: a level change that takes features away has
 * nothing to list under "what you gain".
 */
export function featureGains(
  character: Pick<LevelChangeFields, 'classIndex' | 'subclassIndex' | 'level'>,
  targetLevel: number,
): FeatureGain[] {
  const from = clampCharacterLevel(character.level)
  const to = clampCharacterLevel(targetLevel)
  if (to <= from) return []

  const subclassIndex =
    character.subclassIndex ?? subclassOptions(character.classIndex)[0]?.index ?? null

  return featuresUpTo(character.classIndex, subclassIndex, to)
    .filter((feature) => feature.level > from)
    .sort((a, b) => a.level - b.level)
}

// ---------------------------------------------------------------------------
// Ability Score Improvements and feats (2024)
// ---------------------------------------------------------------------------

/**
 * The scores a set of increases leaves, none of them past 20.
 *
 * The cap is applied here rather than trusted from the caller because this is
 * the function both sides use — the planner to preview the new sheet, the route
 * to write it.
 */
export function applyAbilityIncreases(
  scores: AbilityScores,
  increases: AbilityIncreases,
): AbilityScores {
  const next = { ...scores }

  for (const ability of ABILITIES) {
    const added = increases[ability.key] ?? 0
    if (added > 0) next[ability.key] = Math.min(MAX_ABILITY_SCORE, next[ability.key] + added)
  }

  return next
}

/** The six score columns, which is all most of the arithmetic below reads. */
export type AbilityScoreFields = Pick<
  Character,
  'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'
>

/** The six scores off a character row, as the increase functions want them. */
export function abilityScoresOf(character: AbilityScoreFields): AbilityScores {
  return {
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
  }
}

/** How many points a set of increases spends. */
export function increasePoints(increases: AbilityIncreases): number {
  return ABILITIES.reduce((total, ability) => total + (increases[ability.key] ?? 0), 0)
}

/**
 * The same increases with anything the 20 cap will not take removed — so what
 * is stored is what was actually applied, which is what makes levelling back
 * down subtract the right number.
 */
export function clampIncreases(
  scores: AbilityScores,
  increases: AbilityIncreases,
): AbilityIncreases {
  const clamped: AbilityIncreases = {}

  for (const ability of ABILITIES) {
    const asked = increases[ability.key] ?? 0
    const room = Math.max(0, MAX_ABILITY_SCORE - scores[ability.key])
    const given = Math.min(asked, room)
    if (given > 0) clamped[ability.key] = given
  }

  return clamped
}

/** Abilities with room left under the cap, best score first — where a spare point goes. */
function abilitiesWithRoom(
  scores: AbilityScores,
  exclude: readonly AbilityKey[] = [],
): AbilityKey[] {
  return ABILITIES.map((ability) => ability.key)
    .filter((key) => !exclude.includes(key) && scores[key] < MAX_ABILITY_SCORE)
    .sort((a, b) => scores[b] - scores[a])
}

/**
 * The increase the app suggests at a feat level, derived from the class.
 *
 * The recommendation exists because the audience is beginners: a 4th-level
 * choice between six scores and seventeen feats is where a first character
 * stalls, and "+2 Intelligence, because you are a Wizard" is the answer the
 * table would have given anyway. It is a default, not a rule — every other
 * spread stays one tap away, and the feat list is behind the advanced toggle.
 *
 * How it is derived: the SRD's Primary Ability line for the class. A class that
 * names two with *and* (Monk: Dexterity and Wisdom) gets +1 to each, because
 * both matter; one that names them with *or*, or names one, gets +2 to the
 * score already highest, because a single ability at a higher modifier is what
 * that class's rolls key off. Abilities already at 20 are skipped, and a score
 * at 19 takes +1 with the spare point going to the next best ability rather
 * than being thrown away against the cap.
 */
export function recommendedAbilityIncrease(
  classIndex: string,
  scores: AbilityScores,
): AbilityIncreases {
  const { abilities, join } = primaryAbilities(classIndex)
  const primaries = abilities.filter((ability) => scores[ability] < MAX_ABILITY_SCORE)

  if (join === 'and' && primaries.length >= 2) {
    return { [primaries[0]]: 1, [primaries[1]]: 1 }
  }

  const preferred = [...primaries].sort((a, b) => scores[b] - scores[a])
  const [target] = [...preferred, ...abilitiesWithRoom(scores, abilities)]

  if (target === undefined) return {}

  const room = MAX_ABILITY_SCORE - scores[target]

  if (room >= ABILITY_SCORE_IMPROVEMENT_POINTS)
    return { [target]: ABILITY_SCORE_IMPROVEMENT_POINTS }

  const [spare] = abilitiesWithRoom(scores, [target])

  return spare === undefined ? { [target]: room } : { [target]: room, [spare]: 1 }
}

/** One feat-taking level a change crosses — the whole prompt, ready to render. */
export interface FeatStep {
  /** The class level the choice belongs to. */
  level: number
  /**
   * True at 19th, where the SRD's feature is Epic Boon rather than Ability
   * Score Improvement: the same choice with the Epic Boons added to the list.
   */
  epicBoon: boolean
  /** The feats takeable at this level, Ability Score Improvement first. */
  feats: readonly SrdFeat[]
  /** What the app suggests if the player changes nothing. */
  recommended: AbilityIncreases
}

/**
 * Which feats a character may take at a level: the General feats always, and
 * the Epic Boons once the level allows them.
 *
 * Origin feats are a background's to grant and Fighting Style feats a class
 * feature's, so neither is on this list however high the level — offering them
 * here would let a Rogue take Archery at 8th, which is not a rule 5e has.
 */
export function featsTakeableAt(level: number): readonly SrdFeat[] {
  return FEATS.all
    .filter(
      (feat) =>
        (feat.category === 'general' || feat.category === 'epic-boon') &&
        feat.minimumLevel <= clampCharacterLevel(level),
    )
    .sort((a, b) => {
      // The Ability Score Improvement leads: it is the recommended default, and
      // a list that opens on it is a list that reads as "or, instead…".
      if (a.index === ABILITY_SCORE_IMPROVEMENT_INDEX) return -1
      if (b.index === ABILITY_SCORE_IMPROVEMENT_INDEX) return 1
      return a.name.localeCompare(b.name)
    })
}

/**
 * The feat levels a move to `targetLevel` crosses, in level order.
 *
 * Empty when nothing is crossed — including every level change a low-level
 * character makes, which is the common case and the reason this returns a list
 * rather than a nullable step: the planner renders nothing at all rather than
 * an empty card.
 *
 * Recommendations are computed cumulatively, so a 3rd → 12th-level jump does
 * not suggest the same +2 four times over a score that would have passed 20 on
 * the second.
 */
export function planFeats(
  character: AbilityScoreFields & Pick<LevelChangeFields, 'classIndex' | 'level'>,
  targetLevel: number,
): FeatStep[] {
  let scores = abilityScoresOf(character)

  return featLevelsBetween(character.classIndex, character.level, targetLevel).map((level) => {
    const recommended = recommendedAbilityIncrease(character.classIndex, scores)
    scores = applyAbilityIncreases(scores, recommended)

    return {
      level,
      epicBoon: level >= EPIC_BOON_LEVEL,
      feats: featsTakeableAt(level),
      recommended,
    }
  })
}

/**
 * The feat entries a character keeps at `targetLevel`: everything recorded at a
 * level they still have, and nothing else.
 *
 * Levelling down gives a feat back, which is the one place this app can undo a
 * level-up exactly — unlike hit points, the increase that was applied is on
 * record, so the subtraction is the addition and not an average of it.
 */
export function featChoicesAt(
  stored: readonly LevelFeat[],
  classIndex: string,
  targetLevel: number,
): LevelFeat[] {
  const level = clampCharacterLevel(targetLevel)

  return stored
    .filter((choice) => choice.level <= level && isFeatLevel(classIndex, choice.level))
    .sort((a, b) => a.level - b.level)
}

/**
 * The scores a level change leaves once its feat choices are applied — the
 * planner's preview of the sheet it is about to write.
 *
 * Deliberately the same arithmetic the route runs: entries the character
 * already had are left alone, entries at levels being given back are subtracted,
 * and new ones are added under the cap.
 */
export function abilityScoresAfterFeats(
  character: LevelChangeFields,
  choices: readonly LevelFeat[] | undefined,
  targetLevel: number,
): AbilityScores {
  return reconcileFeatChoices(character, choices, targetLevel).scores
}

/** What {@link reconcileFeatChoices} works out: the ledger and the scores it leaves. */
interface FeatReconciliation {
  /** The entries to store, with every increase clamped to what was applied. */
  choices: LevelFeat[]
  /** The character's scores after the additions and subtractions. */
  scores: AbilityScores
  /** True when either the ledger or the scores differ from the stored row. */
  changed: boolean
}

/**
 * Reconcile a proposed set of feat choices against what the row already has.
 *
 * The rule that makes this safe on a row written before the column existed: the
 * stored list is the ledger of what this app *applied*, so only entries that
 * enter it are added to the scores and only entries that leave it are taken
 * back. A 12th-level character with no recorded history has nothing subtracted
 * when they drop to 11th — the app never added it.
 *
 * The proposal *adds* to that ledger rather than replacing it: an entry at a
 * level already on record is ignored in favour of what is stored, and an entry
 * missing from the proposal is not a removal. The planner only ever offers the
 * levels a change is crossing now, so a body that omits an old level is a
 * client that has lost its place — and honouring it would take back an increase
 * the sheet has been showing for weeks. The one thing that does remove entries
 * is the level itself dropping below them.
 */
function reconcileFeatChoices(
  character: LevelChangeFields,
  proposed: readonly LevelFeat[] | undefined,
  targetLevel: number,
): FeatReconciliation {
  const stored = featChoicesAt(
    character.featChoices ?? [],
    character.classIndex,
    MAX_CHARACTER_LEVEL,
  )
  const added = (proposed ?? []).filter(
    (choice) => !stored.some((existing) => existing.level === choice.level),
  )
  const kept = featChoicesAt([...stored, ...added], character.classIndex, targetLevel)
  const byLevel = new Map(stored.map((choice) => [choice.level, choice]))

  let scores = abilityScoresOf(character)

  // Given back first, so a score freed by a level lost has room for one gained.
  for (const choice of stored) {
    if (kept.some((entry) => entry.level === choice.level)) continue

    for (const ability of ABILITIES) {
      const points = choice.increases?.[ability.key] ?? 0
      if (points > 0) scores[ability.key] = Math.max(1, scores[ability.key] - points)
    }
  }

  const choices: LevelFeat[] = []

  for (const entry of kept) {
    const existing = byLevel.get(entry.level)

    if (existing) {
      choices.push(existing)
      continue
    }

    const increases = clampIncreases(scores, entry.increases ?? {})
    scores = applyAbilityIncreases(scores, increases)
    choices.push({
      level: entry.level,
      featIndex: entry.featIndex,
      ...(increasePoints(increases) > 0 ? { increases } : {}),
    })
  }

  const changed =
    JSON.stringify(choices) !== JSON.stringify(character.featChoices ?? []) ||
    ABILITIES.some((ability) => scores[ability.key] !== character[ability.key])

  return { choices, scores, changed }
}

// ---------------------------------------------------------------------------
// The wire contract
// ---------------------------------------------------------------------------

const slotPool = z.object({
  max: z.number().int().min(0).max(MAX_SLOTS_PER_LEVEL),
  used: z.number().int().min(0).max(MAX_SLOTS_PER_LEVEL),
})

/**
 * What `POST /api/characters/[id]/level` accepts.
 *
 * Its own shape rather than a third branch of the `PATCH` discriminator: a
 * level change is the one edit that spans both halves of the row — `level` and
 * `maxHitPoints` are build fields the DND-018 form owns, `spellSlots` is live
 * session state the sheet owns — and mixing those keys is exactly what `PATCH`
 * refuses on purpose. One route, one write, no ambiguity about which schema a
 * body meant.
 *
 * Slots and spells are optional because a level change need not touch them: a
 * fighter has no slots, and a player who has adjusted their own maxima keeps
 * them by leaving `spellSlots` out.
 */
const LEVEL_MESSAGE = `Level must be a whole number between ${MIN_CHARACTER_LEVEL} and ${MAX_CHARACTER_LEVEL}`
const HIT_POINTS_MESSAGE = `Max HP must be a whole number between 1 and ${MAX_HIT_POINTS}`

const INCREASE_MESSAGE = `An Ability Score Improvement adds ${ABILITY_SCORE_IMPROVEMENT_POINTS} points: +${ABILITY_SCORE_IMPROVEMENT_POINTS} to one score or +1 to two`

/**
 * One feat taken at a level, as the browser sends it.
 *
 * The increases are bounded here but not capped here: whether +2 Strength fits
 * under 20 depends on the row, which zod cannot see, so
 * {@link normaliseLevelChange} clamps them against the stored scores — the same
 * division of labour `maxHitPoints` already has.
 */
const levelFeatSchema = z
  .strictObject({
    level: z
      .number()
      .int(LEVEL_MESSAGE)
      .min(MIN_CHARACTER_LEVEL, LEVEL_MESSAGE)
      .max(MAX_CHARACTER_LEVEL, LEVEL_MESSAGE),
    featIndex: z.string().refine((index) => FEATS.has(index), 'That is not a feat this app knows'),
    increases: z
      // Partial, because a spread names one or two of the six abilities — a
      // plain record of an ability key demands all six.
      .partialRecord(
        z.string().refine(isAbilityKey, 'That is not an ability'),
        z
          .number()
          .int(INCREASE_MESSAGE)
          .min(1, INCREASE_MESSAGE)
          .max(ABILITY_SCORE_IMPROVEMENT_POINTS, INCREASE_MESSAGE),
      )
      .optional(),
  })
  .refine(
    (choice) =>
      Object.values(choice.increases ?? {}).reduce((total, points) => total + points, 0) <=
      ABILITY_SCORE_IMPROVEMENT_POINTS,
    INCREASE_MESSAGE,
  )

export const levelChangeSchema = z.strictObject({
  level: z
    .number({ error: LEVEL_MESSAGE })
    .int(LEVEL_MESSAGE)
    .min(MIN_CHARACTER_LEVEL, LEVEL_MESSAGE)
    .max(MAX_CHARACTER_LEVEL, LEVEL_MESSAGE),
  maxHitPoints: z
    .number({ error: HIT_POINTS_MESSAGE })
    .int(HIT_POINTS_MESSAGE)
    .min(1, HIT_POINTS_MESSAGE)
    .max(MAX_HIT_POINTS, HIT_POINTS_MESSAGE),
  spellSlots: z
    .record(z.string().regex(/^[1-9]$/, 'Spell levels run from 1 to 9'), slotPool)
    .optional(),
  knownSpellIndexes: z
    .array(z.string().min(1))
    .max(400, 'That is more spells than the reference data has')
    .optional(),
  featChoices: z
    .array(levelFeatSchema)
    .max(MAX_FEAT_LEVELS, 'That is more feat levels than any class has')
    .optional(),
})

export type LevelChange = z.infer<typeof levelChangeSchema>

/**
 * A level change as the database takes it: current hit points clamped against
 * the new maximum, and the ability scores an Ability Score Improvement moved.
 */
export type LevelChangePatch = Omit<LevelChange, 'featChoices'> & {
  currentHitPoints?: number
  featChoices?: LevelFeat[]
} & Partial<AbilityScores>

/**
 * Bring a validated level change into line with the character it applies to.
 *
 * The same job {@link normaliseCharacterPatch} does for an edit, for the same
 * reason: zod knows the bounds 5e defines, only the stored row knows this
 * wizard is standing at 24 hit points. Levelling down lowers the maximum, and a
 * sheet rendering "24/12" is a state no combat transition can produce.
 */
export function normaliseLevelChange(change: LevelChange, character: Character): LevelChangePatch {
  const { featChoices, ...rest } = change
  const normalised: LevelChangePatch = { ...rest }

  if (character.currentHitPoints > change.maxHitPoints) {
    normalised.currentHitPoints = change.maxHitPoints
  }

  if (change.spellSlots !== undefined) {
    const slots: SpellSlotState = {}

    for (const [level, slot] of Object.entries(change.spellSlots)) {
      if (slot.max > 0) slots[level] = { max: slot.max, used: Math.min(slot.used, slot.max) }
    }

    normalised.spellSlots = slots
  }

  if (change.knownSpellIndexes !== undefined) {
    normalised.knownSpellIndexes = Array.from(new Set(change.knownSpellIndexes))
  }

  // Reconciled on every level change, not only one that sends choices: a change
  // that drops below a feat level has to give that feat back, and the client
  // that sent it may be an older build that has never heard of the column.
  const feats = reconcileFeatChoices(character, toLevelFeats(featChoices), change.level)

  if (feats.changed) {
    normalised.featChoices = feats.choices

    // Only the scores that actually moved: a level change is not an edit of the
    // ability block, and writing all six would make it one.
    for (const ability of ABILITIES) {
      if (feats.scores[ability.key] !== character[ability.key]) {
        normalised[ability.key] = feats.scores[ability.key]
      }
    }
  }

  return normalised
}

/**
 * The wire's feat choices as the ledger holds them — ability keys narrowed, and
 * a body that sent none read as "what the row already has", so a level change
 * from a client that does not know about feats keeps them.
 */
function toLevelFeats(choices: LevelChange['featChoices']): readonly LevelFeat[] | undefined {
  return choices?.map((choice) => ({
    level: choice.level,
    featIndex: choice.featIndex,
    ...(choice.increases ? { increases: narrowIncreases(choice.increases) } : {}),
  }))
}

function narrowIncreases(increases: Record<string, number>): AbilityIncreases {
  const narrowed: AbilityIncreases = {}

  for (const [ability, points] of Object.entries(increases)) {
    if (isAbilityKey(ability) && points > 0) narrowed[ability] = points
  }

  return narrowed
}
