// The 5e rules the sheet derives rather than stores (DND-009), on the 2024
// baseline (`srd-2024-migration/rules-engine-2024`).
//
// `src/lib/db/schema.ts` deliberately keeps only what a session *changes*.
// Everything in this file is a pure function of columns that are already there
// — class index, level, the six ability scores — so it is computed at render
// time and can never drift from the row it describes.
//
// The tables are static and local. Two kinds live here, and the split is
// deliberate:
//
// - **What `src/lib/srd/` already holds** — hit dice, saving throws, class
//   skill lists, subclasses, conditions, weapon masteries — is read from there
//   rather than restated. A second copy of a number is a second thing to get
//   wrong, and the SRD modules are already local JSON, so nothing here waits on
//   a network round trip while a DM is asking you to roll.
// - **The class progression tables** (spell slots, prepared spells, cantrips,
//   weapon mastery counts) are written out below, because the one thing
//   dnd5eapi.co's 2024 namespace does not serve is class level tables — every
//   `/api/2024/classes/{index}/levels` URL is a 404
//   (`.icm/docs/2026-08-30-dnd5eapi-2024-coverage.md`). They are transcribed
//   from the class Features tables of SRD 5.2.1 and asserted row-count-wise in
//   `rules.test.ts`.
//
// What moved with the 2024 rules, in one place so a reader of a diff can find
// it: half casters (paladin, ranger) cast from level 1; every caster *prepares*
// spells and the count comes from the class table rather than from an ability
// modifier; every class takes its subclass at level 3; five martial classes get
// Weapon Mastery; Exhaustion is a flat −2 per level to every D20 Test rather
// than a ladder of distinct effects.
import { BACKGROUNDS, type BackgroundAbilitySpread } from '@/lib/srd/backgrounds'
import {
  CLASSES,
  classFeaturesUpTo,
  hasSubclassAtLevel,
  subclassFeaturesUpTo,
  subclassesForClass,
} from '@/lib/srd/classes'
import {
  CONDITIONS as SRD_CONDITIONS,
  exhaustionD20Penalty,
  exhaustionSpeedPenalty,
} from '@/lib/srd/conditions'
import { WEAPON_MASTERIES, masteryFor } from '@/lib/srd/weapons'
import type { SrdSkillChoice, SrdSubclass, SrdWeaponMastery } from '@/lib/srd/types'
import type { SpellSlotState } from '@/lib/db/schema'

import { abilityModifier } from './display'
import { ABILITIES, SKILLS, type AbilityKey, type SkillDefinition } from './schema'

// Re-exported so a sheet component needs one rules import, not two. SKILLS
// lives in `schema.ts` (the form schema validates picks against it) and is
// re-exported below for the same reason; the SRD constants are re-exported so
// a card asking "how much does exhaustion cost me" never has to know whether
// the answer came from the data layer or from this file.
export { ABILITIES, SKILLS, isKnownSkill } from './schema'
export type { AbilityKey, SkillDefinition } from './schema'
export {
  MAX_EXHAUSTION_LEVEL,
  exhaustionD20Penalty,
  exhaustionSpeedPenalty,
} from '@/lib/srd/conditions'
export { SUBCLASS_LEVEL } from '@/lib/srd/classes'

/** The six ability scores of a character, however they were obtained. */
export type AbilityScores = Record<AbilityKey, number>

/** The levels 5e defines a character between. */
export const MIN_CHARACTER_LEVEL = 1
export const MAX_CHARACTER_LEVEL = 20

/**
 * A level as the class tables can be indexed by it: a whole number in 1–20.
 *
 * Every table in this file is twenty rows long, so a level outside that range
 * has to become one inside it. Clamping rather than throwing is the same call
 * the rest of this module makes about unknown classes — a sheet that renders
 * the 20th-level row is wrong by a visible amount; one that throws is gone.
 */
export function clampCharacterLevel(level: number): number {
  return Math.min(MAX_CHARACTER_LEVEL, Math.max(MIN_CHARACTER_LEVEL, Math.floor(level)))
}

/** A twenty-row class table, read at a level that has already been clamped. */
function atLevel(table: readonly number[], level: number): number {
  return table[clampCharacterLevel(level) - 1]
}

/**
 * The proficiency bonus for a character level: +2 at 1st, +1 every four levels
 * after that. Identical for every class, which is why level is the only input.
 *
 * Derived, never stored — including across a level change (DND-032). Nothing
 * writes this number, so nothing can leave it behind.
 */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((clampCharacterLevel(level) - 1) / 4)
}

// ---------------------------------------------------------------------------
// Hit dice
// ---------------------------------------------------------------------------

/**
 * The hit die each SRD class rolls for hit points, as the number of faces.
 *
 * Read off the SRD 5.2.1 class data rather than restated: fixed by the class
 * with nothing for the player to choose, which is what makes a level-up's hit
 * point gain derivable from a row that stores only `classIndex` and
 * Constitution.
 */
export const CLASS_HIT_DICE: Readonly<Record<string, number>> = Object.fromEntries(
  CLASSES.all.map((characterClass) => [characterClass.index, characterClass.hitDie]),
)

/**
 * The hit die for a class index, or `null` for one this table has never heard
 * of. A level-up cannot guess a homebrew class's die, and inventing a d8 would
 * quietly write a wrong maximum — so the caller asks the player instead.
 */
export function hitDie(classIndex: string): number | null {
  return CLASSES.get(classIndex)?.hitDie ?? null
}

/**
 * The fixed value 5e offers in place of rolling a hit die — "half the die,
 * rounded up, plus one": 4 on a d6, 5 on a d8, 6 on a d10, 7 on a d12.
 */
export function averageHitDieRoll(die: number): number {
  return Math.floor(die / 2) + 1
}

// ---------------------------------------------------------------------------
// Subclasses (2024: level 3, for every class)
// ---------------------------------------------------------------------------

/**
 * The subclasses the SRD publishes for a class — exactly one for each of the
 * twelve, which is a licensing boundary rather than an oversight.
 *
 * Re-exported through here so the sheet and the level planner take their
 * subclass facts from the same place they take hit dice.
 */
export function subclassOptions(classIndex: string): SrdSubclass[] {
  return subclassesForClass(classIndex)
}

/**
 * The level this class chooses its subclass at — 3 for every 2024 class, or
 * `null` for a class this build has never heard of.
 *
 * Asked through the data rather than through a literal 3 so the uniformity
 * stays a fact about the SRD and not an assumption baked into a caller.
 */
export function subclassLevelFor(classIndex: string): number | null {
  return CLASSES.get(classIndex)?.subclassLevel ?? null
}

/** True once a character of this class and level has a subclass (2024: 3rd). */
export function hasSubclass(classIndex: string, level: number): boolean {
  return hasSubclassAtLevel(classIndex, clampCharacterLevel(level))
}

/** One feature a level grants, class or subclass, in the shape a card renders. */
export interface FeatureGain {
  level: number
  name: string
  description: string
  /** True when it comes from the subclass rather than the class itself. */
  subclass: boolean
}

/**
 * Every feature a character of this class and subclass has at `level`, class
 * features first and subclass features after, each in level order.
 *
 * Subclass features are asked for by index rather than assumed, even though
 * the SRD publishes exactly one per class: a character below 3rd level has no
 * subclass at all, and listing Improved Critical on a 2nd-level fighter would
 * be wrong in the direction that gets someone to use a feature they do not
 * have.
 */
export function featuresUpTo(
  classIndex: string,
  subclassIndex: string | null,
  level: number,
): FeatureGain[] {
  const characterLevel = clampCharacterLevel(level)

  const classFeatures = classFeaturesUpTo(classIndex, characterLevel).map((feature) => ({
    level: feature.level,
    name: feature.name,
    description: feature.description,
    subclass: false,
  }))

  if (!subclassIndex || !hasSubclass(classIndex, characterLevel)) return classFeatures

  return [
    ...classFeatures,
    ...subclassFeaturesUpTo(subclassIndex, characterLevel).map((feature) => ({
      level: feature.level,
      name: feature.name,
      description: feature.description,
      subclass: true,
    })),
  ]
}

// ---------------------------------------------------------------------------
// Saving throws
// ---------------------------------------------------------------------------

/**
 * The two saving throws each SRD class is proficient in. Unlike skills, these
 * are fixed by the class with nothing for the player to choose — which is what
 * makes them derivable from a row that stores only `classIndex`.
 */
export const CLASS_SAVING_THROWS: Readonly<Record<string, readonly AbilityKey[]>> =
  Object.fromEntries(
    CLASSES.all.map((characterClass) => [characterClass.index, characterClass.savingThrows]),
  )

/**
 * Saving throw proficiencies for a class index, or none for a class this table
 * has never heard of — homebrew, or an index an older build wrote. Showing six
 * unproficient saves is wrong by a small, visible amount; throwing would take
 * the whole sheet down mid-combat.
 */
export function savingThrowProficiencies(classIndex: string): readonly AbilityKey[] {
  return CLASSES.get(classIndex)?.savingThrows ?? []
}

export interface SavingThrow {
  ability: AbilityKey
  label: string
  abbreviation: string
  modifier: number
  proficient: boolean
}

/**
 * All six saving throws with proficiency folded in, in sheet order.
 *
 * `exhaustion` is folded in too, because a saving throw is a D20 Test and 2024
 * Exhaustion reduces every one of them by 2 per level. Defaulted to zero so a
 * caller that has no exhaustion to hand gets the unexhausted number rather than
 * a wrong one.
 */
export function savingThrows(
  scores: AbilityScores,
  classIndex: string,
  level: number,
  exhaustion = 0,
): SavingThrow[] {
  const proficiencies = new Set(savingThrowProficiencies(classIndex))
  const bonus = proficiencyBonus(level)
  const penalty = exhaustionD20Penalty(exhaustion)

  return ABILITIES.map((ability) => {
    const proficient = proficiencies.has(ability.key)

    return {
      ability: ability.key,
      label: ability.label,
      abbreviation: ability.abbreviation,
      modifier: abilityModifier(scores[ability.key]) + (proficient ? bonus : 0) + penalty,
      proficient,
    }
  })
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/**
 * What each class's skill proficiency choices are, as the SRD phrases them —
 * "Choose 2: Acrobatics, Animal Handling, …", or the Bard's "Choose any 3".
 */
export function classSkillChoices(classIndex: string): readonly SrdSkillChoice[] {
  return CLASSES.get(classIndex)?.skillChoices ?? []
}

/**
 * The skills each class may *choose* proficiency in at character creation.
 *
 * Note the "may": the player picks two of these (three for a bard, four for a
 * rogue), and which ones they took is stored on the row as `skillProficiencies`
 * (DND-015). This table is what the picker offers and what the sheet badges as
 * a class skill — the actual bonuses come from {@link skillChecks} fed the
 * stored picks. Flattened from the SRD's choice groups, which is a lossless
 * move only because no SRD class has two groups; {@link classSkillChoices} is
 * there for a caller that needs the "choose N" as well as the "from what".
 */
export const CLASS_SKILL_OPTIONS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  CLASSES.all.map((characterClass) => [
    characterClass.index,
    Array.from(new Set(characterClass.skillChoices.flatMap((choice) => choice.from))),
  ]),
)

export interface SkillCheck extends SkillDefinition {
  /** The full check bonus: ability modifier plus whatever proficiency adds. */
  modifier: number
  /** True when this skill is on the character's class list of choices. */
  classSkill: boolean
  /** True when the character chose proficiency in this skill (DND-015). */
  proficient: boolean
  /** True when the character has expertise here — double proficiency (D21). */
  expertise: boolean
}

/**
 * The stored columns skill bonuses are computed from — a `Character` row
 * satisfies it directly.
 */
export interface SkillSelections {
  level: number
  /** Skill indexes the character chose proficiency in. */
  skillProficiencies: readonly string[]
  /** The subset of those with expertise (double proficiency). */
  skillExpertise: readonly string[]
  /**
   * Exhaustion level, if the caller has it. Optional because a form's working
   * copy legitimately does not — a character being built is not exhausted.
   */
  exhaustion?: number
}

/**
 * What proficiency adds to one skill check (D21): double the proficiency
 * bonus for expertise, the full bonus for proficiency, half of it (rounded
 * down) for a bard of 2nd level or higher — Jack of All Trades covers every
 * check the bard is not otherwise proficient in — and nothing for everyone
 * else. Expertise is counted even without the matching proficiency entry
 * (the write path enforces expertise ⊆ proficiencies; if bad data gets past
 * it, honouring the stronger claim is the smaller wrong).
 */
function proficiencyContribution(
  skillIndex: string,
  classIndex: string,
  selections: SkillSelections,
): number {
  const bonus = proficiencyBonus(selections.level)

  if (selections.skillExpertise.includes(skillIndex)) return bonus * 2
  if (selections.skillProficiencies.includes(skillIndex)) return bonus

  const jackOfAllTrades = classIndex === 'bard' && clampCharacterLevel(selections.level) >= 2
  return jackOfAllTrades ? Math.floor(bonus / 2) : 0
}

/**
 * Every skill with its full check bonus — ability modifier plus proficiency,
 * expertise or Jack of All Trades where the character has them (DND-015, D21),
 * minus the 2024 Exhaustion penalty — flagged with whether the class could have
 * taken proficiency in it.
 *
 * `selections` is optional for compatibility with callers that predate stored
 * skill picks: without it the bonus is the bare ability modifier and nothing
 * reads as proficient, which is the honest number when the picks are unknown.
 */
export function skillChecks(
  scores: AbilityScores,
  classIndex: string,
  selections?: SkillSelections,
): SkillCheck[] {
  const classSkills = new Set(CLASS_SKILL_OPTIONS[classIndex] ?? [])
  const penalty = selections ? exhaustionD20Penalty(selections.exhaustion ?? 0) : 0

  return SKILLS.map((skill) => ({
    ...skill,
    modifier:
      abilityModifier(scores[skill.ability]) +
      (selections ? proficiencyContribution(skill.index, classIndex, selections) : 0) +
      penalty,
    classSkill: classSkills.has(skill.index),
    proficient: selections
      ? selections.skillProficiencies.includes(skill.index) ||
        selections.skillExpertise.includes(skill.index)
      : false,
    expertise: selections ? selections.skillExpertise.includes(skill.index) : false,
  }))
}

/**
 * Passive Perception: 10 + the full Perception check bonus, proficiency and
 * expertise included. What the DND-030 party glance shows per character.
 *
 * Exhaustion counts. The SRD's formula is "10 + Wisdom (Perception) check
 * modifier … include all modifiers that apply to your Wisdom (Perception)
 * checks" (SRD 5.2.1, Passive Perception), and the 2024 Exhaustion penalty is
 * one of them.
 */
export function passivePerception(
  scores: AbilityScores,
  classIndex: string,
  selections: SkillSelections,
): number {
  return (
    10 +
    abilityModifier(scores.wisdom) +
    proficiencyContribution('perception', classIndex, selections) +
    exhaustionD20Penalty(selections.exhaustion ?? 0)
  )
}

/** Initiative is a Dexterity check, so Exhaustion drags it down like any other. */
export function initiativeModifier(scores: AbilityScores, exhaustion = 0): number {
  return abilityModifier(scores.dexterity) + exhaustionD20Penalty(exhaustion)
}

/**
 * The character's Speed after Exhaustion takes 5 feet per level off it, never
 * below zero (SRD 5.2.1, Exhaustion). The stored `speed` column is the
 * unexhausted number; this is what they can actually move.
 */
export function effectiveSpeed(speed: number, exhaustion = 0): number {
  return Math.max(0, speed - exhaustionSpeedPenalty(exhaustion))
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export interface ConditionDefinition {
  /** SRD condition index, which is what the row stores. */
  index: string
  label: string
  /** One line of what it does — enough to adjudicate without opening a book. */
  summary: string
}

/**
 * One-line summaries of the fifteen SRD 5.2.1 conditions, keyed by index.
 *
 * Deliberate abridgements, not the rules: the canonical text is the SRD prose
 * in `src/lib/srd/data/conditions.json`, rendered in-app at `/rules/conditions`
 * with one anchor per condition (`#blinded`, `#prone`, … — the anchors are
 * these index values), and the sheet's ConditionsCard links each active
 * condition there (DND-037). Keep summaries to one at-a-glance line; anything
 * longer belongs in the chapter, once.
 *
 * The names and the order come from the data — a condition the SRD adds or
 * renames arrives here without an edit, and `rules.test.ts` fails if one
 * arrives without a summary.
 */
const CONDITION_SUMMARIES: Readonly<Record<string, string>> = {
  blinded: "Can't see. Attacks against you have advantage, yours have disadvantage.",
  charmed: "Can't harm the charmer; they have advantage on social checks with you.",
  deafened: "Can't hear, and automatically fail checks that need hearing.",
  exhaustion: 'Each level is −2 to every d20 test and −5 ft of speed. Six is death.',
  frightened: "Disadvantage while the source is in sight; can't willingly move closer.",
  grappled: 'Speed 0, and disadvantage attacking anyone but the grappler.',
  incapacitated: "No actions, bonus actions or reactions; concentration broken; can't speak.",
  invisible: 'Concealed. Attacks against you have disadvantage, yours have advantage.',
  paralyzed: 'Incapacitated, speed 0, auto-fail STR and DEX saves. Hits within 5 ft. crit.',
  petrified: 'Turned to stone: incapacitated, resistant to all damage, ageing stops.',
  poisoned: 'Disadvantage on attack rolls and ability checks.',
  prone: 'Disadvantage on your attacks; attacks within 5 ft. of you have advantage.',
  restrained: 'Speed 0, attacks against you have advantage, DEX saves have disadvantage.',
  stunned: 'Incapacitated, auto-fail STR and DEX saves, attacks against you have advantage.',
  unconscious: 'Incapacitated and prone, drop what you hold. Hits within 5 ft. crit.',
}

/** The fifteen SRD 5.2.1 conditions, in the order the SRD prints them. */
export const CONDITIONS: readonly ConditionDefinition[] = SRD_CONDITIONS.all.map((condition) => ({
  index: condition.index,
  label: condition.name,
  summary: CONDITION_SUMMARIES[condition.index] ?? condition.description,
}))

/** True for a condition this app knows how to render. */
export function isKnownCondition(index: string): boolean {
  return SRD_CONDITIONS.has(index)
}

// ---------------------------------------------------------------------------
// Weapon Mastery (2024)
// ---------------------------------------------------------------------------

/**
 * How many kinds of weapon a class may use the mastery property of, by
 * character level.
 *
 * Five classes have the Weapon Mastery feature at level 1. Only the Barbarian
 * and the Fighter have a Weapon Mastery column in their Features table — the
 * Paladin, Ranger and Rogue keep the two they start with all the way to 20 —
 * which is why three of these rows are flat. Transcribed from the class
 * Features tables of SRD 5.2.1.
 */
const WEAPON_MASTERY_COUNTS: Readonly<Record<string, readonly number[]>> = {
  barbarian: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  fighter: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6],
  paladin: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  ranger: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  rogue: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
}

/** True for a class with the Weapon Mastery feature at all. */
export function hasWeaponMastery(classIndex: string): boolean {
  return classIndex in WEAPON_MASTERY_COUNTS
}

/**
 * How many weapon mastery properties this character may use, or `null` for a
 * class that has none — a wizard's Longsword still *has* Topple, they just
 * cannot use it, and that distinction is what an attack row has to draw.
 */
export function weaponMasteryCount(classIndex: string, level: number): number | null {
  const table = WEAPON_MASTERY_COUNTS[classIndex]
  return table ? atLevel(table, level) : null
}

/** The mastery property a weapon carries, resolved to its SRD text, or `null`. */
export function weaponMastery(weaponIndex: string): SrdWeaponMastery | null {
  return masteryFor(weaponIndex)
}

/** The eight 2024 mastery properties — Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex. */
export const WEAPON_MASTERY_PROPERTIES: readonly SrdWeaponMastery[] = WEAPON_MASTERIES.all

// ---------------------------------------------------------------------------
// The action list (2024)
// ---------------------------------------------------------------------------

export interface ActionDefinition {
  index: string
  label: string
  /** The SRD's own one-line summary from the Actions table. */
  summary: string
}

/**
 * The twelve actions of the 2024 Actions table (SRD 5.2.1, "Actions").
 *
 * The tidy-up the 2024 rules did here is the point: Cast a Spell, Use an
 * Object and Use a Magic Item collapsed into Magic and Utilize, Search split
 * into Search and Study, and Influence gave the social roll an action of its
 * own. A player learning the game reads this list once and has the whole turn.
 *
 * Summaries are the SRD's, trimmed to a line; the full text is the rules
 * chapter's job (`srd-2024-migration/rules-chapters-2024`).
 */
export const ACTIONS: readonly ActionDefinition[] = [
  { index: 'attack', label: 'Attack', summary: 'Attack with a weapon or an Unarmed Strike.' },
  {
    index: 'dash',
    label: 'Dash',
    summary: 'For the rest of the turn, give yourself extra movement equal to your Speed.',
  },
  {
    index: 'disengage',
    label: 'Disengage',
    summary: "Your movement doesn't provoke Opportunity Attacks for the rest of the turn.",
  },
  {
    index: 'dodge',
    label: 'Dodge',
    summary:
      'Until the start of your next turn, attack rolls against you have Disadvantage, and you make Dexterity saving throws with Advantage.',
  },
  {
    index: 'help',
    label: 'Help',
    summary: "Help another creature's ability check or attack roll, or administer first aid.",
  },
  { index: 'hide', label: 'Hide', summary: 'Make a Dexterity (Stealth) check.' },
  {
    index: 'influence',
    label: 'Influence',
    summary:
      "Make a Charisma (Deception, Intimidation, Performance, or Persuasion) or Wisdom (Animal Handling) check to alter a creature's attitude.",
  },
  {
    index: 'magic',
    label: 'Magic',
    summary: 'Cast a spell, use a magic item, or use a magical feature.',
  },
  {
    index: 'ready',
    label: 'Ready',
    summary: 'Prepare to take an action in response to a trigger you define.',
  },
  {
    index: 'search',
    label: 'Search',
    summary: 'Make a Wisdom (Insight, Medicine, Perception, or Survival) check.',
  },
  {
    index: 'study',
    label: 'Study',
    summary: 'Make an Intelligence (Arcana, History, Investigation, Nature, or Religion) check.',
  },
  { index: 'utilize', label: 'Utilize', summary: 'Use a nonmagical object.' },
]

/**
 * Heroic Inspiration (SRD 5.2.1) — 2024's replacement for "Inspiration".
 *
 * A flag, not a pool: you have it or you do not, a second one is lost unless
 * you hand it to someone who has none, and spending it rerolls any die you
 * just rolled. Stated here rather than in a component because it is a rule,
 * and because the column that stores it arrives with
 * `srd-2024-migration/character-model-migration`.
 */
export const HEROIC_INSPIRATION = {
  label: 'Heroic Inspiration',
  summary: 'Expend it to reroll any die immediately after rolling it. You keep the new roll.',
  /** You can never hold two — the second is lost, or given away. */
  max: 1,
} as const

// ---------------------------------------------------------------------------
// Ability scores from a background (2024)
// ---------------------------------------------------------------------------

/**
 * The character's ability scores with their background's increases applied.
 *
 * The 2024 rules moved ability score increases off the species and onto the
 * background: +2 and +1 among the background's three abilities, or +1 to each
 * of the three. `abilities` is the player's choice of which, in the order the
 * spread spends them, and comes back unapplied if it is not a legal choice for
 * that background — an unknown background, a duplicate, an ability the
 * background does not offer. Guessing at a spread the player did not pick would
 * write a wrong number into every derived stat on the sheet.
 *
 * Scores are capped at 20, which is the ceiling the 2024 rules put on an
 * increase from a background or a feat.
 */
export function abilityScoresWithBackground(
  base: AbilityScores,
  backgroundIndex: string,
  spread: BackgroundAbilitySpread,
  abilities: readonly AbilityKey[],
): AbilityScores {
  const background = BACKGROUNDS.get(backgroundIndex)
  if (!background) return { ...base }

  const increases = spread === 'two-and-one' ? [2, 1] : [1, 1, 1]
  if (abilities.length !== increases.length) return { ...base }
  if (new Set(abilities).size !== abilities.length) return { ...base }
  if (!abilities.every((ability) => background.abilityScores.includes(ability))) return { ...base }

  const scores = { ...base }

  abilities.forEach((ability, position) => {
    scores[ability] = Math.min(20, scores[ability] + increases[position])
  })

  return scores
}

// ---------------------------------------------------------------------------
// Spell slots
// ---------------------------------------------------------------------------

/**
 * Slots per spell level for a full caster of each character level, index 0
 * being level 1. Bard, cleric, druid, sorcerer and wizard all share this table,
 * which the 2024 rules left untouched.
 */
const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/** Warlock pact magic: `[slot count, slot level]` by character level. */
const PACT_MAGIC: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 1],
  [2, 2],
  [2, 2],
  [2, 3],
  [2, 3],
  [2, 4],
  [2, 4],
  [2, 5],
  [2, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [4, 5],
  [4, 5],
  [4, 5],
  [4, 5],
]

export type SpellcastingKind = 'full' | 'half' | 'pact'

const SPELLCASTING_KINDS: Readonly<Record<string, SpellcastingKind>> = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
  warlock: 'pact',
}

/**
 * How a class gets its slots, or `null` for one that has none by default.
 *
 * The SRD publishes one subclass per class and none of the twelve is a third
 * caster, so there is no Eldritch Knight row to keep here. A homebrew subclass
 * that casts gets the same manual slot adjustment as anything else — see
 * `setSlotMax` in `combat.ts`.
 */
export function spellcastingKind(classIndex: string): SpellcastingKind | null {
  return SPELLCASTING_KINDS[classIndex] ?? null
}

function fullCasterSlots(casterLevel: number): SpellSlotState {
  const row = FULL_CASTER_SLOTS[clampCharacterLevel(casterLevel) - 1]
  const slots: SpellSlotState = {}

  row.forEach((max, offset) => {
    slots[String(offset + 1)] = { max, used: 0 }
  })

  return slots
}

/**
 * The slots the standard tables give a level-`level` `classIndex`, all unspent.
 * Empty for a class with no spellcasting.
 *
 * A half caster now casts from 1st level — the 2024 Paladin and Ranger both
 * take Spellcasting at level 1 with two 1st-level slots, where the 2014 tables
 * left them with none until 2nd. That makes their whole progression a full
 * caster's at `ceil(level / 2)` with no exception at the bottom: check it
 * against the Paladin Features table and every one of the twenty rows matches.
 *
 * Used only to *offer* a starting point on a sheet whose slots have never been
 * set up; the row stores its own maxima from then on, because pact magic and a
 * DM's ruling both diverge from these tables.
 */
export function standardSpellSlots(classIndex: string, level: number): SpellSlotState {
  const characterLevel = clampCharacterLevel(level)

  switch (spellcastingKind(classIndex)) {
    case 'full':
      return fullCasterSlots(characterLevel)

    case 'half':
      return fullCasterSlots(Math.ceil(characterLevel / 2))

    case 'pact': {
      const [count, slotLevel] = PACT_MAGIC[characterLevel - 1]
      return { [String(slotLevel)]: { max: count, used: 0 } }
    }

    default:
      return {}
  }
}

// ---------------------------------------------------------------------------
// How many spells a caster gets
// ---------------------------------------------------------------------------

/**
 * The ability each casting class casts with. `null` for the four classes that
 * do not cast at all — which is also how "no spells to count" is spelled below.
 */
const SPELLCASTING_ABILITIES: Readonly<Record<string, AbilityKey>> = {
  bard: 'charisma',
  cleric: 'wisdom',
  druid: 'wisdom',
  paladin: 'charisma',
  ranger: 'wisdom',
  sorcerer: 'charisma',
  warlock: 'charisma',
  wizard: 'intelligence',
}

export function spellcastingAbility(classIndex: string): AbilityKey | null {
  return SPELLCASTING_ABILITIES[classIndex] ?? null
}

// ---------------------------------------------------------------------------
// Spell preparation (DND-036, register decision D22 — on the 2024 tables)
// ---------------------------------------------------------------------------

/**
 * Where a prepared caster's choices come from: the whole class spell list, or
 * the wizard's spellbook (`knownSpellIndexes` *is* the book, `prepared` a
 * subset of it — D22's two-list model, no third list).
 *
 * "Spells known" is gone from the 2024 rules. A bard, sorcerer, warlock and
 * ranger all prepare from their class list exactly as a cleric does, and the
 * list is rebuilt at each level rather than accumulated — so the app's
 * class-list model, which had three classes in it, now has seven.
 */
export type SpellPreparationModel = 'class-list' | 'spellbook'

const SPELL_PREPARATION_MODELS: Readonly<Record<string, SpellPreparationModel>> = {
  bard: 'class-list',
  cleric: 'class-list',
  druid: 'class-list',
  paladin: 'class-list',
  ranger: 'class-list',
  sorcerer: 'class-list',
  warlock: 'class-list',
  wizard: 'spellbook',
}

/**
 * How a class prepares spells, or `null` for a non-caster, for whom
 * preparation does not exist and `preparedSpellIndexes` means nothing.
 */
export function spellPreparationModel(classIndex: string): SpellPreparationModel | null {
  return SPELL_PREPARATION_MODELS[classIndex] ?? null
}

/**
 * Prepared spells by character level, index 0 being level 1 — the Prepared
 * Spells column of each class's Features table in SRD 5.2.1.
 *
 * A table rather than the 2014 formula ("casting modifier + level"): the 2024
 * rules fixed the count by level for every class, so a Wisdom bump no longer
 * moves how many spells a cleric prepares. The three full-caster rows that look
 * copy-pasted really are identical in the SRD; the sorcerer differs only at
 * levels 1–2 and the wizard only from level 14 up.
 */
const PREPARED_SPELLS: Readonly<Record<string, readonly number[]>> = {
  bard: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  cleric: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  druid: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  sorcerer: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  wizard: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  paladin: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  ranger: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
}

/**
 * How many spells this character may have prepared, or `null` for a class that
 * does not cast.
 *
 * Advisory like the rest of this file: the sheet shows "4 of 5 prepared", it
 * does not refuse the fifth.
 */
export function preparedSpellLimit(classIndex: string, level: number): number | null {
  const table = PREPARED_SPELLS[classIndex]
  return table ? atLevel(table, level) : null
}

/**
 * Cantrips known at 1st level. Every class that has cantrips at all gains one
 * more at 4th and another at 10th, which is why one number and
 * {@link cantripsKnown} cover all six. Paladins and rangers have no cantrips.
 */
const CANTRIPS_AT_FIRST_LEVEL: Readonly<Record<string, number>> = {
  bard: 2,
  cleric: 3,
  druid: 2,
  sorcerer: 4,
  warlock: 2,
  wizard: 3,
}

function cantripsKnown(atFirstLevel: number, level: number): number {
  return atFirstLevel + (level >= 10 ? 2 : level >= 4 ? 1 : 0)
}

/** One count a class table sets for a level — a row of the level-up summary. */
export interface SpellAllowance {
  /** Stable across levels, so a before/after comparison can pair rows up. */
  key: 'cantrips' | 'spellbook' | 'prepared'
  label: string
  count: number
}

/**
 * How many spells the class tables give this character at this level.
 *
 * Advisory, and deliberately so: the app cannot pick a bard's ninth spell for
 * them, and nothing here is enforced against what the row stores. What it can
 * do is say what the level they just reached entitles them to, which is the
 * question a level-up actually raises (DND-032).
 */
export function spellAllowances(classIndex: string, level: number): SpellAllowance[] {
  if (!spellcastingAbility(classIndex)) return []

  const characterLevel = clampCharacterLevel(level)
  const allowances: SpellAllowance[] = []
  const atFirstLevel = CANTRIPS_AT_FIRST_LEVEL[classIndex]

  if (atFirstLevel !== undefined) {
    allowances.push({
      key: 'cantrips',
      label: 'Cantrips known',
      count: cantripsKnown(atFirstLevel, characterLevel),
    })
  }

  // A wizard's list is their spellbook — six spells to start and two more each
  // level — and what they prepare from it is a separate, smaller number.
  if (classIndex === 'wizard') {
    allowances.push({
      key: 'spellbook',
      label: 'Spells in the spellbook',
      count: 6 + 2 * (characterLevel - 1),
    })
  }

  // Prepared each day — shared with the DND-036 preparation sheet, so the
  // level-up summary and the prepare screen can never disagree on the number.
  const prepared = preparedSpellLimit(classIndex, characterLevel)

  if (prepared !== null) {
    allowances.push({ key: 'prepared', label: 'Spells prepared', count: prepared })
  }

  return allowances
}
