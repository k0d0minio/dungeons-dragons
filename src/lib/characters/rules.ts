// The 5e rules the sheet derives rather than stores (DND-009).
//
// `src/lib/db/schema.ts` deliberately keeps only what a session *changes*.
// Everything in this file is a pure function of columns that are already there
// — class index, level, the six ability scores — so it is computed at render
// time and can never drift from the row it describes.
//
// The tables are static rather than fetched from `/api/dnd5e/*`. A saving throw
// bonus is not something to wait on a network round trip for while a DM is
// asking you to roll, and these twelve SRD classes have not changed since 2014.
import type { SpellSlotState } from '@/lib/db/schema'

import { abilityModifier } from './display'
import { ABILITIES, type AbilityKey } from './schema'

// Re-exported so a sheet component needs one rules import, not two.
export { ABILITIES } from './schema'
export type { AbilityKey } from './schema'

/** The six ability scores of a character, however they were obtained. */
export type AbilityScores = Record<AbilityKey, number>

/**
 * The proficiency bonus for a character level: +2 at 1st, +1 every four levels
 * after that. Identical for every class, which is why level is the only input.
 */
export function proficiencyBonus(level: number): number {
  const clamped = Math.min(20, Math.max(1, Math.floor(level)))
  return 2 + Math.floor((clamped - 1) / 4)
}

// ---------------------------------------------------------------------------
// Saving throws
// ---------------------------------------------------------------------------

/**
 * The two saving throws each SRD class is proficient in. Unlike skills, these
 * are fixed by the class with nothing for the player to choose — which is what
 * makes them derivable from a row that stores only `classIndex`.
 */
export const CLASS_SAVING_THROWS: Readonly<Record<string, readonly AbilityKey[]>> = {
  barbarian: ['strength', 'constitution'],
  bard: ['dexterity', 'charisma'],
  cleric: ['wisdom', 'charisma'],
  druid: ['intelligence', 'wisdom'],
  fighter: ['strength', 'constitution'],
  monk: ['strength', 'dexterity'],
  paladin: ['wisdom', 'charisma'],
  ranger: ['strength', 'dexterity'],
  rogue: ['dexterity', 'intelligence'],
  sorcerer: ['constitution', 'charisma'],
  warlock: ['wisdom', 'charisma'],
  wizard: ['intelligence', 'wisdom'],
}

/**
 * Saving throw proficiencies for a class index, or none for a class this table
 * has never heard of — homebrew, or an index the reference API added later.
 * Showing six unproficient saves is wrong by a small, visible amount; throwing
 * would take the whole sheet down mid-combat.
 */
export function savingThrowProficiencies(classIndex: string): readonly AbilityKey[] {
  return CLASS_SAVING_THROWS[classIndex] ?? []
}

export interface SavingThrow {
  ability: AbilityKey
  label: string
  abbreviation: string
  modifier: number
  proficient: boolean
}

/** All six saving throws with proficiency folded in, in sheet order. */
export function savingThrows(
  scores: AbilityScores,
  classIndex: string,
  level: number
): SavingThrow[] {
  const proficiencies = new Set(savingThrowProficiencies(classIndex))
  const bonus = proficiencyBonus(level)

  return ABILITIES.map((ability) => {
    const proficient = proficiencies.has(ability.key)

    return {
      ability: ability.key,
      label: ability.label,
      abbreviation: ability.abbreviation,
      modifier: abilityModifier(scores[ability.key]) + (proficient ? bonus : 0),
      proficient,
    }
  })
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export interface SkillDefinition {
  /** dnd5eapi index, e.g. `sleight-of-hand`. */
  index: string
  label: string
  ability: AbilityKey
}

/** The eighteen SRD skills, alphabetical — the order a printed sheet uses. */
export const SKILLS: readonly SkillDefinition[] = [
  { index: 'acrobatics', label: 'Acrobatics', ability: 'dexterity' },
  { index: 'animal-handling', label: 'Animal Handling', ability: 'wisdom' },
  { index: 'arcana', label: 'Arcana', ability: 'intelligence' },
  { index: 'athletics', label: 'Athletics', ability: 'strength' },
  { index: 'deception', label: 'Deception', ability: 'charisma' },
  { index: 'history', label: 'History', ability: 'intelligence' },
  { index: 'insight', label: 'Insight', ability: 'wisdom' },
  { index: 'intimidation', label: 'Intimidation', ability: 'charisma' },
  { index: 'investigation', label: 'Investigation', ability: 'intelligence' },
  { index: 'medicine', label: 'Medicine', ability: 'wisdom' },
  { index: 'nature', label: 'Nature', ability: 'intelligence' },
  { index: 'perception', label: 'Perception', ability: 'wisdom' },
  { index: 'performance', label: 'Performance', ability: 'charisma' },
  { index: 'persuasion', label: 'Persuasion', ability: 'charisma' },
  { index: 'religion', label: 'Religion', ability: 'intelligence' },
  { index: 'sleight-of-hand', label: 'Sleight of Hand', ability: 'dexterity' },
  { index: 'stealth', label: 'Stealth', ability: 'dexterity' },
  { index: 'survival', label: 'Survival', ability: 'wisdom' },
]

const ALL_SKILL_INDEXES = SKILLS.map((skill) => skill.index)

/**
 * The skills each class may *choose* proficiency in at character creation.
 *
 * Note the "may": 5e has the player pick two of these (four for a rogue), and
 * nothing in the `characters` row records which ones they took — the DND-008
 * form does not ask. So this table cannot tell you a character's skill bonuses;
 * it can only tell you which rows on the sheet are worth a second look. Making
 * those picks storable is DND-015.
 */
export const CLASS_SKILL_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  barbarian: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
  // A bard is proficient in any three skills of their choice.
  bard: ALL_SKILL_INDEXES,
  cleric: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
  druid: [
    'arcana',
    'animal-handling',
    'insight',
    'medicine',
    'nature',
    'perception',
    'religion',
    'survival',
  ],
  fighter: [
    'acrobatics',
    'animal-handling',
    'athletics',
    'history',
    'insight',
    'intimidation',
    'perception',
    'survival',
  ],
  monk: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
  paladin: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
  ranger: [
    'animal-handling',
    'athletics',
    'insight',
    'investigation',
    'nature',
    'perception',
    'stealth',
    'survival',
  ],
  rogue: [
    'acrobatics',
    'athletics',
    'deception',
    'insight',
    'intimidation',
    'investigation',
    'perception',
    'performance',
    'persuasion',
    'sleight-of-hand',
    'stealth',
  ],
  sorcerer: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
  warlock: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
  wizard: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
}

export interface SkillCheck extends SkillDefinition {
  /** The ability modifier. Proficiency is not included — see below. */
  modifier: number
  /** True when this skill is on the character's class list of choices. */
  classSkill: boolean
}

/**
 * Every skill with its ability modifier, flagged with whether the class could
 * have taken proficiency in it.
 *
 * The bonus deliberately excludes the proficiency bonus: which skills a
 * character actually picked is not stored anywhere (see
 * {@link CLASS_SKILL_OPTIONS}), and a number that is silently +3 too high is
 * worse at a table than a number the sheet is honest about.
 */
export function skillChecks(scores: AbilityScores, classIndex: string): SkillCheck[] {
  const classSkills = new Set(CLASS_SKILL_OPTIONS[classIndex] ?? [])

  return SKILLS.map((skill) => ({
    ...skill,
    modifier: abilityModifier(scores[skill.ability]),
    classSkill: classSkills.has(skill.index),
  }))
}

/** Initiative is a plain Dexterity check in the combat core — no feats yet. */
export function initiativeModifier(scores: AbilityScores): number {
  return abilityModifier(scores.dexterity)
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export interface ConditionDefinition {
  /** dnd5eapi condition index, which is what the row stores. */
  index: string
  label: string
  /** One line of what it does — enough to adjudicate without opening a book. */
  summary: string
}

/** The fifteen SRD conditions, alphabetical. */
export const CONDITIONS: readonly ConditionDefinition[] = [
  {
    index: 'blinded',
    label: 'Blinded',
    summary: "Can't see. Attacks against you have advantage, yours have disadvantage.",
  },
  {
    index: 'charmed',
    label: 'Charmed',
    summary: "Can't attack the charmer; they have advantage on social checks with you.",
  },
  {
    index: 'deafened',
    label: 'Deafened',
    summary: "Can't hear, and automatically fail checks that need hearing.",
  },
  {
    index: 'exhaustion',
    label: 'Exhaustion',
    summary: 'Cumulative penalties by level, from disadvantage on checks to death at six.',
  },
  {
    index: 'frightened',
    label: 'Frightened',
    summary: "Disadvantage while the source is in sight; can't willingly move closer.",
  },
  {
    index: 'grappled',
    label: 'Grappled',
    summary: 'Speed drops to 0. Ends if the grappler is incapacitated.',
  },
  {
    index: 'incapacitated',
    label: 'Incapacitated',
    summary: "Can't take actions or reactions.",
  },
  {
    index: 'invisible',
    label: 'Invisible',
    summary: 'Attacks against you have disadvantage, yours have advantage.',
  },
  {
    index: 'paralyzed',
    label: 'Paralyzed',
    summary: "Incapacitated, can't move or speak. Hits from within 5 ft. are critical.",
  },
  {
    index: 'petrified',
    label: 'Petrified',
    summary: 'Turned to stone: incapacitated, resistant to all damage, ageing stops.',
  },
  {
    index: 'poisoned',
    label: 'Poisoned',
    summary: 'Disadvantage on attack rolls and ability checks.',
  },
  {
    index: 'prone',
    label: 'Prone',
    summary: 'Melee attacks against you have advantage, ranged have disadvantage.',
  },
  {
    index: 'restrained',
    label: 'Restrained',
    summary: 'Speed 0, attacks against you have advantage, Dexterity saves have disadvantage.',
  },
  {
    index: 'stunned',
    label: 'Stunned',
    summary: "Incapacitated, can't move, and automatically fail Strength and Dexterity saves.",
  },
  {
    index: 'unconscious',
    label: 'Unconscious',
    summary: 'Incapacitated and prone, drop what you hold. Hits from within 5 ft. are critical.',
  },
]

const CONDITION_INDEXES = new Set(CONDITIONS.map((condition) => condition.index))

/** True for a condition this app knows how to render. */
export function isKnownCondition(index: string): boolean {
  return CONDITION_INDEXES.has(index)
}

// ---------------------------------------------------------------------------
// Spell slots
// ---------------------------------------------------------------------------

/**
 * Slots per spell level for a full caster of each character level, index 0
 * being level 1. Bard, cleric, druid, sorcerer and wizard all share this table.
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
 * Eldritch Knights and Arcane Tricksters are third casters and are *not* here:
 * they are subclasses, and the row only stores a class. They get the same
 * manual slot adjustment as any homebrew — see `setSlotMax` in `combat.ts`.
 */
export function spellcastingKind(classIndex: string): SpellcastingKind | null {
  return SPELLCASTING_KINDS[classIndex] ?? null
}

function fullCasterSlots(casterLevel: number): SpellSlotState {
  const row = FULL_CASTER_SLOTS[Math.min(20, Math.max(1, casterLevel)) - 1]
  const slots: SpellSlotState = {}

  row.forEach((max, offset) => {
    slots[String(offset + 1)] = { max, used: 0 }
  })

  return slots
}

/**
 * The slots the standard tables give a level-`level` `classIndex`, all unspent.
 * Empty for a class with no spellcasting — and for a paladin or ranger at 1st
 * level, who do not get spells until 2nd.
 *
 * Used only to *offer* a starting point on a sheet whose slots have never been
 * set up; the row stores its own maxima from then on, because pact magic,
 * multiclassing and a DM's ruling all diverge from these tables.
 */
export function standardSpellSlots(classIndex: string, level: number): SpellSlotState {
  const characterLevel = Math.min(20, Math.max(1, Math.floor(level)))

  switch (spellcastingKind(classIndex)) {
    case 'full':
      return fullCasterSlots(characterLevel)

    // A half caster's slots at level L are a full caster's at ceil(L / 2) —
    // check it against the paladin table and every row matches — except 1st
    // level, where they have no spellcasting at all.
    case 'half':
      return characterLevel < 2 ? {} : fullCasterSlots(Math.ceil(characterLevel / 2))

    case 'pact': {
      const [count, slotLevel] = PACT_MAGIC[characterLevel - 1]
      return { [String(slotLevel)]: { max: count, used: 0 } }
    }

    default:
      return {}
  }
}
