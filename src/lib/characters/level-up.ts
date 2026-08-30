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

import type { Character, SpellSlotState } from '@/lib/db/schema'

import { MAX_SLOTS_PER_LEVEL } from './combat'
import { abilityModifier } from './display'
import {
  averageHitDieRoll,
  clampCharacterLevel,
  featuresUpTo,
  hitDie,
  MAX_CHARACTER_LEVEL,
  MIN_CHARACTER_LEVEL,
  spellAllowances,
  standardSpellSlots,
  subclassLevelFor,
  subclassOptions,
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
  | 'level'
  | 'maxHitPoints'
  | 'spellSlots'
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
 * The subclass is taken as the class's only SRD one rather than from the row,
 * because there is nowhere on the row to store it yet — the column arrives with
 * `srd-2024-migration/character-model-migration`. With exactly one subclass per
 * class in the SRD that assumption costs nothing today, and the day it does,
 * this is the single place that has to start reading the column.
 *
 * Empty when levelling down: a level change that takes features away has
 * nothing to list under "what you gain".
 */
export function featureGains(
  character: Pick<LevelChangeFields, 'classIndex' | 'level'>,
  targetLevel: number,
): FeatureGain[] {
  const from = clampCharacterLevel(character.level)
  const to = clampCharacterLevel(targetLevel)
  if (to <= from) return []

  const subclassIndex = subclassOptions(character.classIndex)[0]?.index ?? null

  return featuresUpTo(character.classIndex, subclassIndex, to)
    .filter((feature) => feature.level > from)
    .sort((a, b) => a.level - b.level)
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
})

export type LevelChange = z.infer<typeof levelChangeSchema>

/** A level change as the database takes it, current hit points included. */
export type LevelChangePatch = LevelChange & { currentHitPoints?: number }

/**
 * Bring a validated level change into line with the character it applies to.
 *
 * The same job {@link normaliseCharacterPatch} does for an edit, for the same
 * reason: zod knows the bounds 5e defines, only the stored row knows this
 * wizard is standing at 24 hit points. Levelling down lowers the maximum, and a
 * sheet rendering "24/12" is a state no combat transition can produce.
 */
export function normaliseLevelChange(change: LevelChange, character: Character): LevelChangePatch {
  const normalised: LevelChangePatch = { ...change }

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

  return normalised
}
