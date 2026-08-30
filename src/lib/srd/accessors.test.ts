// The behaviour the data layer adds on top of the JSON: lookups, level filters,
// and the two rules that are easier to encode than to look up (a background's
// ability spread, Exhaustion's cumulative penalty).
import {
  BACKGROUNDS,
  BACKGROUND_ABILITY_SPREADS,
  isValidBackgroundAbilityChoice,
} from './backgrounds'
import {
  CLASSES,
  SUBCLASSES,
  SUBCLASS_LEVEL,
  classFeaturesUpTo,
  hasSubclassAtLevel,
  subclassFeaturesUpTo,
  subclassesForClass,
} from './classes'
import {
  CONDITIONS,
  MAX_EXHAUSTION_LEVEL,
  exhaustionD20Penalty,
  exhaustionSpeedPenalty,
} from './conditions'
import { collection } from './lookup'
import { SPECIES, speciesLineage, speciesTraitsAtLevel } from './species'
import { WEAPONS, isThrown, masteryFor, propertiesFor, weaponsByCategory } from './weapons'

describe('collection', () => {
  const entries = [
    { index: 'a', value: 1 },
    { index: 'b', value: 2 },
  ]
  const subject = collection(entries)

  it('finds an entry by index', () => {
    expect(subject.get('b')).toEqual({ index: 'b', value: 2 })
  })

  it('returns null rather than throwing for an index it has never heard of', () => {
    expect(subject.get('half-elf')).toBeNull()
    expect(subject.has('half-elf')).toBe(false)
  })

  it('exposes every entry and every index in source order', () => {
    expect(subject.all).toBe(entries)
    expect(subject.indexes).toEqual(['a', 'b'])
  })
})

describe('speciesTraitsAtLevel', () => {
  it('returns the species traits with no lineage chosen', () => {
    const traits = speciesTraitsAtLevel('dwarf', null, 1)
    expect(traits.map((trait) => trait.index)).toEqual(
      SPECIES.get('dwarf')?.traits.map((trait) => trait.index),
    )
  })

  it('withholds a lineage trait until its level', () => {
    const atOne = speciesTraitsAtLevel('elf', 'elven-lineage-drow', 1).map((trait) => trait.name)
    const atThree = speciesTraitsAtLevel('elf', 'elven-lineage-drow', 3).map((trait) => trait.name)

    expect(atOne).toContain('Dancing Lights')
    expect(atOne).not.toContain('Faerie Fire')
    expect(atThree).toContain('Faerie Fire')
  })

  it('ignores a lineage that does not belong to the species', () => {
    expect(speciesLineage('dwarf', 'elven-lineage-drow')).toBeNull()
    expect(speciesTraitsAtLevel('dwarf', 'elven-lineage-drow', 20)).toHaveLength(
      SPECIES.get('dwarf')?.traits.length ?? 0,
    )
  })

  it('returns nothing for a species this build does not know', () => {
    expect(speciesTraitsAtLevel('half-orc', null, 5)).toEqual([])
  })
})

describe('background ability choices', () => {
  it('accepts +2/+1 across two of the background’s three abilities', () => {
    expect(isValidBackgroundAbilityChoice('acolyte', 'two-and-one', ['wisdom', 'charisma'])).toBe(
      true,
    )
  })

  it('accepts +1 to each of the three', () => {
    expect(
      isValidBackgroundAbilityChoice('acolyte', 'one-each', ['intelligence', 'wisdom', 'charisma']),
    ).toBe(true)
  })

  it('rejects an ability the background does not offer', () => {
    expect(isValidBackgroundAbilityChoice('acolyte', 'two-and-one', ['strength', 'wisdom'])).toBe(
      false,
    )
  })

  it('rejects spending both increases on one ability', () => {
    expect(isValidBackgroundAbilityChoice('acolyte', 'two-and-one', ['wisdom', 'wisdom'])).toBe(
      false,
    )
  })

  it('rejects the wrong number of abilities for the spread', () => {
    expect(isValidBackgroundAbilityChoice('acolyte', 'one-each', ['wisdom', 'charisma'])).toBe(
      false,
    )
  })

  it('rejects a background this build does not know', () => {
    expect(isValidBackgroundAbilityChoice('folk-hero', 'one-each', ['strength'])).toBe(false)
  })

  it('offers exactly the two spreads the SRD defines', () => {
    expect(BACKGROUND_ABILITY_SPREADS.map((spread) => spread.increases)).toEqual([
      [2, 1],
      [1, 1, 1],
    ])
    expect(BACKGROUNDS.all.length).toBeGreaterThan(0)
  })
})

describe('class and subclass features', () => {
  it('withholds features above the character’s level', () => {
    const atOne = classFeaturesUpTo('fighter', 1).map((feature) => feature.name)
    expect(atOne).toContain('Second Wind')
    expect(atOne).not.toContain('Action Surge')
    expect(classFeaturesUpTo('fighter', 2).map((feature) => feature.name)).toContain('Action Surge')
  })

  it('withholds subclass features above the character’s level', () => {
    expect(subclassFeaturesUpTo('champion', 2)).toEqual([])
    expect(subclassFeaturesUpTo('champion', 3).map((feature) => feature.name)).toContain(
      'Improved Critical',
    )
  })

  it('says a subclass is chosen at level 3 and not before', () => {
    expect(hasSubclassAtLevel('wizard', SUBCLASS_LEVEL - 1)).toBe(false)
    expect(hasSubclassAtLevel('wizard', SUBCLASS_LEVEL)).toBe(true)
  })

  it('returns nothing for classes and subclasses it does not know', () => {
    expect(classFeaturesUpTo('artificer', 20)).toEqual([])
    expect(subclassFeaturesUpTo('bladesinging', 20)).toEqual([])
    expect(hasSubclassAtLevel('artificer', 20)).toBe(false)
    expect(subclassesForClass('artificer')).toEqual([])
  })

  it('links every subclass back to a class this build knows', () => {
    for (const subclass of SUBCLASSES.all) {
      expect(CLASSES.has(subclass.classIndex)).toBe(true)
    }
  })
})

describe('exhaustion', () => {
  it('reduces every D20 Test by 2 per level', () => {
    expect(exhaustionD20Penalty(0)).toBe(0)
    expect(exhaustionD20Penalty(1)).toBe(-2)
    expect(exhaustionD20Penalty(3)).toBe(-6)
  })

  it('reduces Speed by 5 feet per level', () => {
    expect(exhaustionSpeedPenalty(2)).toBe(10)
  })

  it('clamps a level outside 0–6 rather than returning an unbounded penalty', () => {
    expect(exhaustionD20Penalty(-4)).toBe(0)
    expect(exhaustionD20Penalty(99)).toBe(MAX_EXHAUSTION_LEVEL * -2)
    expect(exhaustionD20Penalty(Number.NaN)).toBe(0)
    expect(exhaustionD20Penalty(2.7)).toBe(-4)
  })

  it('is one of the fifteen conditions, not a separate track', () => {
    expect(CONDITIONS.has('exhaustion')).toBe(true)
  })
})

describe('weapon lookups', () => {
  it('groups the SRD table by section', () => {
    expect(weaponsByCategory('simple', 'melee').map((weapon) => weapon.index)).toContain('club')
    expect(weaponsByCategory('martial', 'ranged').map((weapon) => weapon.index)).toContain(
      'longbow',
    )
    expect(weaponsByCategory('simple', 'melee')).toHaveLength(10)
  })

  it('resolves a weapon’s mastery property to its SRD text', () => {
    expect(masteryFor('longsword')?.name).toBe('Sap')
    expect(masteryFor('longsword')?.description.length).toBeGreaterThan(0)
    expect(masteryFor('vorpal-sword')).toBeNull()
  })

  it('resolves a weapon’s properties in table order', () => {
    expect(propertiesFor('dagger').map((property) => property.name)).toEqual([
      'Finesse',
      'Light',
      'Thrown',
    ])
    expect(propertiesFor('mace')).toEqual([])
    expect(propertiesFor('vorpal-sword')).toEqual([])
  })

  it('knows which weapons can be thrown', () => {
    expect(isThrown('handaxe')).toBe(true)
    expect(isThrown('longsword')).toBe(false)
    expect(isThrown('vorpal-sword')).toBe(false)
    expect(WEAPONS.get('handaxe')?.throwRange).toEqual({ normal: 20, long: 60 })
  })
})
