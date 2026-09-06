import { MONSTERS } from '@/lib/srd/monsters'

import {
  budgetForLevel,
  encounterDifficulty,
  levelOneWarnings,
  partyBudget,
  totalLineExperience,
  type LevelOneStatBlock,
  type MonsterLine,
} from './budget'

// The budget arithmetic (`dm-prep-suite/encounter-builder`), and under it the
// three level-1 rails (`first-table/level-one-rails`): more monsters than
// characters, CR above 1/4, an attack averaging more than 5 — run over the
// real stat blocks, because the damage line is parsed out of their prose.

/** A line, with only the fields the math reads spelled out per case. */
const line = (overrides: Partial<MonsterLine> = {}): MonsterLine => ({
  index: 'goblin-warrior',
  name: 'Goblin Warrior',
  count: 1,
  experiencePoints: 50,
  ...overrides,
})

describe('budgetForLevel', () => {
  // Three rows spot-checked against docs/rules/10-dm-guide.md: the first, one
  // in the middle where Low and High diverge sharply, and the last.
  it.each([
    [1, { low: 50, moderate: 75, high: 100 }],
    [3, { low: 150, moderate: 225, high: 400 }],
    [11, { low: 1900, moderate: 2900, high: 4100 }],
    [20, { low: 6400, moderate: 13200, high: 22000 }],
  ])('gives the published row for level %i', (level, expected) => {
    expect(budgetForLevel(level)).toEqual(expected)
  })

  it('clamps a level the table does not define rather than pricing it at zero', () => {
    expect(budgetForLevel(0)).toEqual(budgetForLevel(1))
    expect(budgetForLevel(-4)).toEqual(budgetForLevel(1))
    expect(budgetForLevel(25)).toEqual(budgetForLevel(20))
    expect(budgetForLevel(Number.NaN)).toEqual(budgetForLevel(1))
  })

  it('reads a fractional level as the level it is past', () => {
    expect(budgetForLevel(3.9)).toEqual(budgetForLevel(3))
  })
})

describe('partyBudget', () => {
  it('is the published row times the party size for an even party', () => {
    // The dm-guide's worked example: four characters at level 3, Moderate 900.
    expect(partyBudget([3, 3, 3, 3])).toEqual({ low: 600, moderate: 900, high: 1600 })
  })

  it('sums each character own row for an uneven party', () => {
    // A level-5 character brings their own 500/750/1100, not a share of an
    // average — the whole reason this sums instead of multiplying.
    expect(partyBudget([3, 3, 5])).toEqual({ low: 800, moderate: 1200, high: 1900 })
  })

  it('is zero for nobody', () => {
    expect(partyBudget([])).toEqual({ low: 0, moderate: 0, high: 0 })
  })
})

describe('totalLineExperience', () => {
  it('counts every instance, not every line', () => {
    expect(totalLineExperience([line({ count: 4 })])).toBe(200)
  })

  it('adds the lines together', () => {
    expect(
      totalLineExperience([
        line({ count: 4 }),
        line({ index: 'ogre', name: 'Ogre', count: 1, experiencePoints: 450 }),
      ]),
    ).toBe(650)
  })

  it('is zero with nothing in the fight', () => {
    expect(totalLineExperience([])).toBe(0)
  })

  it('skips a nonsense line instead of blanking the total', () => {
    expect(
      totalLineExperience([
        line({ count: 2 }),
        line({ index: 'a', count: -3 }),
        line({ index: 'b', count: Number.NaN }),
        line({ index: 'c', experiencePoints: Number.NaN }),
      ]),
    ).toBe(100)
  })

  it('counts a zero-XP monster as a body worth nothing, not as a bad row', () => {
    expect(totalLineExperience([line({ count: 3, experiencePoints: 0 })])).toBe(0)
  })
})

describe('encounterDifficulty', () => {
  /** The dm-guide's worked party: four at level 3 — 600 / 900 / 1600. */
  const PARTY = [3, 3, 3, 3]

  it('has no band to give when nobody is attending', () => {
    const result = encounterDifficulty([line({ count: 4 })], [])

    expect(result.band).toBeNull()
    expect(result.partySize).toBe(0)
    expect(result.budget).toEqual({ low: 0, moderate: 0, high: 0 })
    // The monsters still cost what they cost; only the verdict is withheld.
    expect(result.total).toBe(200)
  })

  it('separates an empty fight from one the party will not notice', () => {
    expect(encounterDifficulty([], PARTY).band).toBe('empty')
    expect(encounterDifficulty([line({ count: 2 })], PARTY).band).toBe('under')
  })

  it.each([
    // Straight off the dm-guide's worked example, in its own numbers.
    ['low', 600],
    ['moderate', 900],
    ['high', 1600],
  ])('calls a fight that spends the %s budget exactly (%i XP) that band', (band, spend) => {
    const result = encounterDifficulty([line({ count: 1, experiencePoints: spend })], PARTY)
    expect(result.band).toBe(band)
  })

  it('holds a band until the next threshold is reached', () => {
    expect(encounterDifficulty([line({ experiencePoints: 899 })], PARTY).band).toBe('low')
    expect(encounterDifficulty([line({ experiencePoints: 1599 })], PARTY).band).toBe('moderate')
  })

  it('reports how far past High a fight is spent', () => {
    const result = encounterDifficulty([line({ experiencePoints: 2400 })], PARTY)

    expect(result.band).toBe('high')
    expect(result.overHighBy).toBe(800)
  })

  it('is not over High when it lands exactly on it', () => {
    expect(encounterDifficulty([line({ experiencePoints: 1600 })], PARTY).overHighBy).toBe(0)
  })

  it('reads harder for the players who actually turned up', () => {
    const fight = [line({ index: 'ogre', name: 'Ogre', count: 2, experiencePoints: 450 })]

    // 900 XP is Moderate on the nose for four, and past High for two.
    expect(encounterDifficulty(fight, PARTY).band).toBe('moderate')
    expect(encounterDifficulty(fight, [3, 3]).band).toBe('high')
    expect(encounterDifficulty(fight, [3, 3]).overHighBy).toBe(100)
  })

  it('applies the same 2024 arithmetic however many monsters there are', () => {
    // No multiplier table: eight goblins cost eight goblins, which in 2014
    // would have been doubled to 800 and read as a much harder fight.
    expect(encounterDifficulty([line({ count: 8 })], PARTY).total).toBe(400)
  })
})

describe('levelOneWarnings', () => {
  /** A line for a real stat block, priced off the data. */
  const real = (index: string, count = 1): MonsterLine => {
    const monster = MONSTERS.get(index)
    if (!monster) throw new Error(`no monster '${index}' in the data`)
    return { index, name: monster.name, count, experiencePoints: monster.experiencePoints }
  }

  /** The stat blocks a builder would have fetched for `lines`. */
  const detailsFor = (lines: readonly MonsterLine[]) =>
    Object.fromEntries(
      lines.flatMap((line) => {
        const monster = MONSTERS.get(line.index)
        return monster ? [[line.index, monster]] : []
      }),
    ) as Record<string, LevelOneStatBlock | undefined>

  const warn = (lines: readonly MonsterLine[], levels: readonly number[]) =>
    levelOneWarnings({ lines, levels, details: detailsFor(lines) })

  it('says nothing when nobody is attending', () => {
    expect(warn([real('ogre')], [])).toEqual([])
  })

  it('says nothing once anyone attending is past level 2', () => {
    expect(warn([real('ogre', 4)], [1, 1, 3])).toEqual([])
    expect(warn([real('ogre', 4)], [2, 2, 2, 5])).toEqual([])
  })

  it('still applies to a level-2 party', () => {
    expect(warn([real('ogre')], [2, 2, 2])).toHaveLength(2)
  })

  it('lets a few goblins through: fewer than the party, CR 1/4, 5 average', () => {
    // The research’s own first fight. Goblin Warrior: CR 1/4, scimitar 5 (1d6 + 2).
    expect(warn([real('goblin-warrior', 3)], [1, 1, 1, 1])).toEqual([])
  })

  it('counts bodies, not lines, against the characters', () => {
    expect(warn([real('goblin-warrior', 4)], [1, 1, 1])).toEqual([
      '4 monsters against 3 characters: more monsters than the party has bodies.',
    ])
    expect(warn([real('goblin-warrior', 2), real('goblin-minion', 2)], [1, 1, 1])).toEqual([
      '4 monsters against 3 characters: more monsters than the party has bodies.',
    ])
    expect(warn([real('goblin-warrior', 3)], [1, 1, 1])).toEqual([])
  })

  it('speaks of one character in the singular', () => {
    expect(warn([real('goblin-minion', 2)], [1])).toEqual([
      '2 monsters against 1 character: more monsters than the party has bodies.',
    ])
  })

  it('ignores a nonsense count when counting bodies', () => {
    const lines = [real('goblin-warrior', Number.NaN), real('goblin-minion', -2)]
    expect(warn(lines, [1])).toEqual([])
  })

  it('trips both the CR and the damage rail on an ogre', () => {
    // Ogre: CR 2, greatclub 13 (2d8 + 4) — the stat block that ends a level-1 party.
    expect(warn([real('ogre')], [1, 1, 1])).toEqual([
      'The ogre is CR 2, above the 1/4 a level-1 party survives.',
      'The ogre’s greatclub averages 13 damage; more than 5 can drop a level-1 character in one hit.',
    ])
  })

  it('trips the damage rail alone on a skeleton, which is CR 1/4 and hits for 6', () => {
    expect(warn([real('skeleton')], [1, 1, 1])).toEqual([
      'The skeleton’s shortsword averages 6 damage; more than 5 can drop a level-1 character in one hit.',
    ])
  })

  it('names every monster over the line, in one sentence each', () => {
    const lines = [real('ogre'), real('bugbear-warrior'), real('goblin-warrior')]
    const [cr, damage] = warn(lines, [1, 1, 1, 1])

    expect(cr).toMatch(/^The ogre \(CR 2\) and the bugbear warrior \(CR 1\) are above the CR 1\/4/)
    expect(damage).toMatch(/^The ogre’s greatclub averages 13 damage and the bugbear warrior’s /)
    expect(damage).toMatch(/; more than 5 can drop a level-1 character in one hit\.$/)
  })

  it('prints a fractional CR the way the SRD does', () => {
    const lines = [real('goblin-warrior')]
    const details: Record<string, LevelOneStatBlock> = {
      'goblin-warrior': { challengeRating: 0.5, actions: [] },
    }
    expect(levelOneWarnings({ lines, levels: [1], details })).toEqual([
      'The goblin warrior is CR 1/2, above the 1/4 a level-1 party survives.',
    ])
  })

  it('reads only attack lines for the damage, never a save or a summary', () => {
    const lines = [real('goblin-warrior')]
    const details: Record<string, LevelOneStatBlock> = {
      'goblin-warrior': {
        challengeRating: 0.25,
        actions: [
          { name: 'Multiattack', description: 'The creature makes two Bite attacks.' },
          {
            name: 'Breath',
            description:
              'Dexterity Saving Throw: DC 12, each creature in a 15-foot Cone. Failure: 22 (4d10) Fire damage.',
          },
          {
            name: 'Bite',
            description: 'Melee Attack Roll: +4, reach 5 ft. 4 (1d4 + 2) Piercing damage.',
          },
          {
            name: 'Odd',
            description: 'Melee Attack Roll: +4, reach 5 ft. Something with no numbers.',
          },
        ],
      },
    }
    expect(levelOneWarnings({ lines, levels: [1], details })).toEqual([])
  })

  it('checks nothing about a stat block that has not loaded, but still counts it', () => {
    const lines = [real('ogre', 2)]
    expect(levelOneWarnings({ lines, levels: [1], details: {} })).toEqual([
      '2 monsters against 1 character: more monsters than the party has bodies.',
    ])
  })

  it('over the whole bestiary, never throws and flags every CR above 1/4', () => {
    for (const monster of MONSTERS.all) {
      const lines = [real(monster.index)]
      const warnings = warn(lines, [1, 1, 1, 1])
      expect(warnings.some((line) => line.includes('is CR'))).toBe(monster.challengeRating > 0.25)
    }
  })
})
