import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BottomNav } from './bottom-nav'

let pathname = '/'

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

jest.mock('@/lib/srd/hooks', () => ({
  useSpells: () => ({ spells: [{ index: 'fireball', name: 'Fireball' }], isLoading: false }),
  useMonsters: () => ({ monsters: [{ index: 'goblin', name: 'Goblin' }], isLoading: false }),
  useEquipment: () => ({ equipment: [], isLoading: false }),
  useMagicItems: () => ({ magicItems: [], isLoading: false }),
}))

jest.mock('@/components/reference/spell-detail', () => ({ SpellDetail: () => <div>spell</div> }))
jest.mock('@/components/reference/class-detail', () => ({ ClassDetail: () => <div>class</div> }))
jest.mock('@/components/reference/species-detail', () => ({
  SpeciesDetail: () => <div>species</div>,
}))
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
  // `first-table/dm-front-door`: the DM's bar is Library · DM — two stops,
  // like everyone's, and none of them leads to making a character.
  it('gives the DM two stops, Library and DM, and no Character', () => {
    render(<BottomNav showDm />)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.queryByText('Character')).not.toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('DM')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('never draws the DM stop for a player, or for nobody at all', () => {
    // `user-management/invites-and-roles`: a player's bar has two stops, and
    // the default is the player's bar — the DM's is opt-in from the layout.
    const { unmount } = render(<BottomNav showDm={false} />)

    expect(screen.getByText('Character')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.queryByText('DM')).not.toBeInTheDocument()

    unmount()
    render(<BottomNav />)

    expect(screen.queryByText('DM')).not.toBeInTheDocument()
  })

  it.each([
    ['/library', 'Library', true],
    ['/characters', 'Character', false],
    ['/characters/abc-123', 'Character', false],
    ['/dm', 'DM', true],
  ])('marks the destination owning %s as current', (current, label, showDm) => {
    pathname = current

    render(<BottomNav showDm={showDm} />)

    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(label)
  })

  it('lights nothing for the DM on a party member’s sheet — it is not his character', () => {
    pathname = '/characters/abc-123'

    render(<BottomNav showDm />)

    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument()
  })

  it('links to the library browser while it is the page you are on', () => {
    pathname = '/library'

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
