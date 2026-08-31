import { EQUIPMENT } from '@/lib/srd/equipment'
import { WEAPONS } from '@/lib/srd/weapons'

import {
  derivedArmorClass,
  spellAttackBonus,
  spellSaveDc,
  weaponAttack,
  type ArmorDetails,
  type AttackFields,
  type WeaponDetails,
} from './attacks'

/** The real SRD 5.2.1 row, so these cases fail if the data stops matching. */
function weapon(index: string): WeaponDetails {
  const entry = WEAPONS.get(index)
  if (!entry) throw new Error(`no SRD weapon "${index}"`)
  return entry
}

function armor(index: string): ArmorDetails {
  const entry = EQUIPMENT.get(index)
  if (!entry) throw new Error(`no SRD equipment "${index}"`)
  return entry
}

// A 5th-level character (+3 proficiency): STR +3, DEX +1 unless overridden.
const FIGHTER: AttackFields = {
  classIndex: 'fighter',
  level: 5,
  exhaustion: 0,
  strength: 16,
  dexterity: 12,
  constitution: 14,
  intelligence: 10,
  wisdom: 10,
  charisma: 8,
}

const LONGSWORD = weapon('longsword')
const DAGGER = weapon('dagger')
const LONGBOW = weapon('longbow')

describe('weaponAttack', () => {
  it('uses Strength plus proficiency for a melee weapon', () => {
    const attack = weaponAttack(FIGHTER, LONGSWORD)

    // +3 proficiency (assumed — the module's stated ruling) + 3 STR.
    expect(attack.attackBonus).toBe(6)
    expect(attack.ability).toBe('strength')
    expect(attack.damage).toBe('1d8+3 slashing')
  })

  it('uses Dexterity for a ranged weapon', () => {
    const attack = weaponAttack(FIGHTER, LONGBOW)

    expect(attack.attackBonus).toBe(4)
    expect(attack.ability).toBe('dexterity')
    expect(attack.ranged).toBe(true)
    expect(attack.range).toEqual({ normal: 150, long: 600 })
  })

  it('gives a finesse weapon the better of Strength and Dexterity', () => {
    // STR +3 beats DEX +1: a strong fighter stabs with Strength.
    expect(weaponAttack(FIGHTER, DAGGER).ability).toBe('strength')

    // The rogue-shaped inverse: DEX +4 beats STR +0.
    const rogue = { ...FIGHTER, strength: 10, dexterity: 18 }
    const attack = weaponAttack(rogue, DAGGER)

    expect(attack.ability).toBe('dexterity')
    expect(attack.attackBonus).toBe(7)
    expect(attack.damage).toBe('1d4+4 piercing')
    expect(attack.finesse).toBe(true)
  })

  it('carries a negative modifier into the damage string', () => {
    const weakling = { ...FIGHTER, strength: 6 }

    expect(weaponAttack(weakling, LONGSWORD).damage).toBe('1d8-2 slashing')
  })

  it('omits a zero modifier from the damage string', () => {
    const average = { ...FIGHTER, strength: 10 }

    expect(weaponAttack(average, LONGSWORD).damage).toBe('1d8 slashing')
  })

  it('shows versatile two-handed damage only for a versatile weapon', () => {
    expect(weaponAttack(FIGHTER, LONGSWORD).versatileDamage).toBe('1d10+3 slashing')
    expect(weaponAttack(FIGHTER, DAGGER).versatileDamage).toBeNull()
  })

  // Every SRD 5.2.1 weapon deals damage — the 2014 Net, which did not, is gone
  // from the table — so this one stays synthetic. It guards the `null` branch
  // for a row that ever arrives without a damage die.
  it('handles a weapon with no damage entry', () => {
    const net: WeaponDetails = { ...LONGBOW, index: 'net', name: 'Net', damage: null }

    expect(weaponAttack(FIGHTER, net).damage).toBeNull()
  })

  it('lets a custom item name override the reference name', () => {
    expect(weaponAttack(FIGHTER, LONGSWORD, 'Oathkeeper').name).toBe('Oathkeeper')
    expect(weaponAttack(FIGHTER, LONGSWORD).name).toBe('Longsword')
  })

  it('takes 2 per exhaustion level off the attack roll, not the damage (2024)', () => {
    const tired = { ...FIGHTER, exhaustion: 2 }
    const attack = weaponAttack(tired, LONGSWORD)

    expect(attack.attackBonus).toBe(2)
    expect(attack.exhaustionPenalty).toBe(-4)
    // Damage is not a D20 Test — the Strength modifier stands.
    expect(attack.damage).toBe('1d8+3 slashing')
  })

  it('names the weapon’s 2024 mastery property, and who may use it', () => {
    const attack = weaponAttack(FIGHTER, LONGSWORD)

    expect(attack.mastery).toEqual({
      index: 'sap',
      name: 'Sap',
      description: expect.any(String),
      available: true,
    })
    // A longbow's is Slow; the property is the weapon's, not the class's.
    expect(weaponAttack(FIGHTER, LONGBOW).mastery?.name).toBe('Slow')
  })

  it('names it for a class that cannot use it, rather than hiding it', () => {
    const wizard = { ...FIGHTER, classIndex: 'wizard' }

    expect(weaponAttack(wizard, LONGSWORD).mastery).toMatchObject({
      name: 'Sap',
      available: false,
    })
  })

  it('has no mastery for a weapon SRD 5.2.1 does not describe', () => {
    const relic: WeaponDetails = { ...LONGSWORD, index: 'my-uncles-axe', name: "My uncle's axe" }
    const unindexed: WeaponDetails = { ...LONGSWORD, index: '', name: 'Something borrowed' }

    expect(weaponAttack(FIGHTER, relic).mastery).toBeNull()
    expect(weaponAttack(FIGHTER, unindexed).mastery).toBeNull()
  })
})

describe('spellAttackBonus and spellSaveDc', () => {
  const wizard: AttackFields = {
    ...FIGHTER,
    classIndex: 'wizard',
    intelligence: 18,
  }

  it('is proficiency plus the casting ability modifier', () => {
    // +3 proficiency + 4 INT.
    expect(spellAttackBonus(wizard)).toBe(7)
    expect(spellSaveDc(wizard)).toBe(15)
  })

  it('reads the casting ability off the class', () => {
    const cleric = { ...wizard, classIndex: 'cleric', wisdom: 16 }

    expect(spellAttackBonus(cleric)).toBe(6)
  })

  it('is null for a class with no spellcasting', () => {
    const fighter = { ...wizard, classIndex: 'fighter' }

    expect(spellAttackBonus(fighter)).toBeNull()
    expect(spellSaveDc(fighter)).toBeNull()
  })

  it('drags the attack roll down with exhaustion but leaves the save DC alone', () => {
    const tired = { ...wizard, exhaustion: 2 }

    // The attack roll is a D20 Test the caster makes; the DC is not.
    expect(spellAttackBonus(tired)).toBe(3)
    expect(spellSaveDc(tired)).toBe(15)
  })
})

describe('derivedArmorClass', () => {
  // The real SRD 5.2.1 Armor table: Leather 11 + Dex, Half Plate 15 + Dex
  // (max 2), Plate 18, Shield +2.
  const LEATHER = armor('leather-armor')
  const HALF_PLATE = armor('half-plate-armor')
  const PLATE = armor('plate-armor')
  const SHIELD = armor('shield')

  it('adds the full Dexterity modifier to light armour', () => {
    const nimble = { armorClass: 10, dexterity: 18 }

    expect(derivedArmorClass(nimble, [LEATHER])).toEqual({
      value: 15,
      source: 'equipment',
      shield: false,
    })
  })

  it('caps medium armour’s Dexterity at +2', () => {
    expect(derivedArmorClass({ armorClass: 10, dexterity: 18 }, [HALF_PLATE]).value).toBe(17)
    // A negative modifier is not capped away — it applies in full.
    expect(derivedArmorClass({ armorClass: 10, dexterity: 6 }, [HALF_PLATE]).value).toBe(13)
  })

  it('gives heavy armour no Dexterity at all, either way', () => {
    expect(derivedArmorClass({ armorClass: 10, dexterity: 18 }, [PLATE]).value).toBe(18)
    expect(derivedArmorClass({ armorClass: 10, dexterity: 6 }, [PLATE]).value).toBe(18)
  })

  it('adds 2 for a shield on top of body armour', () => {
    const result = derivedArmorClass({ armorClass: 10, dexterity: 14 }, [HALF_PLATE, SHIELD])

    expect(result).toEqual({ value: 19, source: 'equipment', shield: true })
  })

  it('falls back to the stored column when nothing is equipped', () => {
    // The manual value stands untouched — including any shield the player
    // already counted by hand. Equipping armour is what opts into derivation.
    expect(derivedArmorClass({ armorClass: 13, dexterity: 18 }, [])).toEqual({
      value: 13,
      source: 'manual',
      shield: false,
    })
    expect(derivedArmorClass({ armorClass: 13, dexterity: 18 }, [SHIELD])).toEqual({
      value: 13,
      source: 'manual',
      shield: true,
    })
  })
})
