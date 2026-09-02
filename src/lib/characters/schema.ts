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

import { MAX_MASTERED_WEAPONS, type Character } from '@/lib/db/schema'
import { BACKGROUNDS } from '@/lib/srd/backgrounds'
import { SUBCLASSES } from '@/lib/srd/classes'
import { ORIGIN_FEATS } from '@/lib/srd/feats'
import { WEAPONS } from '@/lib/srd/weapons'

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

const ABILITY_KEY_SET = new Set<string>(ABILITIES.map((ability) => ability.key))

/** True for one of the six ability keys — what `backgroundAbilities` may hold. */
export function isAbilityKey(key: string): key is AbilityKey {
  return ABILITY_KEY_SET.has(key)
}

/**
 * The two ways a background's ability score increases can be spent, as the
 * column stores them.
 *
 * Written out rather than derived from `BACKGROUND_ABILITY_SPREADS` because
 * `z.enum` wants a literal tuple and a mapped array is not one — so
 * `schema.test.ts` asserts the two agree instead. `src/lib/srd/backgrounds.ts`
 * stays the source of truth; this is the copy zod can see the shape of.
 */
export const BACKGROUND_SPREAD_KEYS = ['two-and-one', 'one-each'] as const

/** True for an SRD 5.2.1 background index, e.g. `'soldier'`. */
export function isKnownBackground(index: string): boolean {
  return BACKGROUNDS.has(index)
}

/** True for an SRD 5.2.1 Origin feat index, e.g. `'magic-initiate'`. */
export function isKnownOriginFeat(index: string): boolean {
  return ORIGIN_FEATS.has(index)
}

/** True for an SRD 5.2.1 subclass index, e.g. `'champion'` — any class's. */
export function isKnownSubclass(index: string): boolean {
  return SUBCLASSES.has(index)
}

/** True for an SRD 5.2.1 weapon index — the things Weapon Mastery is had *with*. */
export function isKnownWeapon(index: string): boolean {
  return WEAPONS.has(index)
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

  // The 2024 origin block (`srd-2024-migration/character-model-migration`).
  //
  // Plain fields, one choice each, exactly as the rest of this form is: the
  // guided flow that asks them in the right order and works the ability score
  // increases out for you is the `guided-creation` epic, and it will write
  // these same six values.
  //
  // Every one of them is nullable rather than optional, and the difference
  // matters once `.partial()` gets hold of this object below: `null` is "this
  // character has none", which is a real answer — a character copied off paper
  // may have no background written down, and a 1st-level fighter genuinely has
  // no subclass — while *absent* keeps its usual meaning of "leave it alone".
  // Nullable also lines these values up with the columns exactly, so nothing
  // between the form and the row has to translate a blank.
  //
  // Optional *as well as* nullable, and only these six are: a body written
  // before these columns existed has to go on posting a valid character. That
  // is the same promise the migration makes — code that has never heard of the
  // column keeps working against the new table — kept on the wire as well as in
  // the database. `normaliseOriginSelections` reads absent and `null` alike.
  //
  // Cross-field agreement (a subclass belonging to the chosen class, a spread
  // belonging to the chosen background, no more masteries than the class allows
  // at this level) needs two fields at once, so it lives in
  // `normaliseOriginSelections` — this object must stay a plain ZodObject for
  // `.partial()` below.

  /** SRD 5.2.1 background index — where 2024 ability score increases come from. */
  backgroundIndex: z
    .string()
    .refine(isKnownBackground, 'That is not a background this app knows')
    .nullable()
    .optional(),

  /** `'two-and-one'` or `'one-each'` — how the background's increases are spent. */
  backgroundAbilitySpread: z.enum(BACKGROUND_SPREAD_KEYS).nullable().optional(),

  /** The abilities the spread is spent on, in the order it spends them. */
  backgroundAbilities: z
    .array(z.string().refine((key): boolean => isAbilityKey(key), 'That is not an ability score'))
    .max(3, 'A background raises at most three abilities')
    .nullable()
    .optional(),

  /** The Origin feat the background granted. */
  originFeatIndex: z
    .string()
    .refine(isKnownOriginFeat, 'That is not an origin feat this app knows')
    .nullable()
    .optional(),

  /** The subclass, chosen at 3rd level. `null` below it, and `null` is right there. */
  subclassIndex: z
    .string()
    .refine(isKnownSubclass, 'That is not a subclass this app knows')
    .nullable()
    .optional(),

  /** The weapons this character has Weapon Mastery with — weapons, not properties. */
  masteredWeaponIndexes: z
    .array(z.string().refine(isKnownWeapon, 'That is not a weapon this app knows'))
    .max(MAX_MASTERED_WEAPONS, 'That is more weapon masteries than any class grants')
    .nullable()
    .optional(),
})

export type CharacterFormValues = z.infer<typeof characterFormSchema>

/**
 * What `POST /api/characters` accepts: everything the form collects, plus the
 * four things only *creating* a character can say (`guided-creation/wizard-frame`).
 *
 * An extension rather than a second object, so every bound the form enforces is
 * a bound the wire enforces. All four are optional, and the one-page form sends
 * none of them — it posts exactly what it always did, which is the whole point
 * of adding them here rather than widening {@link characterFormSchema}: an edit
 * (`characterPatchSchema`, built from the form schema) must not be able to
 * re-run a character's starting equipment or move them between campaigns.
 */
export const characterCreateSchema = characterFormSchema.extend({
  /** The campaign to attach the finished character to. Membership is re-checked. */
  campaignId: z.uuid('That is not a campaign').nullable().optional(),

  /**
   * The spells readied on day one. `knownSpellIndexes` is the character's book
   * or their cantrips; this is what they have prepared out of the class list
   * (D22's two-list model), and the sheet owns it from then on.
   */
  preparedSpellIndexes: z
    .array(z.string().min(1))
    .max(400, 'That is more spells than the reference data has')
    .optional(),

  /**
   * Which of the SRD's "(a) / (b) / (c)" starting-equipment clauses was taken,
   * by position. A number rather than an item list: the server reads the same
   * SRD data the wizard showed, so a hand-rolled request cannot equip itself
   * with a Holy Avenger at level 1.
   */
  classEquipmentOption: z.number().int().min(0).max(9).optional(),
  backgroundEquipmentOption: z.number().int().min(0).max(9).optional(),
})

export type CharacterCreateValues = z.infer<typeof characterCreateSchema>

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
  // `null` for all six: a character nobody has told us about has no background,
  // and that is what the column holds rather than something spelled empty.
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
}

/**
 * The creation fields as they stand on a stored character (DND-018).
 *
 * What the edit form opens with: the same twenty fields
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
    // The 2024 origin block, straight off the row — the form speaks the same
    // nullable shape the columns do. Arrays still copied, not aliased.
    backgroundIndex: character.backgroundIndex,
    backgroundAbilitySpread: character.backgroundAbilitySpread,
    backgroundAbilities: character.backgroundAbilities && [...character.backgroundAbilities],
    originFeatIndex: character.originFeatIndex,
    subclassIndex: character.subclassIndex,
    masteredWeaponIndexes: character.masteredWeaponIndexes && [...character.masteredWeaponIndexes],
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
