import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReferenceCard } from './reference-card'

describe('ReferenceCard', () => {
  it('renders the name and type badge', () => {
    render(<ReferenceCard name="Fireball" badge="Spell" onSelect={jest.fn()} />)

    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.getByText('Spell')).toBeInTheDocument()
    expect(screen.getByText('Tap to view details')).toBeInTheDocument()
  })

  it('exposes the whole card as one labelled button', () => {
    render(<ReferenceCard name="Fireball" badge="Spell" onSelect={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'View details for Fireball' })).toBeInTheDocument()
  })

  it('calls onSelect when tapped', async () => {
    const onSelect = jest.fn()
    render(<ReferenceCard name="Fireball" badge="Spell" onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'View details for Fireball' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
