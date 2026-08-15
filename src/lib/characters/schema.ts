// The single description of a valid character *submission* (DND-008).
//
// Imported by both sides of the wire: the creation form validates against it in
// the browser via `@hookform/resolvers/zod`, and `POST /api/characters`
// validates the posted JSON against the same object. A hand-rolled request
// therefore cannot write a row the form would have refused.
//
// Bounds are never looser than the CHECK constraints in `src/lib/db/schema.ts`
// — a value that passes here must be insertable. Where zod is *tighter* (the
// upper bounds) it is because `smallint`'s real ceiling is not a number any 5e
// character reaches, and "32767" is a worse error message than "999".
//
// DND-018 added editing on top without a second set of rules: the patch schema
// below is the creation schema made partial, so a bound the form enforces is a
// bound an edit cannot get around either.
import { z, type ZodError } from 'zod'

import type { Character } from '@/lib/db/schema'

/** The six ability scores, in the order character sheets print them. */
export const ABILITIES = [
  { key: 'strength', label: 'Strength', abbreviation: 'STR' },
  { key: 'dexterity', label: 'Dexterity', abbreviation: 'DEX' },
  { key: 'constitution', label: 'Constitution', abbreviation: 'CON' },
  { key: 'intelligence', label: 'Intelligence', abbreviation: 'INT' },
  { key: 'wisdom', label: 'Wisdom', abbreviation: 'WIS' },
  { key: 'charisma', label: 'Charisma', abbreviation: 'CHA' },
] as const

export type AbilityKey = (typeof ABILITIES)[number]['key']

export interface SkillDefinition {
  /** dnd5eapi index, e.g. `sleight-of-hand`. */
  index: string
  label: string
  ability: AbilityKey
}

/**
 * The eighteen SRD skills, alphabetical — the order a printed sheet uses.
 *
 * Defined here rather than in `rules.ts` (which re-exports it) because this
 * module is the shared vocabulary the form schema validates against, and
 * `rules.ts` already imports from here — the other direction would be a cycle.
 */
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

const SKILL_INDEX_SET = new Set(SKILLS.map((skill) => skill.index))

/** True for a skill index this app knows — the values the form may store. */
export function isKnownSkill(index: string): boolean {
  return SKILL_INDEX_SET.has(index)
}

/**
 * A whole number in `[min, max]`, carrying one message for every way it can
 * fail — including the type check.
 *
 * That last part matters: the form registers number inputs with
 * `valueAsNumber`, so an emptied field arrives as `NaN`, not as `undefined`.
 * Zod rejects `NaN` at the type check, and "Level must be a whole number
 * between 1 and 20" is a better thing to read on a phone mid-session than
 * "expected number, received NaN".
 */
function boundedInteger(label: string, min: number, max: number) {
  const message = `${label} must be a whole number between ${min} and ${max}`
  return z.number({ error: message }).int(message).min(min, message).max(max, message)
}

const abilityScore = (label: string) => boundedInteger(label, 1, 30)

/**
 * What the creation form collects. Deliberately *not* the whole `characters`
 * row: hit point tracking, temp HP, conditions, death saves and spell slots are
 * live session state that the sheet owns (DND-009), and every one of them has a
 * schema default that is correct for a character who has not played yet.
 */
export const characterFormSchema = z.object({
  name: z
    .string({ error: 'Give your character a name' })
    .trim()
    .min(1, 'Give your character a name')
    .max(80, 'Names are capped at 80 characters'),

  // dnd5eapi index strings — `"wizard"`, `"half-elf"` — chosen from the
  // reference API, so the sheet can tap through to a detail view.
  classIndex: z.string({ error: 'Pick a class' }).min(1, 'Pick a class'),
  speciesIndex: z.string({ error: 'Pick a species' }).min(1, 'Pick a species'),

  level: boundedInteger('Level', 1, 20),

  strength: abilityScore('Strength'),
  dexterity: abilityScore('Dexterity'),
  constitution: abilityScore('Constitution'),
  intelligence: abilityScore('Intelligence'),
  wisdom: abilityScore('Wisdom'),
  charisma: abilityScore('Charisma'),

  maxHitPoints: boundedInteger('Max HP', 1, 999),
  armorClass: boundedInteger('Armour class', 0, 50),
  speed: boundedInteger('Speed', 0, 200),

  // dnd5eapi spell indexes, filtered by class in the picker. Stored as the
  // character's *known* spells; which of them are prepared on a given day is
  // the sheet's business.
  knownSpellIndexes: z
    .array(z.string().min(1))
    .max(400, 'That is more spells than the reference data has'),

  // Chosen skill proficiencies and expertise (DND-015, D21), as dnd5eapi skill
  // indexes checked against the eighteen the SRD defines. Expertise ⊆
  // proficiencies is cross-field, so it lives in the normalise step — this
  // object must stay a plain ZodObject for `.partial()` below.
  skillProficiencies: z.array(
    z.string().refine(isKnownSkill, 'That is not a skill this app knows'),
  ),
  skillExpertise: z.array(z.string().refine(isKnownSkill, 'That is not a skill this app knows')),
})

export type CharacterFormValues = z.infer<typeof characterFormSchema>

/**
 * What an empty form starts as.
 *
 * Ability scores start at 10 (the 5e "no modifier" score) and AC/speed at the
 * unarmoured human baseline, so a player only edits what differs from average.
 * Max HP has no honest default — 10 is a placeholder the player must look at,
 * which is why it is a visible number rather than a blank field that silently
 * saves as zero.
 */
export const CHARACTER_FORM_DEFAULTS: CharacterFormValues = {
  name: '',
  classIndex: '',
  speciesIndex: '',
  level: 1,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  maxHitPoints: 10,
  armorClass: 10,
  speed: 30,
  knownSpellIndexes: [],
  skillProficiencies: [],
  skillExpertise: [],
}

/**
 * The creation fields as they stand on a stored character (DND-018).
 *
 * What the edit form opens with: the same fourteen fields
 * {@link CHARACTER_FORM_DEFAULTS} names, read off the row rather than defaulted,
 * so the form starts as a copy of the character rather than as a blank.
 */
export function characterFormValuesOf(character: Character): CharacterFormValues {
  return {
    name: character.name,
    classIndex: character.classIndex,
    speciesIndex: character.speciesIndex,
    level: character.level,
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    maxHitPoints: character.maxHitPoints,
    armorClass: character.armorClass,
    speed: character.speed,
    // Copied, not aliased: the form mutates its own arrays as picks are made.
    knownSpellIndexes: [...character.knownSpellIndexes],
    skillProficiencies: [...character.skillProficiencies],
    skillExpertise: [...character.skillExpertise],
  }
}

/**
 * What `PATCH /api/characters/[id]` accepts as an edit to a character's build
 * (DND-018).
 *
 * `characterFormSchema.partial()` rather than a second object: every rule —
 * the name cap, the 1–30 ability range, the 1–20 level — is the one the
 * creation form already enforces, and a rule changed in one place changes for
 * both. Partial because an edit is allowed to name only what it is changing;
 * the form happens to send the whole set.
 *
 * Level is editable here as a plain number, and stays one: re-deriving hit
 * points, spell slots and the spell list from it is the guided level-up flow in
 * `level-up.ts`, behind `POST /api/characters/[id]/level` (DND-032). A build
 * edit that happens to change the level does not silently pull the rules layer
 * in behind it — correcting a mistyped 5 to a 4 is not the same act as
 * levelling down, and only one of them should touch spell slots.
 */
export const characterPatchSchema = characterFormSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Nothing to change' })

export type CharacterPatchValues = z.infer<typeof characterPatchSchema>

/**
 * Deduplicate skill picks and hold expertise to its invariant: expertise ⊆
 * proficiencies (D21 — a skill cannot be doubled that is not proficient at
 * all). Filtering rather than rejecting, because the two arrays arrive from
 * the same form and the picker cannot produce the bad state — only a
 * hand-rolled request can, and dropping the stray entry writes exactly what
 * the form would have.
 */
export function normaliseSkillSelections(
  proficiencies: readonly string[],
  expertise: readonly string[],
): { skillProficiencies: string[]; skillExpertise: string[] } {
  const skillProficiencies = Array.from(new Set(proficiencies))
  const chosen = new Set(skillProficiencies)

  return {
    skillProficiencies,
    skillExpertise: Array.from(new Set(expertise)).filter((skill) => chosen.has(skill)),
  }
}

/**
 * Bring a validated edit into line with the character it is being applied to.
 *
 * Zod can say "1 to 999 hit points"; only the stored row knows this wizard is
 * standing at 24 of them. Lowering a maximum past where the character currently
 * stands would leave the sheet rendering "24/12" — a state no combat transition
 * can produce and none of them expects to read — so current hit points come
 * down with the maximum. Raising it heals nobody: that is a rest, not an edit.
 *
 * Duplicate spell indexes are dropped for the same reason `POST /api/characters`
 * drops them — the picker cannot produce one, a hand-rolled request can, and the
 * sheet would render it twice. Skill picks get the same treatment, plus the
 * expertise ⊆ proficiencies invariant — checked against the proficiencies the
 * row will hold *after* the patch, so shrinking the proficiency list also
 * trims any expertise it strands.
 */
export function normaliseCharacterPatch(
  patch: CharacterPatchValues,
  character: Character,
): CharacterPatchValues & { currentHitPoints?: number } {
  const normalised: CharacterPatchValues & { currentHitPoints?: number } = { ...patch }

  if (patch.knownSpellIndexes !== undefined) {
    normalised.knownSpellIndexes = Array.from(new Set(patch.knownSpellIndexes))
  }

  if (patch.skillProficiencies !== undefined || patch.skillExpertise !== undefined) {
    const selections = normaliseSkillSelections(
      patch.skillProficiencies ?? character.skillProficiencies,
      patch.skillExpertise ?? character.skillExpertise,
    )

    if (patch.skillProficiencies !== undefined) {
      normalised.skillProficiencies = selections.skillProficiencies
    }

    // Written whenever it changed, even if the patch never named it: a patch
    // that only shrinks proficiencies must not leave expertise pointing at a
    // skill the character is no longer proficient in.
    if (
      patch.skillExpertise !== undefined ||
      selections.skillExpertise.length !== character.skillExpertise.length
    ) {
      normalised.skillExpertise = selections.skillExpertise
    }
  }

  if (patch.maxHitPoints !== undefined && character.currentHitPoints > patch.maxHitPoints) {
    normalised.currentHitPoints = patch.maxHitPoints
  }

  return normalised
}

/**
 * First message per field, keyed by field name — what the form renders against
 * its inputs. Shared by the create and edit routes so a rejected save looks the
 * same whichever one refused it.
 */
export function fieldErrorsOf(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    // `path` is empty for an issue about the object itself (a posted array, say).
    const field = issue.path.join('.') || 'form'
    errors[field] ??= issue.message
  }

  return errors
}
