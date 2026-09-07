import { monsterPickerRows, MONSTER_RESULT_LIMIT } from './monster-picker'

/**
 * The list in the shape that produced the complaint
 * (`triage/encounter-builder-monster-order`): the SRD's alphabetical order,
 * which opens on an aboleth and a wall of dragons and buries the goblins.
 */
const MONSTERS = [
  { index: 'aboleth', name: 'Aboleth', challengeRating: 10 },
  { index: 'adult-red-dragon', name: 'Adult Red Dragon', challengeRating: 17 },
  { index: 'ancient-red-dragon', name: 'Ancient Red Dragon', challengeRating: 24 },
  { index: 'bandit', name: 'Bandit', challengeRating: 0.125 },
  { index: 'goblin-warrior', name: 'Goblin Warrior', challengeRating: 0.25 },
  { index: 'ogre', name: 'Ogre', challengeRating: 2 },
  { index: 'red-dragon-wyrmling', name: 'Red Dragon Wyrmling', challengeRating: 4 },
]

const names = (rows: { name: string }[]) => rows.map((row) => row.name)

describe('monsterPickerRows', () => {
  it('opens on the weakest things in the list, not the alphabet', () => {
    expect(names(monsterPickerRows(MONSTERS, ''))).toEqual([
      'Bandit',
      'Goblin Warrior',
      'Ogre',
      'Red Dragon Wyrmling',
      'Aboleth',
      'Adult Red Dragon',
      'Ancient Red Dragon',
    ])
  })

  it('orders a search the same way — a search is truncated too', () => {
    expect(names(monsterPickerRows(MONSTERS, 'dragon'))).toEqual([
      'Red Dragon Wyrmling',
      'Adult Red Dragon',
      'Ancient Red Dragon',
    ])
  })

  it('breaks a shared CR alphabetically rather than by source order', () => {
    const sameCr = [
      { index: 'zombie', name: 'Zombie', challengeRating: 0.25 },
      { index: 'goblin-warrior', name: 'Goblin Warrior', challengeRating: 0.25 },
    ]
    expect(names(monsterPickerRows(sameCr, ''))).toEqual(['Goblin Warrior', 'Zombie'])
  })

  it('sorts before it truncates, so the cap keeps the weakest rows', () => {
    expect(names(monsterPickerRows(MONSTERS, '', 2))).toEqual(['Bandit', 'Goblin Warrior'])
  })

  it('sinks a row with no usable CR instead of suggesting it first', () => {
    const broken = [
      { index: 'mystery', name: 'Mystery', challengeRating: Number.NaN },
      { index: 'ogre', name: 'Ogre', challengeRating: 2 },
    ]
    expect(names(monsterPickerRows(broken, ''))).toEqual(['Ogre', 'Mystery'])
  })

  it('caps at twenty rows by default', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      index: `m-${i}`,
      name: `Monster ${i}`,
      challengeRating: i,
    }))
    expect(monsterPickerRows(many, '')).toHaveLength(MONSTER_RESULT_LIMIT)
  })

  it('leaves the caller’s array alone', () => {
    const source = [...MONSTERS]
    monsterPickerRows(source, '')
    expect(source).toEqual(MONSTERS)
  })
})
