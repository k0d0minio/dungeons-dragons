import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BottomNav } from './bottom-nav'

let pathname = '/'

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useSpells: () => ({ spells: [{ index: 'fireball', name: 'Fireball' }], isLoading: false }),
  useMonsters: () => ({ monsters: [{ index: 'goblin', name: 'Goblin' }], isLoading: false }),
  useEquipment: () => ({ equipment: [], isLoading: false }),
  useMagicItems: () => ({ magicItems: [], isLoading: false }),
  useClasses: () => ({ classes: [], isLoading: false }),
  useRaces: () => ({ races: [], isLoading: false }),
}))

jest.mock('@/components/reference/spell-detail', () => ({ SpellDetail: () => <div>spell</div> }))
jest.mock('@/components/reference/class-detail', () => ({ ClassDetail: () => <div>class</div> }))
jest.mock('@/components/reference/race-detail', () => ({ RaceDetail: () => <div>race</div> }))
jest.mock('@/components/reference/monster-detail', () => ({
  MonsterDetail: () => <div>monster</div>,
}))
jest.mock('@/components/reference/equipment-detail', () => ({
  EquipmentDetail: () => <div>equipment</div>,
}))
jest.mock('@/components/reference/magic-item-detail', () => ({
  MagicItemDetail: () => <div>magic item</div>,
}))

beforeEach(() => {
  pathname = '/'
})

describe('BottomNav', () => {
  it('offers the three destinations the app has', () => {
    render(<BottomNav />)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByText('Character')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('DM')).toBeInTheDocument()
  })

  it.each([
    ['/library', 'Library'],
    ['/characters', 'Character'],
    ['/characters/abc-123', 'Character'],
    ['/dm', 'DM'],
  ])('marks the destination owning %s as current', (current, label) => {
    pathname = current

    render(<BottomNav />)

    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(label)
  })

  it('links to the library browser while it is the page you are on', () => {
    render(<BottomNav />)

    expect(screen.getByRole('link', { name: /Library/ })).toHaveAttribute('href', '/library')
  })

  it('opens reference lookup over the page instead of navigating away from a sheet', async () => {
    const user = userEvent.setup()
    pathname = '/characters/abc-123'

    render(<BottomNav />)

    // The point of the ticket: from an open sheet, Library must not be a
    // link, because following one unmounts the sheet and loses your place.
    expect(screen.queryByRole('link', { name: /Library/ })).not.toBeInTheDocument()

    const library = screen.getByRole('button', { name: /Library/ })
    expect(library).toHaveAttribute('aria-expanded', 'false')

    await user.click(library)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search the reference' })).toBeInTheDocument()
    expect(library).toHaveAttribute('aria-expanded', 'true')
  })
})
