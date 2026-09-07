import { fightHasStarted, fightLine, whoseTurn } from './fight-status'

// The line under a fight on the Play tab, and the split between a fight being
// run and one merely built (`dm-chronology/play-tab`). Both are read off
// `completed_at null` rows, so the difference has to be decided somewhere —
// here, where a test can ask.
const ROUND_ONE = { round: 1, activeTurn: 0 }

const ORDER = [
  { label: 'Aldric', initiative: 18 },
  { label: 'Goblin 1', initiative: 12 },
  { label: 'Goblin 2', initiative: 12 },
]

describe('fightHasStarted', () => {
  it('is false for a fight assembled and never rolled for', () => {
    const built = [
      { label: 'Goblin 1', initiative: null },
      { label: 'Goblin 2', initiative: null },
    ]

    expect(fightHasStarted(ROUND_ONE, built)).toBe(false)
    expect(fightHasStarted(ROUND_ONE, [])).toBe(false)
  })

  it('is true as soon as anyone has an initiative', () => {
    expect(
      fightHasStarted(ROUND_ONE, [
        { label: 'Aldric', initiative: 18 },
        { label: 'Goblin 1', initiative: null },
      ]),
    ).toBe(true)
  })

  it('is true for a fight stepped past its first turn, initiative or not', () => {
    const nobody = [{ label: 'Goblin 1', initiative: null }]

    expect(fightHasStarted({ round: 1, activeTurn: 1 }, nobody)).toBe(true)
    expect(fightHasStarted({ round: 3, activeTurn: 0 }, nobody)).toBe(true)
  })
})

describe('whoseTurn', () => {
  it('reads the active index off the order as sorted', () => {
    expect(whoseTurn({ round: 2, activeTurn: 1 }, ORDER)).toBe('Goblin 1')
  })

  it('clamps an index left past the end by a combatant being removed', () => {
    expect(whoseTurn({ round: 2, activeTurn: 9 }, ORDER)).toBe('Goblin 2')
    expect(whoseTurn({ round: 2, activeTurn: -1 }, ORDER)).toBe('Aldric')
  })

  it('is null when there is nobody in the fight', () => {
    expect(whoseTurn(ROUND_ONE, [])).toBeNull()
  })
})

describe('fightLine', () => {
  it('says the round and whose turn it is', () => {
    expect(fightLine({ round: 2, activeTurn: 0 }, ORDER)).toBe('Round 2 · Aldric’s turn')
  })

  it('says the round alone when there is nobody up', () => {
    expect(fightLine({ round: 4, activeTurn: 0 }, [])).toBe('Round 4')
  })
})
