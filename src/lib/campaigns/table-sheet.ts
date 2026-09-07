// A character sheet as the room may read it (`dm-run-suite/table-screen-cast`).
//
// The table screen answers to a token, not a session, so this is the widest
// projection of a character in the app and every field on it had to earn its
// place. The question it answers is the one the DM casts a sheet to answer —
// *"this is what your character is"*, said to five people who are learning the
// game and one of whom owns it.
//
// **What is here** is the front page of a paper sheet: who they are, the three
// numbers a turn is played off (AC, HP, Speed), the six abilities with the
// modifiers spelled out, the saves, the skills, and whatever is currently
// wrong with them.
//
// **What is deliberately not** — and the list is the safety property, so it is
// written down rather than left as an absence:
//
// - **Coins and inventory.** What a character is carrying is theirs, and a
//   party that can read each other's purses across the table is a different
//   game from the one Jamie is running.
// - **Notes of any kind** — the player's own, and emphatically the DM's private
//   note about the character (`character_dm_notes`), which is not selected by
//   the statement that feeds this and could not be rendered by it.
// - **Spells known and prepared, class resources, spell slots, hit dice, death
//   saves, experience.** Live bookkeeping the owner's phone is for. None of it
//   makes the sentence "this is what your character is" any truer, and each is
//   a thing that would be wrong within a round.
// - **Anything identifying the account** — no owner id, no email.
//
// Pure, and given plain values rather than a database row, so the projection
// is testable without a database and so the *selection* stays visible at the
// call site in `src/lib/db/table.ts`.
import { derivedArmorClass, type ArmorDetails } from '@/lib/characters/attacks'
import { abilityModifier } from '@/lib/characters/display'
import {
  ABILITIES,
  BACKGROUNDS,
  effectiveSpeed,
  initiativeModifier,
  passivePerception,
  proficiencyBonus,
  savingThrows,
  skillChecks,
  SUBCLASSES,
  type AbilityScores,
} from '@/lib/characters/rules'
import { CLASSES } from '@/lib/srd/classes'
import { SPECIES } from '@/lib/srd/species'

/** One ability, as the screen prints it: the score, and what it is worth. */
export interface TableSheetAbility {
  key: string
  label: string
  abbreviation: string
  score: number
  modifier: number
}

/** One save or skill: a name, a number, and whether training is behind it. */
export interface TableSheetCheck {
  label: string
  modifier: number
  proficient: boolean
  /** Skills only — doubled proficiency. Always false for a saving throw. */
  expertise: boolean
}

/** The whole of what a cast character sheet says. */
export interface TableSheet {
  name: string
  /** "Level 3 Wood Elf Rogue" is assembled by the screen from these three. */
  level: number
  speciesLabel: string
  classLabel: string
  subclassLabel: string | null
  backgroundLabel: string | null
  armorClass: number
  hitPoints: { current: number; max: number; temp: number }
  speed: number
  initiative: number
  proficiencyBonus: number
  passivePerception: number
  abilities: TableSheetAbility[]
  savingThrows: TableSheetCheck[]
  skills: TableSheetCheck[]
  /** SRD condition indexes, as the sheet holds them. */
  conditions: string[]
  exhaustion: number
  /** ISO 8601 when a portrait was uploaded, or `null`. Never the store key. */
  portraitUploadedAt: string | null
}

/** Exactly the columns the projection reads — the selection, said as a type. */
export interface TableSheetSource {
  name: string
  level: number
  speciesIndex: string
  classIndex: string
  subclassIndex: string | null
  backgroundIndex: string | null
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  armorClass: number
  currentHitPoints: number
  maxHitPoints: number
  temporaryHitPoints: number
  speed: number
  conditions: string[]
  exhaustion: number
  skillProficiencies: string[]
  skillExpertise: string[]
}

/** An index the SRD has never heard of prints as itself, never as blank. */
function labelOr(index: string, name: string | undefined): string {
  return name ?? index
}

/**
 * The projection. `armor` is what the character has equipped, so the AC on the
 * wall is the AC on their own sheet — derived from worn armour where there is
 * some, and the stored column where there is not (DND-035).
 */
export function tableSheet(
  source: TableSheetSource,
  armor: readonly ArmorDetails[],
  portraitUploadedAt: string | null,
): TableSheet {
  const scores: AbilityScores = {
    strength: source.strength,
    dexterity: source.dexterity,
    constitution: source.constitution,
    intelligence: source.intelligence,
    wisdom: source.wisdom,
    charisma: source.charisma,
  }

  const selections = {
    level: source.level,
    skillProficiencies: source.skillProficiencies,
    skillExpertise: source.skillExpertise,
    exhaustion: source.exhaustion,
  }

  return {
    name: source.name,
    level: source.level,
    speciesLabel: labelOr(source.speciesIndex, SPECIES.get(source.speciesIndex)?.name),
    classLabel: labelOr(source.classIndex, CLASSES.get(source.classIndex)?.name),
    subclassLabel: source.subclassIndex
      ? labelOr(source.subclassIndex, SUBCLASSES.get(source.subclassIndex)?.name)
      : null,
    backgroundLabel: source.backgroundIndex
      ? labelOr(source.backgroundIndex, BACKGROUNDS.get(source.backgroundIndex)?.name)
      : null,
    armorClass: derivedArmorClass(source, armor).value,
    hitPoints: {
      current: source.currentHitPoints,
      max: source.maxHitPoints,
      temp: source.temporaryHitPoints,
    },
    // Both after Exhaustion, because both are what the character can actually
    // do right now — the columns hold the unexhausted numbers, and a screen
    // that printed those beside a visible Exhaustion badge would be lying.
    speed: effectiveSpeed(source.speed, source.exhaustion),
    initiative: initiativeModifier(scores, source.exhaustion),
    proficiencyBonus: proficiencyBonus(source.level),
    passivePerception: passivePerception(scores, source.classIndex, selections),
    abilities: ABILITIES.map((ability) => ({
      key: ability.key,
      label: ability.label,
      abbreviation: ability.abbreviation,
      score: scores[ability.key],
      modifier: abilityModifier(scores[ability.key]),
    })),
    savingThrows: savingThrows(scores, source.classIndex, source.level, source.exhaustion).map(
      (save) => ({
        label: save.label,
        modifier: save.modifier,
        proficient: save.proficient,
        expertise: false,
      }),
    ),
    skills: skillChecks(scores, source.classIndex, selections).map((skill) => ({
      label: skill.label,
      modifier: skill.modifier,
      proficient: skill.proficient,
      expertise: skill.expertise,
    })),
    conditions: source.conditions,
    exhaustion: source.exhaustion,
    portraitUploadedAt,
  }
}
