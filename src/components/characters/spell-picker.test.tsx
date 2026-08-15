import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { SpellPicker } from './spell-picker'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useClassSpells: jest.fn(),
}))

import { useClassSpells } from '@/lib/dnd-api/swr-hooks'

const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>

const WIZARD_SPELLS = [
  { index: 'fireball', name: 'Fireball', url: '/api/spells/fireball', level: 3 },
  { index: 'mage-hand', name: 'Mage Hand', url: '/api/spells/mage-hand', level: 0 },
  { index: 'magic-missile', name: 'Magic Missile', url: '/api/spells/magic-missile', level: 1 },
  {
    index: 'prestidigitation',
    name: 'Prestidigitation',
    url: '/api/spells/prestidigitation',
    level: 0,
  },
]

function mockSpells(overrides: Partial<ReturnType<typeof useClassSpells>> = {}): void {
  mockUseClassSpells.mockReturnValue({
    spells: WIZARD_SPELLS,
    count: WIZARD_SPELLS.length,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useClassSpells>)
}

/** The picker is controlled; this holds the selection the way the form does. */
function Harness({ classIndex = 'wizard' }: { classIndex?: string }) {
  const [value, setValue] = useState<string[]>([])

  return (
    <>
      <SpellPicker classIndex={classIndex} classLabel="Wizard" value={value} onChange={setValue} />
      <output data-testid="selection">{value.join(',')}</output>
    </>
  )
}

beforeEach(() => {
  mockSpells()
})

describe('SpellPicker', () => {
  it('asks for a class before showing any spells', () => {
    render(<Harness classIndex="" />)

    expect(screen.getByText(/pick a class first/i)).toBeInTheDocument()
    // The hook is called with null, so no request goes out for a class nobody picked.
    expect(mockUseClassSpells).toHaveBeenCalledWith(null)
  })

  it('says so when the class has no spells rather than showing an empty box', () => {
    mockSpells({ spells: [], count: 0 })

    render(<Harness />)

    expect(screen.getByText(/no spells in the reference data/i)).toBeInTheDocument()
  })

  it('groups spells by level, cantrips first', () => {
    render(<Harness />)

    const headings = screen.getAllByRole('heading', { level: 4 }).map((node) => node.textContent)
    expect(headings).toEqual(['Cantrips', 'Level 1', 'Level 3'])
  })

  it('toggles a spell on and back off', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('checkbox', { name: 'Fireball' }))
    expect(screen.getByTestId('selection')).toHaveTextContent('fireball')
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Fireball' }))
    expect(screen.getByTestId('selection')).toBeEmptyDOMElement()
  })

  it('keeps a selection that the search box has filtered out of view', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('checkbox', { name: 'Fireball' }))
    await user.type(screen.getByRole('searchbox', { name: /search spells/i }), 'mage')

    expect(screen.queryByRole('checkbox', { name: 'Fireball' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Mage Hand' })).toBeInTheDocument()
    // Still chosen — filtering narrows the view, it does not deselect.
    expect(screen.getByTestId('selection')).toHaveTextContent('fireball')
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('reports a search that matches nothing', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('searchbox', { name: /search spells/i }), 'wish')

    expect(screen.getByText(/no spell matches/i)).toBeInTheDocument()
  })

  it('clears every selection at once', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('checkbox', { name: 'Fireball' }))
    await user.click(screen.getByRole('checkbox', { name: 'Magic Missile' }))
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByTestId('selection')).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('lets the character be saved without spells when the list will not load', () => {
    mockSpells({ spells: [], count: 0, error: new Error('offline') })

    render(<Harness />)

    expect(screen.getByRole('alert')).toHaveTextContent(/add spells later/i)
  })
})
