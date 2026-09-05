// Attacks and armour class, derived from equipped items (DND-034, DND-035), on
// the 2024 baseline (`srd-2024-migration/rules-engine-2024`).
//
// Pure like the rest of this directory: a character row plus the reference
// details of what they have equipped go in, the numbers a turn needs come out.
// Nothing derived is stored — the row keeps the *choice* (which items,
// `equipped` flags in `character_items`), the reference data keeps the weapon's
// dice, and this module joins the two at render time.
//
// One reference source now, where there used to be two: everything an attack
// row needs — dice, range, properties and the 2024 mastery property — comes
// from the local SRD 5.2.1 weapon table, looked up by the index the inventory
// is keyed on (`srd-2024-migration/long-tail-reference-data` retired the 2014
// proxy that used to supply the first three). Armour class still reads a
// fetched equipment row, because the AC columns live on the 182-row equipment
// set rather than the 38-row weapon table.
//
// **Deliberate assumption: the character is proficient with whatever they
// chose to equip.** Weapon proficiency by class is not stored (the same gap
// skill proficiency had before DND-015), and a friends-and-family player who
// equips a weapon their class cannot use is making their table's ruling, not
// triggering ours. Every attack bonus below therefore includes the
// proficiency bonus, and the UI footnotes the assumption on screen. Weapon
// mastery is the one place that assumption is *not* extended: whether a
// character may use a mastery property is a class question with a clear answer
// (five classes have the feature, seven do not), so the row says which it is
// rather than quietly promising Topple to a wizard.
import type { Character } from '@/lib/db/schema'
import type { SrdDamage, SrdWeapon, SrdWeaponMastery } from '@/lib/srd/types'

import { abilityModifier, formatModifier } from './display'
import {
  exhaustionD20Penalty,
  hasWeaponMastery,
  proficiencyBonus,
  spellcastingAbility,
  weaponMastery,
  type AbilityKey,
  type AbilityScores,
} from './rules'

/**
 * What an attack row is computed from: an SRD 5.2.1 weapon, whole.
 *
 * A named alias rather than `SrdWeapon` inline, because a call site reads
 * better as "weapon details" and because this is the seam a test fixture
 * satisfies.
 */
export type WeaponDetails = SrdWeapon

/**
 * The columns an attack row is computed from. A `Character` satisfies it.
 *
 * `classIndex` is in here for weapon mastery and spell attacks, and
 * `exhaustion` because an attack roll is a D20 Test: 2024 Exhaustion takes 2
 * off every one of them per level, and an attack bonus printed without it is
 * the wrong number in the direction that misses.
 */
export type AttackFields = Pick<
  Character,
  | 'classIndex'
  | 'level'
  | 'exhaustion'
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma'
> & {
  /**
   * The weapons this character chose to master
   * (`first-table/creation-readiness` picks them from the kit). Optional and
   * nullable: a row written before the choice existed, or a caller that does
   * not carry the column, reads as "no choice recorded", and then the class
   * alone decides — every weapon a mastery class holds shows its property.
   */
  masteredWeaponIndexes?: readonly string[] | null
}

/** The mastery property a weapon carries, and whether this character may use it. */
export interface AttackMastery {
  index: string
  name: string
  /** The SRD text of the property — what Vex or Topple actually does. */
  description: string
  /**
   * True when this character may use the property: their class has the Weapon
   * Mastery feature, and either this weapon is one of the ones they chose or
   * no choice has been recorded yet (a row from before the choice existed
   * reads as "your class can use this", which is the honest claim for it).
   */
  available: boolean
  /** Why not, when not: the class lacks the feature, or the weapon was not chosen. */
  whyNot: 'class' | 'unchosen' | null
}

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
  /**
   * The weapon's 2024 mastery property, or `null` for a weapon the local SRD
   * table does not describe — a custom item, or an index left over from the
   * 2014 data that SRD 5.2.1 does not define.
   */
  mastery: AttackMastery | null
  /** What Exhaustion is taking off the attack roll: 0, or −2 per level. */
  exhaustionPenalty: number
}

function hasProperty(weapon: WeaponDetails, index: string): boolean {
  return weapon.properties.includes(index)
}

function damageExpression(damage: SrdDamage | null, modifier: number): string | null {
  if (!damage) return null

  const bonus = modifier === 0 ? '' : formatModifier(modifier)
  return `${damage.dice}${bonus} ${damage.type}`.trim()
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
  const ranged = weapon.kind === 'ranged'
  const finesse = hasProperty(weapon, 'finesse')

  const strength = abilityModifier(character.strength)
  const dexterity = abilityModifier(character.dexterity)

  let ability: AbilityKey = ranged ? 'dexterity' : 'strength'
  if (finesse) ability = dexterity >= strength ? 'dexterity' : 'strength'

  const modifier = ability === 'dexterity' ? dexterity : strength
  const exhaustionPenalty = exhaustionD20Penalty(character.exhaustion)

  return {
    name: name ?? weapon.name,
    attackBonus: proficiencyBonus(character.level) + modifier + exhaustionPenalty,
    ability,
    finesse,
    ranged,
    damage: damageExpression(weapon.damage, modifier),
    versatileDamage: hasProperty(weapon, 'versatile')
      ? damageExpression(weapon.twoHandedDamage, modifier)
      : null,
    range: ranged ? (weapon.range ?? null) : null,
    mastery: attackMastery(character, weapon.index),
    exhaustionPenalty,
  }
}

/**
 * The mastery row for one weapon: the SRD property it carries, plus whether
 * this character may use it — their class has the feature, and the weapon is
 * one they chose (or no choice is on record yet, in which case the class is
 * the whole answer).
 *
 * `null` when the weapon has no index to look up, or when SRD 5.2.1 has no
 * weapon by that index — a custom “my uncle's axe” does not resolve, and
 * inventing Topple for it would be worse than saying nothing.
 */
function attackMastery(
  character: Pick<AttackFields, 'classIndex' | 'masteredWeaponIndexes'>,
  weaponIndex: string | undefined,
): AttackMastery | null {
  if (!weaponIndex) return null

  const mastery: SrdWeaponMastery | null = weaponMastery(weaponIndex)
  if (!mastery) return null

  const hasFeature = hasWeaponMastery(character.classIndex)
  const chosen = character.masteredWeaponIndexes ?? []
  const isChosen = chosen.length === 0 || chosen.includes(weaponIndex)

  return {
    index: mastery.index,
    name: mastery.name,
    description: mastery.description,
    available: hasFeature && isChosen,
    whyNot: !hasFeature ? 'class' : !isChosen ? 'unchosen' : null,
  }
}

/** The Unarmed Strike row: no weapon, three things it can do. */
export interface UnarmedStrike {
  /** d20 bonus: Strength + proficiency, minus Exhaustion. */
  attackBonus: number
  /** Bludgeoning damage on a hit — a flat number, not dice: 1 + Strength. */
  damage: number
  /**
   * The DC a Grapple or Shove target rolls against: 8 + Strength +
   * proficiency. Exhaustion is out of it for the same reason it is out of
   * {@link spellSaveDc} — a DC is not a D20 Test the character makes.
   */
  saveDc: number
  /** What Exhaustion is taking off the attack roll: 0, or −2 per level. */
  exhaustionPenalty: number
}

/**
 * The Unarmed Strike (SRD 5.2.1, `docs/rules/01-core-mechanics.md`): every
 * character has one, so it is derived from the row alone rather than from
 * anything equipped.
 *
 * Strength always — no finesse option, whatever the monk's Dexterity says —
 * plus proficiency, which needs no assumption here: everyone is proficient
 * with their own fists. Damage is `1 + Strength modifier` and floors at zero,
 * because a Strength of 8 does not heal what it punches. The save DC is the
 * one the Grapple and Shove options force, and it is on this row because those
 * two are what an Unarmed Strike is usually *for*.
 */
export function unarmedStrike(character: AttackFields): UnarmedStrike {
  const strength = abilityModifier(character.strength)
  const proficiency = proficiencyBonus(character.level)
  const exhaustionPenalty = exhaustionD20Penalty(character.exhaustion)

  return {
    attackBonus: proficiency + strength + exhaustionPenalty,
    damage: Math.max(0, 1 + strength),
    saveDc: 8 + proficiency + strength,
    exhaustionPenalty,
  }
}

/**
 * Spell attack bonus: proficiency + casting ability modifier. `null` for a
 * class that does not cast (and so has no casting ability to add).
 */
export function spellAttackBonus(character: AttackFields): number | null {
  const ability = spellcastingAbility(character.classIndex)
  if (!ability) return null

  return (
    proficiencyBonus(character.level) +
    abilityModifier(scoresOf(character)[ability]) +
    exhaustionD20Penalty(character.exhaustion)
  )
}

/**
 * Spell save DC: 8 + proficiency + casting ability modifier, or `null`.
 *
 * Exhaustion is deliberately *not* in here, even though it is in the attack
 * bonus above. A save DC is a number the caster's enemies roll against, not a
 * D20 Test the caster makes, and 2024 Exhaustion only touches the latter.
 */
export function spellSaveDc(character: AttackFields): number | null {
  const ability = spellcastingAbility(character.classIndex)
  if (!ability) return null

  return 8 + proficiencyBonus(character.level) + abilityModifier(scoresOf(character)[ability])
}

// ---------------------------------------------------------------------------
// Armour class (DND-035)
// ---------------------------------------------------------------------------

/**
 * The slice of an SRD equipment row AC derivation reads. `armorClass` already
 * encodes the category's dexterity rule: light `{dexBonus: true}`, medium
 * `{dexBonus: true, maxBonus: 2}`, heavy `{dexBonus: false}`.
 */
export interface ArmorDetails {
  index?: string
  name?: string
  /** Category indexes — `['armor', 'medium-armor']`, or `shields` for a shield. */
  categories?: string[]
  armorClass?: {
    base: number
    dexBonus: boolean
    maxBonus: number | null
  } | null
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

/**
 * True for a shield rather than body armour — the `shields` category is what
 * the SRD equipment rows carry, and it is the only thing that separates the two
 * for AC purposes.
 *
 * Exported so the creation wizard can ask the same question of the gear it is
 * about to hand out as the sheet asks of the gear already worn
 * (`guided-creation/derived-defaults`).
 */
export function isShield(armor: ArmorDetails): boolean {
  return armor.categories?.includes('shields') ?? false
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
  const bodyArmor = equipped.find((armor) => !isShield(armor) && armor.armorClass)

  if (!bodyArmor?.armorClass) {
    return { value: character.armorClass, source: 'manual', shield }
  }

  const { base, dexBonus, maxBonus } = bodyArmor.armorClass
  const dexterity = abilityModifier(character.dexterity)
  const dexContribution = dexBonus ? Math.min(dexterity, maxBonus ?? Number.POSITIVE_INFINITY) : 0

  return {
    value: base + dexContribution + (shield ? 2 : 0),
    source: 'equipment',
    shield,
  }
}
