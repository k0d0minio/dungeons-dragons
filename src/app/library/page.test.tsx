import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryPage from '../library/page'

interface ListState {
  items: Array<{ index: string; name: string }>
  isLoading: boolean
  error: unknown
}

const emptyState = (): ListState => ({ items: [], isLoading: false, error: null })

const mockSpells = emptyState()
const mockEquipment = emptyState()
const mockMonsters = emptyState()
const mockMagicItems = emptyState()

// Only the fetching hooks are stubbed; `searchByName` is the real filter, so
// these tests exercise the search the Library actually ships. Classes and
// species have no hook to stub — the Library reads those straight out of the
// local SRD data, so those two lists are the real twelve and nine.
jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useSpells: () => ({ ...mockSpells, spells: mockSpells.items }),
  useEquipment: () => ({ ...mockEquipment, equipment: mockEquipment.items }),
  useMonsters: () => ({ ...mockMonsters, monsters: mockMonsters.items }),
  useMagicItems: () => ({ ...mockMagicItems, magicItems: mockMagicItems.items }),
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

const chip = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  setList(mockSpells, { items: [{ index: 'fireball', name: 'Fireball' }] })
  setList(mockEquipment, { items: [{ index: 'sword', name: 'Sword' }] })
  setList(mockMonsters, { items: [{ index: 'dragon', name: 'Dragon' }] })
  setList(mockMagicItems, { items: [{ index: 'bag-of-holding', name: 'Bag of Holding' }] })
})

describe('Library', () => {
  it('carries the large Library title the shell shares', () => {
    render(<LibraryPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument()
  })

  it('puts the search box ahead of the type filter chips', () => {
    render(<LibraryPage />)

    const search = screen.getByLabelText('Search D&D Content')
    const spellsChip = chip('Spells')

    expect(
      search.compareDocumentPosition(spellsChip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('lights the Spells chip by default and shows its list', () => {
    render(<LibraryPage />)

    expect(chip('Spells')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Fireball')).toBeInTheDocument()
  })

  it('names every searchable type in the placeholder', () => {
    render(<LibraryPage />)

    expect(
      screen.getByPlaceholderText(
        'Search spells, classes, species, equipment, magic items, monsters',
      ),
    ).toBeInTheDocument()
  })

  it('links to the rules index and the two mid-turn chapters without displacing the search field', () => {
    render(<LibraryPage />)

    const search = screen.getByLabelText('Search D&D Content')
    const allChapters = screen.getByRole('link', { name: 'All chapters' })
    const conditions = screen.getByRole('link', { name: 'Conditions' })
    const quickReference = screen.getByRole('link', { name: 'Quick reference' })

    expect(allChapters).toHaveAttribute('href', '/rules')
    expect(conditions).toHaveAttribute('href', '/rules/conditions')
    expect(quickReference).toHaveAttribute('href', '/rules/quick-reference')
    // The chips sit under the search field, never above it: search is the
    // Library's fast path.
    expect(
      search.compareDocumentPosition(allChapters) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders six type filter chips', () => {
    render(<LibraryPage />)

    for (const type of ['Spells', 'Classes', 'Species', 'Equipment', 'Magic Items', 'Monsters']) {
      expect(chip(type)).toBeInTheDocument()
    }
  })

  it('switches to a lit type on chip tap', async () => {
    const user = userEvent.setup()
    render(<LibraryPage />)

    await user.click(chip('Monsters'))

    expect(chip('Monsters')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Dragon')).toBeInTheDocument()
    expect(chip('Spells')).toHaveAttribute('aria-pressed', 'false')
  })

  it('should render footer', () => {
    render(<LibraryPage />)

    expect(
      screen.getByText('Powered by D&D 5e API • Built with Next.js, SWR, and shadcn/ui'),
    ).toBeInTheDocument()
  })

  describe('search', () => {
    it('filters the spells list', async () => {
      const user = userEvent.setup()
      setList(mockSpells, {
        items: [
          { index: 'fireball', name: 'Fireball' },
          { index: 'cure-wounds', name: 'Cure Wounds' },
        ],
      })
      render(<LibraryPage />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'fire')

      expect(screen.getByText('Fireball')).toBeInTheDocument()
      expect(screen.queryByText('Cure Wounds')).not.toBeInTheDocument()
      expect(screen.getByText('Spells (1 of 2)')).toBeInTheDocument()
    })

    it('filters the classes list, which the query used to ignore', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'wiz')
      await user.click(chip('Classes'))

      expect(screen.getByText('Wizard')).toBeInTheDocument()
      expect(screen.queryByText('Barbarian')).not.toBeInTheDocument()
      // The twelve SRD 5.2.1 classes, filtered to the one that matched.
      expect(screen.getByText('Classes (1 of 12)')).toBeInTheDocument()
    })

    it('filters the species list, which the query used to ignore', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'elf')
      await user.click(chip('Species'))

      expect(screen.getByText('Elf')).toBeInTheDocument()
      expect(screen.queryByText('Human')).not.toBeInTheDocument()
      // The nine SRD 5.2.1 species — half-elf and half-orc are not among them.
      expect(screen.getByText('Species (1 of 9)')).toBeInTheDocument()
    })

    it('filters the magic items list like the other five', async () => {
      const user = userEvent.setup()
      setList(mockMagicItems, {
        items: [
          { index: 'bag-of-holding', name: 'Bag of Holding' },
          { index: 'holy-avenger', name: 'Holy Avenger' },
        ],
      })
      render(<LibraryPage />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'bag')
      await user.click(chip('Magic Items'))

      expect(screen.getByText('Bag of Holding')).toBeInTheDocument()
      expect(screen.queryByText('Holy Avenger')).not.toBeInTheDocument()
      expect(screen.getByText('Magic Items (1 of 2)')).toBeInTheDocument()
    })

    it('names the failed query when nothing matches', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'chromatic orb')

      expect(screen.getByText('No spells match “chromatic orb”.')).toBeInTheDocument()
    })

    it('points at the chips that matched, and switches to one on tap', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'wizard')

      expect(screen.getByText('No spells match “wizard”.')).toBeInTheDocument()

      const jump = screen.getByRole('button', { name: 'Classes (1)' })
      await user.click(jump)

      expect(chip('Classes')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Wizard')).toBeInTheDocument()
    })

    it('counts magic items among the other chips that matched', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(screen.getByLabelText('Search D&D Content'), 'holding')

      expect(screen.getByText('No spells match “holding”.')).toBeInTheDocument()

      const jump = screen.getByRole('button', { name: 'Magic Items (1)' })
      await user.click(jump)

      expect(chip('Magic Items')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Bag of Holding')).toBeInTheDocument()
    })
  })

  describe('counts and truncation', () => {
    it('caps the list, says so, and shows the rest on request', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { items: makeItems('Spell', 20) })
      render(<LibraryPage />)

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
      render(<LibraryPage />)

      expect(screen.getByText('Loading spells...')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="card-title"]')).toHaveTextContent(/^Spells$/)
      expect(screen.queryByText('Spells (0)')).not.toBeInTheDocument()
    })

    it('distinguishes an empty list from a loading one', () => {
      setList(mockSpells, { items: [] })
      render(<LibraryPage />)

      expect(screen.getByText('No spells in the reference data.')).toBeInTheDocument()
      expect(screen.queryByText('Loading spells...')).not.toBeInTheDocument()
    })
  })
})
