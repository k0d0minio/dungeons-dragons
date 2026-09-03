import {
  budgetForLevel,
  encounterDifficulty,
  partyBudget,
  totalLineExperience,
  type MonsterLine,
} from './budget'

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
