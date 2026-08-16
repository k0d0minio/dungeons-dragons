// Attacks and armour class, derived from equipped items (DND-034, DND-035).
//
// Pure like the rest of this directory: a character row plus the dnd5eapi
// reference details of what they have equipped go in, the numbers a turn
// needs come out. Nothing derived is stored — the row keeps the *choice*
// (which items, `equipped` flags in `character_items`), the reference API
// keeps the weapon's dice, and this module joins the two at render time.
//
// **Deliberate assumption: the character is proficient with whatever they
// chose to equip.** Weapon proficiency by class is not stored (the same gap
// skill proficiency had before DND-015), and a friends-and-family player who
// equips a weapon their class cannot use is making their table's ruling, not
// triggering ours. Every attack bonus below therefore includes the
// proficiency bonus, and the UI footnotes the assumption on screen.
import type { Character } from '@/lib/db/schema'

import { abilityModifier, formatModifier } from './display'
import { proficiencyBonus, spellcastingAbility, type AbilityKey, type AbilityScores } from './rules'

/** A dnd5eapi reference stub — `{ index, name }` is all this module reads. */
export interface ReferenceStub {
  index: string
  name: string
}

/**
 * The slice of a dnd5eapi `/equipment/[index]` payload an attack row needs.
 * Matches the `Equipment` shape `swr-hooks.ts` already declares — this is the
 * typed minimum, so a test fixture stays honest about what is read.
 */
export interface WeaponDetails {
  index?: string
  name: string
  /** `'Melee'` or `'Ranged'` on dnd5eapi weapons. */
  weapon_range?: string
  damage?: {
    damage_dice: string
    damage_type: ReferenceStub
  }
  /** The versatile ("1d10 in two hands") damage, where the weapon has one. */
  two_handed_damage?: {
    damage_dice: string
    damage_type: ReferenceStub
  }
  properties?: ReferenceStub[]
  range?: {
    normal: number
    long?: number
  }
}

/** The columns an attack row is computed from. A `Character` satisfies it. */
export type AttackFields = Pick<
  Character,
  'level' | 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'
>

/** One row of the actions surface: what to roll, and what it does. */
export interface WeaponAttack {
  name: string
  /** d20 bonus: ability modifier + proficiency (assumed — see module note). */
  attackBonus: number
  /** Which ability the attack used, so the UI can say why. */
  ability: AbilityKey
  /** True when the finesse rule chose Dexterity over Strength (or vice versa). */
  finesse: boolean
  ranged: boolean
  /** `"1d8+3 slashing"`, or `null` for a weapon with no damage entry (a net). */
  damage: string | null
  /** The two-handed damage of a versatile weapon, same format, else `null`. */
  versatileDamage: string | null
  /** Range in feet for a ranged weapon, `null` for melee. */
  range: { normal: number; long?: number } | null
}

function hasProperty(weapon: WeaponDetails, index: string): boolean {
  return (weapon.properties ?? []).some((property) => property.index === index)
}

function damageExpression(
  damage: { damage_dice: string; damage_type: ReferenceStub } | undefined,
  modifier: number,
): string | null {
  if (!damage) return null

  const bonus = modifier === 0 ? '' : formatModifier(modifier)
  return `${damage.damage_dice}${bonus} ${damage.damage_type.name.toLowerCase()}`.trim()
}

function scoresOf(character: AttackFields): AbilityScores {
  return {
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
  }
}

/**
 * The attack row for one equipped weapon, per the SRD attack rules
 * (`docs/rules/05-combat.md`): Strength for melee, Dexterity for ranged, and
 * a finesse weapon takes whichever of the two is better. The same modifier
 * lands on attack and damage rolls, plus proficiency on the attack roll only
 * (assumed — see the module note).
 *
 * `name` lets a `custom_name` on the item override the reference name; pass
 * nothing and the weapon's own name is used.
 */
export function weaponAttack(
  character: AttackFields,
  weapon: WeaponDetails,
  name?: string,
): WeaponAttack {
  const ranged = weapon.weapon_range?.toLowerCase() === 'ranged'
  const finesse = hasProperty(weapon, 'finesse')

  const strength = abilityModifier(character.strength)
  const dexterity = abilityModifier(character.dexterity)

  let ability: AbilityKey = ranged ? 'dexterity' : 'strength'
  if (finesse) ability = dexterity >= strength ? 'dexterity' : 'strength'

  const modifier = ability === 'dexterity' ? dexterity : strength

  return {
    name: name ?? weapon.name,
    attackBonus: proficiencyBonus(character.level) + modifier,
    ability,
    finesse,
    ranged,
    damage: damageExpression(weapon.damage, modifier),
    versatileDamage: hasProperty(weapon, 'versatile')
      ? damageExpression(weapon.two_handed_damage, modifier)
      : null,
    range: ranged ? (weapon.range ?? null) : null,
  }
}

/**
 * Spell attack bonus: proficiency + casting ability modifier. `null` for a
 * class that does not cast (and so has no casting ability to add).
 */
export function spellAttackBonus(
  character: AttackFields & Pick<Character, 'classIndex'>,
): number | null {
  const ability = spellcastingAbility(character.classIndex)
  if (!ability) return null

  return proficiencyBonus(character.level) + abilityModifier(scoresOf(character)[ability])
}

/** Spell save DC: 8 + proficiency + casting ability modifier, or `null`. */
export function spellSaveDc(
  character: AttackFields & Pick<Character, 'classIndex'>,
): number | null {
  const bonus = spellAttackBonus(character)
  return bonus === null ? null : 8 + bonus
}

// ---------------------------------------------------------------------------
// Armour class (DND-035)
// ---------------------------------------------------------------------------

/**
 * The slice of a dnd5eapi armour payload AC derivation reads. `armor_class`
 * already encodes the category's dexterity rule: light `{dex_bonus: true}`,
 * medium `{dex_bonus: true, max_bonus: 2}`, heavy `{dex_bonus: false}`.
 */
export interface ArmorDetails {
  index?: string
  name?: string
  /** `'Light' | 'Medium' | 'Heavy' | 'Shield'` on dnd5eapi armour. */
  armor_category?: string
  armor_class?: {
    base: number
    dex_bonus: boolean
    max_bonus?: number
  }
}

/** Where the number on the shield icon came from, so the UI can say. */
export interface DerivedArmorClass {
  value: number
  /**
   * `'equipment'` when body armour drove the number; `'manual'` when the
   * stored `armorClass` column did.
   */
  source: 'equipment' | 'manual'
  shield: boolean
}

function isShield(armor: ArmorDetails): boolean {
  return armor.armor_category?.toLowerCase() === 'shield'
}

/**
 * Armour class from what is equipped (DND-035).
 *
 * **The split, stated once:** with body armour equipped, AC is derived —
 * `base + capped Dex modifier + 2 for a shield` — and the stored `armorClass`
 * column is ignored. With *no* body armour equipped, the stored column stands
 * as the manual/unarmoured value, exactly as before this ticket, and no
 * shield bonus is added on top — a player tracking AC by hand has already
 * counted their shield, and silently adding 2 would double it. Equipping
 * armour is what opts a character into derivation.
 *
 * `equipped` is the reference details of every equipped armour-category item;
 * the first body-armour entry wins (the sheet should not allow two).
 */
export function derivedArmorClass(
  character: Pick<Character, 'armorClass' | 'dexterity'>,
  equipped: readonly ArmorDetails[],
): DerivedArmorClass {
  const shield = equipped.some(isShield)
  const bodyArmor = equipped.find((armor) => !isShield(armor) && armor.armor_class)

  if (!bodyArmor?.armor_class) {
    return { value: character.armorClass, source: 'manual', shield }
  }

  const { base, dex_bonus, max_bonus } = bodyArmor.armor_class
  const dexterity = abilityModifier(character.dexterity)
  const dexContribution = dex_bonus ? Math.min(dexterity, max_bonus ?? Number.POSITIVE_INFINITY) : 0

  return {
    value: base + dexContribution + (shield ? 2 : 0),
    source: 'equipment',
    shield,
  }
}
