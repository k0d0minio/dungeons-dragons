// The turn's parts, read from the real SRD data (first-table/your-turn-card).
// The level-1 bonus-action list per class is pinned so a regenerated data set
// that re-words a feature is noticed rather than quietly dropping one.
import { CLASSES } from '@/lib/srd/classes'

import {
  OPPORTUNITY_ATTACK,
  bonusActions,
  castableSpellIndexes,
  hasCantrips,
  reactions,
  slotsLeft,
} from './turn'

function characterOf(classIndex: string, spells: string[] = [], prepared = spells) {
  return {
    classIndex,
    level: 1,
    knownSpellIndexes: spells,
    preparedSpellIndexes: prepared,
  }
}

describe('bonusActions', () => {
  it('finds every level-1 class feature that is a bonus action, and no others', () => {
    const byClass = Object.fromEntries(
      CLASSES.all.map((entry) => [
        entry.index,
        bonusActions(characterOf(entry.index)).map((option) => option.name),
      ]),
    )

    expect(byClass).toEqual({
      barbarian: ['Rage'],
      bard: ['Bardic Inspiration'],
      cleric: [],
      druid: [],
      fighter: ['Second Wind'],
      monk: ['Martial Arts'],
      paladin: ['Lay On Hands'],
      ranger: [],
      rogue: [],
      sorcerer: ['Innate Sorcery'],
      warlock: [],
      wizard: [],
    })
  })

  it('adds the level-2 features when the character gets there', () => {
    expect(bonusActions({ ...characterOf('rogue'), level: 2 }).map((o) => o.name)).toEqual([
      'Cunning Action',
    ])
  })

  it('adds the prepared spells cast as a bonus action, once each, after the features', () => {
    const cleric = characterOf('cleric', ['healing-word', 'bless', 'healing-word', 'sacred-flame'])

    expect(bonusActions(cleric)).toEqual([
      { name: 'Healing Word', source: 'spell', spellIndex: 'healing-word' },
    ])

    const bard = characterOf('bard', ['healing-word'])
    expect(bonusActions(bard).map((o) => o.name)).toEqual(['Bardic Inspiration', 'Healing Word'])
  })

  it('reads the known list when nothing is prepared yet', () => {
    const warlock = characterOf('warlock', ['hex', 'eldritch-blast'], [])

    expect(bonusActions(warlock).map((o) => o.name)).toEqual(['Hex'])
    expect(castableSpellIndexes(warlock)).toEqual(['hex', 'eldritch-blast'])
    expect(castableSpellIndexes(characterOf('warlock', ['hex'], ['hex']))).toEqual(['hex'])
  })

  it('keeps the known cantrips once a day’s spells are prepared', () => {
    // The wizard writes cantrips to the known list alone (D22), so a druid
    // with Cure Wounds prepared must still see Produce Flame on the card.
    const druid = characterOf('druid', ['produce-flame', 'druidcraft'], ['cure-wounds', 'entangle'])

    expect(bonusActions(druid).map((o) => o.name)).toEqual(['Produce Flame'])
    expect(castableSpellIndexes(druid)).toEqual([
      'produce-flame',
      'druidcraft',
      'cure-wounds',
      'entangle',
    ])
  })

  it('ignores an index the SRD does not have', () => {
    expect(bonusActions(characterOf('wizard', ['homebrew-blast']))).toEqual([])
  })
})

describe('reactions', () => {
  it('always leads with the Opportunity Attack', () => {
    expect(reactions(characterOf('fighter'))).toEqual([OPPORTUNITY_ATTACK])
    expect(OPPORTUNITY_ATTACK.when).toMatch(/walks away/)
  })

  it('adds the reaction spells with the SRD’s own condition', () => {
    const wizard = characterOf('wizard', ['shield', 'magic-missile', 'feather-fall'])

    const [, shield, featherFall] = reactions(wizard)
    expect(shield).toMatchObject({ name: 'Shield', source: 'spell', spellIndex: 'shield' })
    expect(shield.when).toEqual(expect.any(String))
    expect(featherFall.name).toBe('Feather Fall')
  })
})

describe('the spells line', () => {
  it('knows a cantrip from a levelled spell', () => {
    expect(hasCantrips(['fire-bolt', 'magic-missile'])).toBe(true)
    expect(hasCantrips(['magic-missile'])).toBe(false)
    expect(hasCantrips([])).toBe(false)
  })

  it('counts the slots left across every level, and has nothing to say without slots', () => {
    expect(slotsLeft({})).toBeNull()
    expect(slotsLeft({ '1': { max: 0, used: 0 } })).toBeNull()
    expect(slotsLeft({ '1': { max: 2, used: 0 } })).toBe(2)
    expect(slotsLeft({ '1': { max: 4, used: 3 }, '2': { max: 2, used: 0 } })).toBe(3)
    expect(slotsLeft({ '1': { max: 1, used: 1 } })).toBe(0)
    // A `used` past `max` — a stale row — never counts below zero.
    expect(slotsLeft({ '1': { max: 1, used: 3 } })).toBe(0)
  })
})
