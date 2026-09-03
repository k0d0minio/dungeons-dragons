import { render, screen } from '@testing-library/react'

import { LevelUpWaitingBand } from './level-up-waiting-band'

// The player's half of D35. Everything here is derived from two numbers, and
// the band's whole contract is: appear when they differ the right way, offer
// the planner, and never claim to have levelled anybody up.

const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

describe('LevelUpWaitingBand', () => {
  it('says what the DM called, and offers the next level as a link to the planner', () => {
    render(<LevelUpWaitingBand characterId={CHARACTER_ID} level={3} milestoneLevel={4} />)

    expect(screen.getByText('Your DM says the party is level 4.')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'Level up to 4' })
    expect(link).toHaveAttribute('href', `/characters/${CHARACTER_ID}/level`)
  })

  it('offers one step at a time to a character several levels behind', () => {
    // The planner takes one level; being offered "level up to 6" from 3rd would
    // promise something the next screen does not do.
    render(<LevelUpWaitingBand characterId={CHARACTER_ID} level={3} milestoneLevel={6} />)

    expect(screen.getByText(/you have 3 levels to take/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Level up to 4' })).toBeInTheDocument()
  })

  it('is honest that nothing has happened to the sheet yet', () => {
    render(<LevelUpWaitingBand characterId={CHARACTER_ID} level={3} milestoneLevel={4} />)

    expect(screen.getByText(/you are still level 3/i)).toBeInTheDocument()
  })

  it('renders nothing once the level has been taken', () => {
    // Derived, so it disappears on the next render of the sheet — there is no
    // flag anywhere to clear.
    const { container } = render(
      <LevelUpWaitingBand characterId={CHARACTER_ID} level={4} milestoneLevel={4} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a character whose table has called no level', () => {
    const { container } = render(
      <LevelUpWaitingBand characterId={CHARACTER_ID} level={3} milestoneLevel={null} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('says nothing to a character above the milestone', () => {
    const { container } = render(
      <LevelUpWaitingBand characterId={CHARACTER_ID} level={5} milestoneLevel={3} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
