import {
  formatArmorClass,
  formatComponents,
  formatCost,
  formatDuration,
  formatMagicItemType,
  formatModifier,
  formatSenses,
  formatSpeed,
  formatSpellLevel,
  formatWeight,
  spellDamageAtSlotLevel,
} from './format'
import { MONSTERS } from './monsters'
import { SPELLS } from './spells'

describe('formatSpellLevel', () => {
  it('names level 0 as a cantrip and the rest by number', () => {
    expect(formatSpellLevel(0)).toBe('Cantrip')
    expect(formatSpellLevel(1)).toBe('Level 1')
    expect(formatSpellLevel(9)).toBe('Level 9')
  })
})

describe('formatComponents', () => {
  it('writes the SRD Components line, material in brackets', () => {
    expect(
      formatComponents({ components: ['V', 'S', 'M'], material: 'a ball of bat guano and sulfur' }),
    ).toBe('V, S, M (a ball of bat guano and sulfur)')
  })

  it('leaves the brackets off a spell with no material component', () => {
    expect(formatComponents({ components: ['V', 'S'], material: null })).toBe('V, S')
  })

  it('is null for a spell that needs no components at all', () => {
    expect(formatComponents({ components: [], material: null })).toBeNull()
  })
})

describe('formatDuration', () => {
  it('prefixes a concentration spell the way the SRD prints it', () => {
    expect(formatDuration({ duration: '1 Minute', concentration: true })).toBe(
      'Concentration, up to 1 Minute',
    )
  })

  it('leaves a non-concentration duration alone', () => {
    expect(formatDuration({ duration: 'Instantaneous', concentration: false })).toBe(
      'Instantaneous',
    )
  })
})

describe('formatModifier', () => {
  it('signs every modifier, zero included', () => {
    expect(formatModifier(3)).toBe('+3')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-1)).toBe('-1')
  })
})

describe('formatSpeed', () => {
  it('leads with the unlabelled walking speed and names the rest', () => {
    const dragon = MONSTERS.get('adult-red-dragon')
    expect(dragon).not.toBeNull()
    expect(formatSpeed(dragon!)).toBe('40 ft., Climb 40 ft., Fly 80 ft.')
  })

  it('omits a movement mode the stat block does not print', () => {
    expect(formatSpeed({ speed: { walk: 30 } })).toBe('30 ft.')
  })

  it('marks a hovering fly speed', () => {
    expect(formatSpeed({ speed: { walk: 0, fly: 40, hover: true } })).toBe(
      '0 ft., Fly 40 ft. (hover)',
    )
  })
})

describe('formatSenses', () => {
  it('names the ranged senses, then Passive Perception', () => {
    const goblin = MONSTERS.get('goblin-warrior')
    expect(goblin).not.toBeNull()
    expect(formatSenses(goblin!)).toBe('Darkvision 60 ft., Passive Perception 9')
  })

  it('drops a sense the creature does not have', () => {
    expect(
      formatSenses({
        senses: { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
        passivePerception: 10,
      }),
    ).toBe('Passive Perception 10')
  })
})

describe('formatMagicItemType', () => {
  it('builds the type line from the structured fields', () => {
    expect(
      formatMagicItemType({
        categoryName: 'Wondrous Items',
        rarity: 'Uncommon',
        attunement: false,
      }),
    ).toBe('Wondrous Items, uncommon')
  })

  it('states attunement from the flag rather than the prose', () => {
    expect(
      formatMagicItemType({ categoryName: 'Rings', rarity: 'Legendary', attunement: true }),
    ).toBe('Rings, legendary (requires attunement)')
  })
})

describe('formatCost and formatWeight', () => {
  it('writes a price in the SRD’s own units', () => {
    expect(formatCost({ quantity: 75, unit: 'gp' })).toBe('75 GP')
    expect(formatCost({ quantity: 5, unit: 'cp' })).toBe('5 CP')
  })

  it('prints an em dash where the SRD table does', () => {
    expect(formatCost(null)).toBe('—')
    expect(formatWeight(null)).toBe('—')
    expect(formatWeight(3)).toBe('3 lb.')
  })
})

describe('formatArmorClass', () => {
  it('writes the Armor table’s dexterity rule', () => {
    expect(formatArmorClass({ base: 11, dexBonus: true, maxBonus: null })).toBe('11 + Dex')
    expect(formatArmorClass({ base: 14, dexBonus: true, maxBonus: 2 })).toBe('14 + Dex (max 2)')
    expect(formatArmorClass({ base: 18, dexBonus: false, maxBonus: 0 })).toBe('18')
  })

  it('is null for anything that is not armour', () => {
    expect(formatArmorClass(null)).toBeNull()
  })
})

describe('spellDamageAtSlotLevel', () => {
  const fireball = SPELLS.get('fireball')

  it('reads the SRD At Higher Levels table by the label the book prints', () => {
    expect(spellDamageAtSlotLevel(fireball!, 3)).toBe('8d6')
    expect(spellDamageAtSlotLevel(fireball!, 5)).toBe('10d6')
  })

  it('is null for a slot the table has no row for', () => {
    expect(spellDamageAtSlotLevel(fireball!, 1)).toBeNull()
    expect(spellDamageAtSlotLevel({ higherLevelDamage: [] }, 3)).toBeNull()
  })
})

// The formatters exist so one spell reads the same everywhere; this is the
// end-to-end check that they agree with the data they are given.
describe('against the shipped data', () => {
  it('formats Fireball as the SRD prints it', () => {
    const fireball = SPELLS.get('fireball')
    expect(fireball).not.toBeNull()
    expect(formatSpellLevel(fireball!.level)).toBe('Level 3')
    expect(formatComponents(fireball!)).toBe('V, S, M (a ball of bat guano and sulfur)')
    expect(formatDuration(fireball!)).toBe('Instantaneous')
  })
})
