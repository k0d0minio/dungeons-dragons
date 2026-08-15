import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../app/page'

interface ListState {
  items: Array<{ index: string; name: string }>
  isLoading: boolean
  error: unknown
}

const emptyState = (): ListState => ({ items: [], isLoading: false, error: null })

const mockSpells = emptyState()
const mockClasses = emptyState()
const mockRaces = emptyState()
const mockEquipment = emptyState()
const mockMonsters = emptyState()

// Only the fetching hooks are stubbed; `searchByName` is the real filter, so
// these tests exercise the search the page actually ships.
jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  ...jest.requireActual('@/lib/dnd-api/swr-hooks'),
  useSpells: () => ({ ...mockSpells, spells: mockSpells.items }),
  useClasses: () => ({ ...mockClasses, classes: mockClasses.items }),
  useRaces: () => ({ ...mockRaces, races: mockRaces.items }),
  useEquipment: () => ({ ...mockEquipment, equipment: mockEquipment.items }),
  useMonsters: () => ({ ...mockMonsters, monsters: mockMonsters.items }),
}))

function setList(state: ListState, next: Partial<ListState>) {
  Object.assign(state, { items: [], isLoading: false, error: null }, next)
}

function makeItems(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    index: `${prefix}-${i + 1}`,
    name: `${prefix} ${i + 1}`,
  }))
}

beforeEach(() => {
  setList(mockSpells, { items: [{ index: 'fireball', name: 'Fireball' }] })
  setList(mockClasses, { items: [{ index: 'wizard', name: 'Wizard' }] })
  setList(mockRaces, { items: [{ index: 'human', name: 'Human' }] })
  setList(mockEquipment, { items: [{ index: 'sword', name: 'Sword' }] })
  setList(mockMonsters, { items: [{ index: 'dragon', name: 'Dragon' }] })
})

describe('Home Page', () => {
  // DND-022: the page opens on the search box. The heading is still in the
  // document for structure, but it is not what the eye lands on.
  it('keeps the page heading off-screen', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only')
  })

  it('puts search ahead of the category tabs', () => {
    render(<Home />)

    const search = screen.getByLabelText('Search D&D Content')
    const firstTab = screen.getByRole('tab', { name: 'Spells' })

    // Nothing sits between the site header and the search input, so the tabs
    // — and everything else on the page — follow it in document order.
    expect(
      search.compareDocumentPosition(firstTab) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('no longer renders the hero or the stat-card row', () => {
    render(<Home />)

    expect(
      screen.queryByText(/Your comprehensive D&D 5e companion/)
    ).not.toBeInTheDocument()

    // Each category name now appears once, as a tab. The stat cards that
    // repeated all five above the fold are gone; the counts they carried
    // still render in each tab's own heading.
    for (const category of ['Spells', 'Classes', 'Races', 'Equipment', 'Monsters']) {
      expect(screen.getAllByText(category)).toHaveLength(1)
    }
  })

  it('names every searchable tab in the placeholder', () => {
    render(<Home />)

    expect(screen.getByLabelText('Search D&D Content')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Search spells, classes, races, equipment, monsters')
    ).toBeInTheDocument()
  })

  it('should render tabs navigation', () => {
    render(<Home />)

    expect(screen.getByRole('tab', { name: 'Spells' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Classes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Races' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Equipment' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Monsters' })).toBeInTheDocument()
  })

  it('should render spells content', () => {
    render(<Home />)

    expect(screen.getByText('Magical incantations and abilities for spellcasters')).toBeInTheDocument()
    expect(screen.getByText('Fireball')).toBeInTheDocument()
  })

  it('should render footer', () => {
    render(<Home />)

    expect(screen.getByText('Powered by D&D 5e API • Built with Next.js 15, SWR, and shadcn/ui')).toBeInTheDocument()
  })

  describe('search', () => {
    it('filters the spells tab', async () => {
      const user = userEvent.setup()
      setList(mockSpells, {
        items: [
          { index: 'fireball', name: 'Fireball' },
          { index: 'cure-wounds', name: 'Cure Wounds' },
        ],
      })
      render(<Home />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'fire')

      expect(screen.getByText('Fireball')).toBeInTheDocument()
      expect(screen.queryByText('Cure Wounds')).not.toBeInTheDocument()
      expect(screen.getByText('Spells (1 of 2)')).toBeInTheDocument()
    })

    it('filters the classes tab, which the query used to ignore', async () => {
      const user = userEvent.setup()
      setList(mockClasses, {
        items: [
          { index: 'wizard', name: 'Wizard' },
          { index: 'barbarian', name: 'Barbarian' },
        ],
      })
      render(<Home />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'wiz')
      await user.click(screen.getByRole('tab', { name: 'Classes' }))

      expect(screen.getByText('Wizard')).toBeInTheDocument()
      expect(screen.queryByText('Barbarian')).not.toBeInTheDocument()
      expect(screen.getByText('Classes (1 of 2)')).toBeInTheDocument()
    })

    it('filters the races tab, which the query used to ignore', async () => {
      const user = userEvent.setup()
      setList(mockRaces, {
        items: [
          { index: 'human', name: 'Human' },
          { index: 'elf', name: 'Elf' },
        ],
      })
      render(<Home />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'elf')
      await user.click(screen.getByRole('tab', { name: 'Races' }))

      expect(screen.getByText('Elf')).toBeInTheDocument()
      expect(screen.queryByText('Human')).not.toBeInTheDocument()
    })

    it('names the failed query when nothing matches', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'chromatic orb')

      expect(screen.getByText('No spells match “chromatic orb”.')).toBeInTheDocument()
    })

    it('points at the tabs that did match, and switches to one on tap', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'wizard')

      expect(screen.getByText('No spells match “wizard”.')).toBeInTheDocument()

      const jump = screen.getByRole('button', { name: 'Classes (1)' })
      await user.click(jump)

      expect(screen.getByRole('tab', { name: 'Classes' })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      expect(screen.getByText('Wizard')).toBeInTheDocument()
    })
  })

  describe('counts and truncation', () => {
    it('caps the list, says so, and shows the rest on request', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { items: makeItems('Spell', 20) })
      render(<Home />)

      expect(screen.getByText('Spells (20)')).toBeInTheDocument()
      expect(screen.getByText('Showing 12 of 20 spells.')).toBeInTheDocument()
      expect(screen.getByText('Spell 12')).toBeInTheDocument()
      expect(screen.queryByText('Spell 13')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Show 8 more' }))

      expect(screen.getByText('Spell 20')).toBeInTheDocument()
      expect(screen.getByText('Showing all 20 spells.')).toBeInTheDocument()
    })

    it('claims no count while the fetch is in flight', () => {
      setList(mockSpells, { isLoading: true })
      render(<Home />)

      expect(screen.getByText('Loading spells...')).toBeInTheDocument()
      // The panel heading is the only card title on the tab.
      expect(document.querySelector('[data-slot="card-title"]')).toHaveTextContent(
        /^Spells$/
      )
      expect(screen.queryByText('Spells (0)')).not.toBeInTheDocument()
    })

    it('shows a dash rather than zero in the stat cards while loading', () => {
      setList(mockSpells, { isLoading: true })
      setList(mockMonsters, { isLoading: true })
      render(<Home />)

      expect(screen.getAllByText('—')).toHaveLength(2)
    })

    it('distinguishes an empty list from a loading one', () => {
      setList(mockSpells, { items: [] })
      render(<Home />)

      expect(screen.getByText('No spells in the reference data.')).toBeInTheDocument()
      expect(screen.queryByText('Loading spells...')).not.toBeInTheDocument()
    })
  })
})
