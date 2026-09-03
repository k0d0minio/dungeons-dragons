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
  monsterActionNumbers,
  speedParts,
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

describe('speedParts', () => {
  it('leads with the unlabelled walking speed and names the rest', () => {
    expect(speedParts({ speed: { walk: 30, fly: 60 } })).toEqual(['30 ft.', 'Fly 60 ft.'])
  })

  it('leads with whatever the creature does have when it cannot walk', () => {
    expect(speedParts({ speed: { fly: 50, hover: true } })).toEqual(['Fly 50 ft. (hover)'])
  })

  it('joins into exactly the line formatSpeed prints', () => {
    const speed = { speed: { walk: 30, climb: 30, swim: 30 } }
    expect(speedParts(speed).join(', ')).toBe(formatSpeed(speed))
  })
})

describe('monsterActionNumbers', () => {
  it('reads the to-hit, the reach and the damage off an attack line', () => {
    expect(
      monsterActionNumbers(
        'Melee Attack Roll: +4, reach 5 ft. 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.',
      ),
    ).toEqual({
      attackBonus: '+4',
      save: null,
      range: 'reach 5 ft.',
      damage: '5 (1d6 + 2) Slashing',
    })
  })

  it('keeps both halves of a thrown weapon’s reach-or-range line', () => {
    expect(
      monsterActionNumbers(
        'Melee or Ranged Attack Roll: +5, reach 10 ft. or range 30/120 ft. 13 (3d6 + 3) Piercing damage.',
      ).range,
    ).toBe('reach 10 ft. or range 30/120 ft.')
  })

  it('steps over the rider some 2024 attacks print after the bonus', () => {
    const numbers = monsterActionNumbers(
      'Melee Attack Roll: +5 (with Advantage if the target is Grappled by the bugbear), reach 10 ft. 12 (2d8 + 3) Piercing damage.',
    )
    expect(numbers.attackBonus).toBe('+5')
    expect(numbers.damage).toBe('12 (2d8 + 3) Piercing')
  })

  it('reads a saving throw’s DC and ability instead, where there is no attack roll', () => {
    expect(
      monsterActionNumbers(
        'Dexterity Saving Throw: DC 21, each creature in a 90-foot Cone. Failure: 59 (17d6) Fire damage. Success: Half damage.',
      ),
    ).toEqual({ attackBonus: null, save: 'DC 21 Dex', range: null, damage: '59 (17d6) Fire' })
  })

  it('reads no damage past an attack that deals none, rather than the escape DC', () => {
    // The Roper's Tentacle: an attack roll whose only effect is a condition.
    expect(
      monsterActionNumbers(
        'Melee Attack Roll: +7, reach 60 ft. The target has the Grappled condition (escape DC 14) from one of six tentacles.',
      ).damage,
    ).toBeNull()
  })

  it('finds nothing at all in a line that is neither', () => {
    expect(monsterActionNumbers('The dragon makes three Rend attacks.')).toEqual({
      attackBonus: null,
      save: null,
      range: null,
      damage: null,
    })
  })

  // Parsing shipped prose is only safe while it stays regular. This is the
  // guard: a regeneration that re-words the opening clause fails here rather
  // than quietly dropping every chip off the tracker's stat blocks.
  it('reads every attack and every save line in the shipped data', () => {
    let attacks = 0
    let saves = 0

    for (const monster of MONSTERS.all) {
      const entries = [
        ...monster.actions,
        ...monster.bonusActions,
        ...monster.reactions,
        ...monster.legendaryActions,
      ]

      for (const entry of entries) {
        const numbers = monsterActionNumbers(entry.description)

        if (/^(?:Melee|Ranged|Melee or Ranged) Attack Roll:/.test(entry.description)) {
          attacks += 1
          expect(numbers.attackBonus).not.toBeNull()
          expect(numbers.range).not.toBeNull()
        } else if (/Saving Throw:\s*DC/.test(entry.description.slice(0, 40))) {
          saves += 1
          expect(numbers.save).not.toBeNull()
        }
      }
    }

    expect(attacks).toBeGreaterThan(400)
    expect(saves).toBeGreaterThan(150)
  })
})
