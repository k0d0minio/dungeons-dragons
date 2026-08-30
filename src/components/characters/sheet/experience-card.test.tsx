import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { CombatState } from '@/lib/characters/combat'

import { ExperienceCard } from './experience-card'

// The card's contract (DND-055): a milestone table sees a way in and nothing
// else; a tracking table sees the total, what the next level costs and how far
// off it is; and passing a threshold *nudges* — the level never moves here.

const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

function stateWith(experience: number | null): CombatState {
  return {
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    spellSlots: {},
    conditions: [],
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    exhaustion: 0,
    hitDiceUsed: 0,
    concentration: null,
    experience,
    classResources: [],
    preparedSpellIndexes: [],
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
    heroicInspiration: false,
  }
}

function Harness({ experience, level = 4 }: { experience: number | null; level?: number }) {
  const [state, setState] = useState(() => stateWith(experience))

  return (
    <>
      <ExperienceCard
        characterId={CHARACTER_ID}
        level={level}
        state={state}
        apply={(transition) => setState((current) => transition(current))}
      />
      <output data-testid="experience">{String(state.experience)}</output>
    </>
  )
}

describe('ExperienceCard — not tracking', () => {
  it('says so plainly and mentions no numbers', () => {
    render(<Harness experience={null} />)

    expect(screen.getByText(/not tracked/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/add xp/i)).not.toBeInTheDocument()
  })

  it('starts counting from zero on one tap', async () => {
    const user = userEvent.setup()
    render(<Harness experience={null} />)

    await user.click(screen.getByRole('button', { name: /track xp/i }))

    expect(screen.getByTestId('experience')).toHaveTextContent('0')
    expect(screen.getByLabelText(/add xp/i)).toBeInTheDocument()
  })
})

describe('ExperienceCard — tracking', () => {
  it('shows the total and what the next level costs', () => {
    render(<Harness experience={3_600} />)

    expect(screen.getByText('3,600')).toBeInTheDocument()
    expect(screen.getByText(/2,900 to level 5/i)).toBeInTheDocument()
    expect(screen.getByText(/at 6,500 XP/i)).toBeInTheDocument()
  })

  it('fills the bar by how far through the level the total is', () => {
    render(<Harness experience={3_600} />)

    // 900 of the 3,800 XP between 4th and 5th — 24%.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '24')
  })

  it('says nothing about a level when the XP has not earned one', () => {
    render(<Harness experience={3_600} />)

    expect(screen.queryByText(/level 5 available/i)).not.toBeInTheDocument()
  })

  it('adds a manual award without leaving the sheet', async () => {
    const user = userEvent.setup()
    render(<Harness experience={3_600} />)

    await user.type(screen.getByLabelText(/add xp/i), '500')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByTestId('experience')).toHaveTextContent('4100')
  })

  it('takes an award back when the amount is negative', async () => {
    const user = userEvent.setup()
    render(<Harness experience={3_600} />)

    await user.type(screen.getByLabelText(/add xp/i), '-600')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByTestId('experience')).toHaveTextContent('3000')
  })

  it('stops tracking without turning into a zero', async () => {
    const user = userEvent.setup()
    render(<Harness experience={3_600} />)

    await user.click(screen.getByRole('button', { name: /stop tracking/i }))

    expect(screen.getByTestId('experience')).toHaveTextContent('null')
  })
})

describe('ExperienceCard — a level waiting to be taken', () => {
  it('nudges towards the planner and never levels anyone up', async () => {
    const user = userEvent.setup()
    render(<Harness experience={7_000} level={4} />)

    expect(screen.getByText(/level 5 available/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /level up/i })).toHaveAttribute(
      'href',
      `/characters/${CHARACTER_ID}/level`,
    )

    // Nothing on this card can change the level — the only writes it makes are
    // to the XP total itself.
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText(/level 5 available/i)).toBeInTheDocument()
  })

  it('fills the bar towards the level after the one that is waiting', () => {
    // 5th earned on 10,250 XP: 3,750 of the 7,500 between 5th and 6th.
    render(<Harness experience={10_250} level={4} />)

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText(/at 14,000 XP/i)).toBeInTheDocument()
  })

  it('has nothing left to earn at 20th', () => {
    render(<Harness experience={400_000} level={20} />)

    expect(screen.getByText(/20th level/i)).toBeInTheDocument()
    expect(screen.queryByText(/available/i)).not.toBeInTheDocument()
  })
})
