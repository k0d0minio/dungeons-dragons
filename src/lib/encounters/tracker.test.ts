import {
  advanceTurn,
  compareByInitiative,
  monsterAfterDamage,
  monsterAfterHealing,
  rollD20,
} from './tracker'

describe('compareByInitiative', () => {
  it('sorts initiative descending, blanks to the bottom, insertion order breaking ties', () => {
    const rows = [
      { initiative: null, sortOrder: 2 },
      { initiative: 12, sortOrder: 3 },
      { initiative: 17, sortOrder: 1 },
      { initiative: null, sortOrder: 0 },
      { initiative: 17, sortOrder: 0 },
    ]

    expect([...rows].sort(compareByInitiative)).toEqual([
      { initiative: 17, sortOrder: 0 },
      { initiative: 17, sortOrder: 1 },
      { initiative: 12, sortOrder: 3 },
      { initiative: null, sortOrder: 0 },
      { initiative: null, sortOrder: 2 },
    ])
  })
})

describe('advanceTurn', () => {
  it('steps to the next combatant within a round', () => {
    expect(advanceTurn({ round: 1, activeTurn: 0 }, 3)).toEqual({ round: 1, activeTurn: 1 })
  })

  it('wraps past the last combatant into a new round', () => {
    expect(advanceTurn({ round: 1, activeTurn: 2 }, 3)).toEqual({ round: 2, activeTurn: 0 })
  })

  it('clamps a stale turn index (a combatant was removed) back to the top', () => {
    expect(advanceTurn({ round: 4, activeTurn: 9 }, 3)).toEqual({ round: 5, activeTurn: 0 })
  })

  it('does nothing with nobody in the fight', () => {
    expect(advanceTurn({ round: 1, activeTurn: 0 }, 0)).toEqual({ round: 1, activeTurn: 0 })
  })
})

describe('rollD20', () => {
  it('stays on the die', () => {
    for (let i = 0; i < 100; i += 1) {
      const roll = rollD20()
      expect(roll).toBeGreaterThanOrEqual(1)
      expect(roll).toBeLessThanOrEqual(20)
      expect(Number.isInteger(roll)).toBe(true)
    }
  })
})

describe('monsterAfterDamage', () => {
  it('soaks temp HP before real hit points', () => {
    expect(
      monsterAfterDamage({ currentHitPoints: 7, temporaryHitPoints: 3, maxHitPoints: 7 }, 5),
    ).toEqual({ currentHitPoints: 5, temporaryHitPoints: 0 })
  })

  it('stops at zero rather than going negative', () => {
    expect(
      monsterAfterDamage({ currentHitPoints: 2, temporaryHitPoints: 0, maxHitPoints: 7 }, 50),
    ).toEqual({ currentHitPoints: 0, temporaryHitPoints: 0 })
  })

  it('leaves an untracked monster untouched', () => {
    expect(
      monsterAfterDamage({ currentHitPoints: null, temporaryHitPoints: 0, maxHitPoints: null }, 5),
    ).toEqual({ currentHitPoints: null, temporaryHitPoints: 0 })
  })
})

describe('monsterAfterHealing', () => {
  it('heals, never above the instance’s maximum', () => {
    expect(
      monsterAfterHealing({ currentHitPoints: 5, temporaryHitPoints: 0, maxHitPoints: 7 }, 50),
    ).toEqual({ currentHitPoints: 7 })
  })

  it('leaves an untracked monster untouched', () => {
    expect(
      monsterAfterHealing({ currentHitPoints: null, temporaryHitPoints: 0, maxHitPoints: null }, 5),
    ).toEqual({ currentHitPoints: null })
  })
})
