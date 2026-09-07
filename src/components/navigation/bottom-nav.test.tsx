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
  // D48: the DM's bar is the chronology of a game — Prep · Play · Sessions —
  // and then Library. Never Character: the DM has none, and offering him one
  // led straight to "make your first character".
  it('gives the DM four stops in chronological order, and no Character', () => {
    render(<BottomNav showDm />)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.queryByText('Character')).not.toBeInTheDocument()
    expect(screen.queryByText('DM')).not.toBeInTheDocument()

    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Prep', 'Play', 'Sessions', 'Library'])
  })

  it('sends each DM stop to its id-less route — the campaign is scope, not a page', () => {
    // Nowhere on the bar is there a campaign id: the tabs resolve the active
    // campaign server-side, which is what the chip under the title names.
    pathname = '/library'

    render(<BottomNav showDm />)

    expect(screen.getByRole('link', { name: /Prep/ })).toHaveAttribute('href', '/dm/prep')
    expect(screen.getByRole('link', { name: /Play/ })).toHaveAttribute('href', '/dm/play')
    expect(screen.getByRole('link', { name: /Sessions/ })).toHaveAttribute('href', '/dm/sessions')
  })

  it('leaves the player’s bar exactly as it was — Character · Library, and no DM stop', () => {
    // `user-management/invites-and-roles`: a player's bar has two stops, and
    // the default is the player's bar — the DM's is opt-in from the layout.
    // D48 moved the DM's four stops and nothing else.
    const { unmount } = render(<BottomNav showDm={false} />)

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Character',
      'Library',
    ])
    expect(screen.queryByText('Prep')).not.toBeInTheDocument()
    expect(screen.queryByText('Play')).not.toBeInTheDocument()
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument()

    unmount()
    render(<BottomNav />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText('Prep')).not.toBeInTheDocument()
  })

  it.each([
    ['/library', 'Library', true],
    ['/characters', 'Character', false],
    ['/characters/abc-123', 'Character', false],
  ])('marks the destination owning %s as current', (current, label, showDm) => {
    pathname = current

    render(<BottomNav showDm={showDm} />)

    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(label)
  })

  // The prep entities, the tracker, the crib and the log keep their routes —
  // D48 re-homes their doors. Which stop lights on each is the whole map.
  it.each([
    // Prep: everything written before the night.
    ['/dm/prep', 'Prep'],
    ['/dm/campaigns/abc-123/npcs', 'Prep'],
    ['/dm/campaigns/abc-123/locations', 'Prep'],
    ['/dm/campaigns/abc-123/handouts', 'Prep'],
    ['/dm/campaigns/abc-123/session-plans', 'Prep'],
    ['/dm/campaigns/abc-123/session-plans/plan-1', 'Prep'],
    // A fight is built before the night and run during it, so the two halves
    // of the encounter routes light different stops.
    ['/dm/campaigns/abc-123/encounters/new', 'Prep'],
    // Play: everything reached with the table in front of you.
    ['/dm/play', 'Play'],
    ['/dm/encounters/enc-1', 'Play'],
    ['/dm/crib', 'Play'],
    ['/dm/campaigns/abc-123/party', 'Play'],
    ['/dm/campaigns/abc-123/party/char-1', 'Play'],
    // Sessions: what happened, after the night.
    ['/dm/sessions', 'Sessions'],
    ['/dm/campaigns/abc-123/session-log', 'Sessions'],
  ])('lights the stop owning %s', (current, label) => {
    pathname = current

    render(<BottomNav showDm />)

    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(label)
  })

  it.each([
    // Between-session admin, not a moment in a game.
    ['/dm/campaigns/abc-123'],
    ['/dm/campaigns/abc-123/settings'],
    ['/dm/users'],
    // A DM reading a party member's sheet (D13): it is not his character.
    ['/characters/abc-123'],
  ])('lights nothing for the DM on %s', (current) => {
    pathname = current

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
