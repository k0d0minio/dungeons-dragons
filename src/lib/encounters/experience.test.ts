import { encounterExperience, splitExperience, totalMonsterExperience } from './experience'

/** Two goblins, an orc and the party's four, as a tracker holds them. */
const FIGHT = [
  { monsterIndex: 'goblin', characterId: null },
  { monsterIndex: 'goblin', characterId: null },
  { monsterIndex: 'orc', characterId: null },
  { monsterIndex: null, characterId: 'char-1' },
  { monsterIndex: null, characterId: 'char-2' },
  { monsterIndex: null, characterId: 'char-3' },
  { monsterIndex: null, characterId: 'char-4' },
]

const XP = { goblin: 50, orc: 100 }

describe('totalMonsterExperience', () => {
  it('counts every instance, not every index', () => {
    expect(totalMonsterExperience(FIGHT, XP).total).toBe(200)
  })

  it('is zero for a fight with no monsters in it', () => {
    expect(totalMonsterExperience([{ monsterIndex: null, characterId: 'a' }], XP)).toEqual({
      total: 0,
      unknownIndexes: [],
    })
  })

  it('names a monster it could not price instead of counting it as zero', () => {
    const result = totalMonsterExperience(
      [
        { monsterIndex: 'goblin', characterId: null },
        { monsterIndex: 'homebrew-horror', characterId: null },
        { monsterIndex: 'homebrew-horror', characterId: null },
      ],
      XP,
    )

    expect(result.total).toBe(50)
    // Named once, however many of it were in the fight.
    expect(result.unknownIndexes).toEqual(['homebrew-horror'])
  })

  it('treats a nonsense XP value as unreadable rather than arithmetic', () => {
    const result = totalMonsterExperience([{ monsterIndex: 'goblin', characterId: null }], {
      goblin: Number.NaN,
    })

    expect(result).toEqual({ total: 0, unknownIndexes: ['goblin'] })
  })
})

describe('splitExperience', () => {
  it('divides and rounds down, dropping the remainder', () => {
    expect(splitExperience(200, 4)).toBe(50)
    expect(splitExperience(201, 4)).toBe(50)
  })

  it('has nothing to split between nobody', () => {
    expect(splitExperience(700, 0)).toBe(0)
    expect(splitExperience(700, -2)).toBe(0)
  })
})

describe('encounterExperience', () => {
  it('prices the fight and cuts it by the characters in it', () => {
    expect(encounterExperience(FIGHT, XP)).toEqual({
      total: 200,
      shares: 4,
      perCharacter: 50,
      unknownIndexes: [],
    })
  })

  it('offers nothing when the party is not in the fight yet', () => {
    const monstersOnly = FIGHT.filter((row) => row.monsterIndex !== null)

    expect(encounterExperience(monstersOnly, XP)).toMatchObject({
      total: 200,
      shares: 0,
      perCharacter: 0,
    })
  })
})
