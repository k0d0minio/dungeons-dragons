import {
  derivedArmorClass,
  spellAttackBonus,
  spellSaveDc,
  weaponAttack,
  type ArmorDetails,
  type AttackFields,
  type WeaponDetails,
} from './attacks'

// A 5th-level character (+3 proficiency): STR +3, DEX +1 unless overridden.
const FIGHTER: AttackFields = {
  level: 5,
  strength: 16,
  dexterity: 12,
  constitution: 14,
  intelligence: 10,
  wisdom: 10,
  charisma: 8,
}

const LONGSWORD: WeaponDetails = {
  index: 'longsword',
  name: 'Longsword',
  weapon_range: 'Melee',
  damage: { damage_dice: '1d8', damage_type: { index: 'slashing', name: 'Slashing' } },
  two_handed_damage: { damage_dice: '1d10', damage_type: { index: 'slashing', name: 'Slashing' } },
  properties: [{ index: 'versatile', name: 'Versatile' }],
}

const DAGGER: WeaponDetails = {
  index: 'dagger',
  name: 'Dagger',
  weapon_range: 'Melee',
  damage: { damage_dice: '1d4', damage_type: { index: 'piercing', name: 'Piercing' } },
  properties: [
    { index: 'finesse', name: 'Finesse' },
    { index: 'thrown', name: 'Thrown' },
  ],
  range: { normal: 20, long: 60 },
}

const LONGBOW: WeaponDetails = {
  index: 'longbow',
  name: 'Longbow',
  weapon_range: 'Ranged',
  damage: { damage_dice: '1d8', damage_type: { index: 'piercing', name: 'Piercing' } },
  properties: [{ index: 'ammunition', name: 'Ammunition' }],
  range: { normal: 150, long: 600 },
}

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

  it('handles a weapon with no damage entry', () => {
    const net: WeaponDetails = { index: 'net', name: 'Net', weapon_range: 'Ranged' }

    expect(weaponAttack(FIGHTER, net).damage).toBeNull()
  })

  it('lets a custom item name override the reference name', () => {
    expect(weaponAttack(FIGHTER, LONGSWORD, 'Oathkeeper').name).toBe('Oathkeeper')
    expect(weaponAttack(FIGHTER, LONGSWORD).name).toBe('Longsword')
  })
})

describe('spellAttackBonus and spellSaveDc', () => {
  const wizard: AttackFields & { classIndex: string } = {
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
})

describe('derivedArmorClass', () => {
  const LEATHER: ArmorDetails = {
    name: 'Leather Armor',
    armor_category: 'Light',
    armor_class: { base: 11, dex_bonus: true },
  }
  const HALF_PLATE: ArmorDetails = {
    name: 'Half Plate',
    armor_category: 'Medium',
    armor_class: { base: 15, dex_bonus: true, max_bonus: 2 },
  }
  const PLATE: ArmorDetails = {
    name: 'Plate',
    armor_category: 'Heavy',
    armor_class: { base: 18, dex_bonus: false },
  }
  const SHIELD: ArmorDetails = {
    name: 'Shield',
    armor_category: 'Shield',
    armor_class: { base: 2, dex_bonus: false },
  }

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
