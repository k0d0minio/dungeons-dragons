import {
  EXPERIENCE_THRESHOLDS,
  experienceAfterAward,
  experienceForLevel,
  experienceProgress,
  formatExperience,
  levelForExperience,
  MAX_EXPERIENCE,
  nextLevelThreshold,
} from './experience'

describe('EXPERIENCE_THRESHOLDS', () => {
  it('is the SRD 5.1 table, twenty rows starting at zero', () => {
    expect(EXPERIENCE_THRESHOLDS).toHaveLength(20)
    expect(EXPERIENCE_THRESHOLDS[0]).toBe(0)
    expect(EXPERIENCE_THRESHOLDS[19]).toBe(355_000)
  })

  it('only ever goes up', () => {
    for (let i = 1; i < EXPERIENCE_THRESHOLDS.length; i += 1) {
      expect(EXPERIENCE_THRESHOLDS[i]).toBeGreaterThan(EXPERIENCE_THRESHOLDS[i - 1])
    }
  })

  it('matches the rows docs/rules/03-character-creation.md prints', () => {
    expect(experienceForLevel(2)).toBe(300)
    expect(experienceForLevel(5)).toBe(6_500)
    expect(experienceForLevel(11)).toBe(85_000)
    expect(experienceForLevel(17)).toBe(225_000)
  })

  it('clamps a level outside 1–20 rather than reading off the end', () => {
    expect(experienceForLevel(0)).toBe(0)
    expect(experienceForLevel(99)).toBe(355_000)
  })
})

describe('levelForExperience', () => {
  it('gives the highest level the total has paid for', () => {
    expect(levelForExperience(0)).toBe(1)
    expect(levelForExperience(299)).toBe(1)
    expect(levelForExperience(300)).toBe(2)
    expect(levelForExperience(6_499)).toBe(4)
    expect(levelForExperience(6_500)).toBe(5)
  })

  it('stops at 20 however much XP is piled on', () => {
    expect(levelForExperience(355_000)).toBe(20)
    expect(levelForExperience(9_000_000)).toBe(20)
  })

  it('reads a negative or fractional total as first level rather than throwing', () => {
    expect(levelForExperience(-500)).toBe(1)
    expect(levelForExperience(299.9)).toBe(1)
  })
})

describe('nextLevelThreshold', () => {
  it('is what the level after this one costs', () => {
    expect(nextLevelThreshold(1)).toBe(300)
    expect(nextLevelThreshold(4)).toBe(6_500)
  })

  it('is null at 20th — there is nothing to fill towards', () => {
    expect(nextLevelThreshold(20)).toBeNull()
    expect(nextLevelThreshold(25)).toBeNull()
  })
})

describe('experienceProgress', () => {
  it('reports the band the total sits in', () => {
    const progress = experienceProgress(3_600, 4)

    expect(progress).toMatchObject({
      experience: 3_600,
      level: 4,
      earnedLevel: 4,
      levelAvailable: false,
      nextThreshold: 6_500,
      remaining: 2_900,
    })
    // 900 of the 3,800 XP between 4th and 5th.
    expect(progress.fraction).toBeCloseTo(900 / 3_800)
  })

  it('nudges when XP has outrun the written level, and never levels anyone', () => {
    const progress = experienceProgress(7_000, 4)

    expect(progress.level).toBe(4)
    expect(progress.earnedLevel).toBe(5)
    expect(progress.levelAvailable).toBe(true)
  })

  it('does not nudge a level that is ahead of its XP — a table that levelled by story', () => {
    const progress = experienceProgress(300, 7)

    expect(progress.earnedLevel).toBe(2)
    expect(progress.levelAvailable).toBe(false)
  })

  it('measures the bar against the earned level, not the written one', () => {
    // 5th level earned, 4th written: the bar fills towards 6th rather than
    // sitting full at a level-up nobody has taken.
    const progress = experienceProgress(10_250, 4)

    expect(progress.nextThreshold).toBe(14_000)
    expect(progress.fraction).toBeCloseTo((10_250 - 6_500) / 7_500)
  })

  it('is full and open-ended at 20th', () => {
    const progress = experienceProgress(400_000, 20)

    expect(progress).toMatchObject({ nextThreshold: null, remaining: null, fraction: 1 })
  })

  it('holds a wild total inside the bounds the column allows', () => {
    expect(experienceProgress(-90, 1).experience).toBe(0)
    expect(experienceProgress(50_000_000, 20).experience).toBe(MAX_EXPERIENCE)
  })
})

describe('experienceAfterAward', () => {
  it('adds the award to the total', () => {
    expect(experienceAfterAward(1_000, 175)).toBe(1_175)
  })

  it('starts an untracked character at zero — the first award opts them in', () => {
    expect(experienceAfterAward(null, 250)).toBe(250)
  })

  it('takes an award back with a negative amount, flooring at zero', () => {
    expect(experienceAfterAward(500, -175)).toBe(325)
    expect(experienceAfterAward(100, -400)).toBe(0)
  })

  it('holds the total under the ceiling', () => {
    expect(experienceAfterAward(MAX_EXPERIENCE, 5_000)).toBe(MAX_EXPERIENCE)
  })
})

describe('formatExperience', () => {
  it('groups the thousands a sheet has to read at arm’s length', () => {
    expect(formatExperience(14_000)).toBe('14,000')
    expect(formatExperience(0)).toBe('0')
  })
})
