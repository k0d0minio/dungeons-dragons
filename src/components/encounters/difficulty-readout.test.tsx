import { render, screen } from '@testing-library/react'

import { encounterDifficulty, type MonsterLine } from '@/lib/encounters/budget'

import { DifficultyReadout } from './difficulty-readout'

// What the readout owes the DM (`dm-prep-suite/encounter-builder`): the band in
// a word, the spend against the three thresholds in numbers, and a warning —
// not a block — once the fight is spent past High. The arithmetic itself is
// `budget.test.ts`'s; this asserts what reaches the screen.

/** The dm-guide's worked party: four at level 3 — 600 / 900 / 1,600. */
const PARTY = [3, 3, 3, 3]

const monsters = (experiencePoints: number): MonsterLine[] => [
  { index: 'ogre', name: 'Ogre', count: 1, experiencePoints },
]

function renderAt(experiencePoints: number, levels: number[] = PARTY) {
  return render(
    <DifficultyReadout difficulty={encounterDifficulty(monsters(experiencePoints), levels)} />,
  )
}

describe('DifficultyReadout', () => {
  it('withholds a verdict when nobody is turning up', () => {
    render(<DifficultyReadout difficulty={encounterDifficulty(monsters(900), [])} />)

    expect(screen.getByText('No difficulty yet')).toBeInTheDocument()
    expect(screen.queryByText('Moderate')).not.toBeInTheDocument()
  })

  it('names the band and shows what it was measured against', () => {
    renderAt(900)

    expect(screen.getByText('Moderate')).toBeInTheDocument()
    expect(screen.getByText('900 XP · 4 characters')).toBeInTheDocument()
    expect(screen.getByText(/Low 600 · Moderate 900 · High 1,600/)).toBeInTheDocument()
  })

  it('separates an empty fight from one that will not trouble them', () => {
    render(<DifficultyReadout difficulty={encounterDifficulty([], PARTY)} />)
    expect(screen.getByText('No monsters yet')).toBeInTheDocument()

    renderAt(100)
    expect(screen.getByText('Under Low')).toBeInTheDocument()
  })

  it('warns, in XP, once the fight is spent past High', () => {
    renderAt(2400)

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('800 XP past a High fight')
  })

  it('does not warn on a High fight that lands inside the budget', () => {
    renderAt(1600)

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('reads the same monsters harder for a smaller table', () => {
    renderAt(900, [3, 3])

    // 900 is Moderate for four and past High (800) for two.
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('100 XP past a High fight')
  })
})
