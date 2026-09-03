import {
  isLevelUpWaiting,
  levelsBehind,
  nextMilestoneLevel,
  parseMilestoneLevel,
  partyMilestoneStanding,
  resolveMilestoneLevel,
} from './milestone'

// The three rules of D35: one number, "waiting" derived from it, and nothing
// here writes a character's level. Everything below is a pure read of the
// campaign's column against a level the planner owns.

describe('parseMilestoneLevel', () => {
  it('keeps a whole level inside the 1–20 table', () => {
    expect(parseMilestoneLevel(1)).toBe(1)
    expect(parseMilestoneLevel(4)).toBe(4)
    expect(parseMilestoneLevel(20)).toBe(20)
  })

  it('refuses a level off the table rather than clamping it', () => {
    // A clamp would store 20th level for a broken client sending 50, which is
    // five phones told to level up thirteen times. Refusing is the answer.
    expect(parseMilestoneLevel(0)).toBeNull()
    expect(parseMilestoneLevel(21)).toBeNull()
    expect(parseMilestoneLevel(-3)).toBeNull()
  })

  it('refuses anything that is not a whole number', () => {
    for (const value of [null, undefined, '4', 4.5, NaN, Infinity, true, [4], {}]) {
      expect(parseMilestoneLevel(value)).toBeNull()
    }
  })
})

describe('resolveMilestoneLevel', () => {
  it('answers null for a character on no campaign — no milestone, no prompt', () => {
    expect(resolveMilestoneLevel([])).toBeNull()
  })

  it('answers null for a table that has never called a level', () => {
    expect(resolveMilestoneLevel([null])).toBeNull()
  })

  it('takes the highest across the tables a character sits at', () => {
    // One character, one sheet: a level earned on Thursday is not withdrawn by
    // Sunday's DM having said nothing.
    expect(resolveMilestoneLevel([3, null, 5])).toBe(5)
  })

  it('drops a value the column should never have held', () => {
    expect(resolveMilestoneLevel([99 as number, 2])).toBe(2)
    expect(resolveMilestoneLevel(['4' as unknown as number])).toBeNull()
  })
})

describe('isLevelUpWaiting', () => {
  it('is the comparison and nothing else', () => {
    expect(isLevelUpWaiting(3, 4)).toBe(true)
    expect(isLevelUpWaiting(4, 4)).toBe(false)
  })

  it('says nothing when no milestone has been called', () => {
    expect(isLevelUpWaiting(1, null)).toBe(false)
  })

  it('does not complain about a character above the milestone', () => {
    // A DM who moved the number back down corrected a mistake; the app does not
    // un-level anybody, and a character who already took the level keeps it.
    expect(isLevelUpWaiting(5, 3)).toBe(false)
  })
})

describe('levelsBehind', () => {
  it('counts the levels still to take, and floors at nothing to take', () => {
    expect(levelsBehind(2, 5)).toBe(3)
    expect(levelsBehind(5, 5)).toBe(0)
    expect(levelsBehind(6, 5)).toBe(0)
    expect(levelsBehind(2, null)).toBe(0)
  })
})

describe('partyMilestoneStanding', () => {
  const party = [{ level: 4 }, { level: 4 }, { level: 3 }, { level: 2 }]

  it('counts who has taken the level and who has not', () => {
    expect(partyMilestoneStanding(party, 4)).toEqual({ party: 4, levelled: 2, waiting: 2 })
  })

  it('reads everyone as levelled while no milestone is set', () => {
    expect(partyMilestoneStanding(party, null)).toEqual({ party: 4, levelled: 4, waiting: 0 })
  })

  it('survives an empty roster', () => {
    expect(partyMilestoneStanding([], 3)).toEqual({ party: 0, levelled: 0, waiting: 0 })
  })
})

describe('nextMilestoneLevel', () => {
  it('offers one past the milestone once there is one', () => {
    expect(nextMilestoneLevel([{ level: 1 }], 3)).toBe(4)
  })

  it('offers one past the party when there is no milestone yet', () => {
    // A DM setting this mid-campaign has 3rd-level characters already; being
    // offered "level 2" would be an obviously wrong first impression.
    expect(nextMilestoneLevel([{ level: 3 }, { level: 2 }], null)).toBe(4)
  })

  it('offers level 2 for a party nobody has made yet', () => {
    expect(nextMilestoneLevel([], null)).toBe(2)
  })

  it('offers nothing at the top of the table', () => {
    expect(nextMilestoneLevel([{ level: 20 }], 20)).toBeNull()
    expect(nextMilestoneLevel([{ level: 20 }], null)).toBeNull()
  })
})
