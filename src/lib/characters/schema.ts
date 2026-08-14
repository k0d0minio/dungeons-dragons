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
import { z } from 'zod'

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
}
