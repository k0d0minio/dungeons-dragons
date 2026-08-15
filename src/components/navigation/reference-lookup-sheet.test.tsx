import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ReferenceLookupSheet } from './reference-lookup-sheet'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useSpells: () => ({
    spells: [
      { index: 'fireball', name: 'Fireball' },
      { index: 'goodberry', name: 'Goodberry' },
    ],
    isLoading: false,
  }),
  useMonsters: () => ({
    monsters: [
      { index: 'hobgoblin', name: 'Hobgoblin' },
      { index: 'goblin', name: 'Goblin' },
    ],
    isLoading: false,
  }),
  useEquipment: () => ({ equipment: [{ index: 'longsword', name: 'Longsword' }], isLoading: false }),
  useClasses: () => ({ classes: [{ index: 'wizard', name: 'Wizard' }], isLoading: false }),
  useRaces: () => ({ races: [{ index: 'human', name: 'Human' }], isLoading: false }),
}))

// Same shape as the DND-003 detail sheet's own test: stub the five detail
// views so this file is about lookup, not about what a stat block renders.
jest.mock('@/components/reference/monster-detail', () => ({
  MonsterDetail: ({ index }: { index: string }) => <div>detail for {index}</div>,
}))
jest.mock('@/components/reference/spell-detail', () => ({ SpellDetail: () => <div>spell</div> }))
jest.mock('@/components/reference/class-detail', () => ({ ClassDetail: () => <div>class</div> }))
jest.mock('@/components/reference/race-detail', () => ({ RaceDetail: () => <div>race</div> }))
jest.mock('@/components/reference/equipment-detail', () => ({
  EquipmentDetail: () => <div>equipment</div>,
}))

/** The search field, which is the only thing on screen when the sheet opens. */
function searchField() {
  return screen.getByRole('searchbox', { name: 'Search the reference' })
}

describe('ReferenceLookupSheet', () => {
  it('renders nothing until it is opened', () => {
    render(<ReferenceLookupSheet open={false} onOpenChange={jest.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('searches every reference type from one field', async () => {
    const user = userEvent.setup()
    render(<ReferenceLookupSheet open onOpenChange={jest.fn()} />)

    await user.type(searchField(), 'go')

    const results = screen.getAllByRole('listitem').map((item) => item.textContent)

    // A name that starts with what you typed beats one that merely contains
    // it, and nothing that does neither gets in.
    expect(results[0]).toContain('Goodberry')
    expect(results.some((text) => text?.startsWith('Goblin'))).toBe(true)
    expect(results.some((text) => text?.startsWith('Hobgoblin'))).toBe(true)
    expect(results.some((text) => text?.includes('Longsword'))).toBe(false)
  })

  it('labels each result with the type it came from', async () => {
    const user = userEvent.setup()
    render(<ReferenceLookupSheet open onOpenChange={jest.fn()} />)

    await user.type(searchField(), 'goblin')

    expect(screen.getAllByText('Monster')).toHaveLength(2)
  })

  it('shows the detail in place, and comes back to the results', async () => {
    const user = userEvent.setup()
    render(<ReferenceLookupSheet open onOpenChange={jest.fn()} />)

    await user.type(searchField(), 'goblin')
    await user.click(screen.getByRole('button', { name: /^Goblin/ }))

    expect(screen.getByText('detail for goblin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to search' }))

    expect(searchField()).toHaveValue('goblin')
  })

  it('says so when nothing matches', async () => {
    const user = userEvent.setup()
    render(<ReferenceLookupSheet open onOpenChange={jest.fn()} />)

    await user.type(searchField(), 'zzzz')

    expect(screen.getByText(/Nothing matching/)).toBeInTheDocument()
  })
})
