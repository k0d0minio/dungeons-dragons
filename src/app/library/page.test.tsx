// Pins the search-first Library (first-table/library-search-first): the page
// opens on the search box alone, a query lists hits grouped by type, the
// chips narrow a search or browse a whole list, and the DND-021 list states
// (loading, failed, capped) survive in browse mode.
import { render, screen, within } from '@testing-library/react'
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

// Only the fetching hooks are stubbed; the matcher is the real one, so these
// tests exercise the search the Library actually ships. Classes and species
// have no hook to stub — the Library reads those straight out of the local
// SRD data, so those two lists are the real twelve and nine.
jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useSpells: () => ({ ...mockSpells, spells: mockSpells.items }),
  useEquipment: () => ({ ...mockEquipment, equipment: mockEquipment.items }),
  useMonsters: () => ({ ...mockMonsters, monsters: mockMonsters.items }),
  useMagicItems: () => ({ ...mockMagicItems, magicItems: mockMagicItems.items }),
}))

// The detail sheet is DND-003's and has its own test; here a stat block is a
// line of text so the test is about reaching it, not rendering it.
jest.mock('@/components/reference/monster-detail', () => ({
  MonsterDetail: ({ index }: { index: string }) => <div>detail for {index}</div>,
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
const searchBox = () => screen.getByLabelText('Search D&D Content')
const group = (name: string) => screen.getByRole('region', { name })

beforeEach(() => {
  setList(mockSpells, {
    items: [
      { index: 'fireball', name: 'Fireball' },
      { index: 'dragons-breath', name: 'Dragon’s Breath' },
    ],
  })
  setList(mockEquipment, { items: [{ index: 'sword', name: 'Sword' }] })
  setList(mockMonsters, {
    items: [
      { index: 'dragon', name: 'Dragon' },
      { index: 'hobgoblin', name: 'Hobgoblin' },
      { index: 'goblin', name: 'Goblin' },
    ],
  })
  setList(mockMagicItems, { items: [{ index: 'bag-of-holding', name: 'Bag of Holding' }] })
})

describe('Library', () => {
  it('carries the large Library title the shell shares', () => {
    render(<LibraryPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument()
  })

  it('puts the search box ahead of the type filter chips', () => {
    render(<LibraryPage />)

    const search = searchBox()
    const spellsChip = chip('Spells')

    expect(
      search.compareDocumentPosition(spellsChip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('opens on the search box with nothing lit and no list', () => {
    render(<LibraryPage />)

    expect(searchBox()).toHaveValue('')
    expect(
      screen.getByText(
        'Type a name to search all six types at once. Tap a type to browse its whole list.',
      ),
    ).toBeInTheDocument()
    for (const type of ['Spells', 'Classes', 'Species', 'Equipment', 'Magic Items', 'Monsters']) {
      expect(chip(type)).toHaveAttribute('aria-pressed', 'false')
    }
    expect(screen.queryByText('Fireball')).not.toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
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

    const search = searchBox()
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

  it('should render footer', () => {
    render(<LibraryPage />)

    expect(
      screen.getByText('Powered by D&D 5e API • Built with Next.js, SWR, and shadcn/ui'),
    ).toBeInTheDocument()
  })

  describe('search', () => {
    it('lists the hits grouped by type, prefix matches first, with no dead end', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(searchBox(), 'gobl')

      const monsters = group('Monsters (2)')
      const names = within(monsters)
        .getAllByRole('button')
        .map((button) => button.textContent)
      expect(names).toEqual(['Goblin', 'Hobgoblin'])
      expect(screen.queryByRole('region', { name: /^Spells/ })).not.toBeInTheDocument()
      expect(screen.queryByText(/No spells match/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Found in/)).not.toBeInTheDocument()
    })

    it('searches every type at once, the local classes and species included', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(searchBox(), 'dragon')

      expect(group('Spells (1)')).toHaveTextContent('Dragon’s Breath')
      expect(group('Monsters (1)')).toHaveTextContent('Dragon')
      expect(group('Species (1)')).toHaveTextContent('Dragonborn')

      await user.clear(searchBox())
      await user.type(searchBox(), 'wiz')

      expect(group('Classes (1)')).toHaveTextContent('Wizard')

      await user.clear(searchBox())
      await user.type(searchBox(), 'elf')

      expect(group('Species (1)')).toHaveTextContent('Elf')
      expect(screen.queryByText('Human')).not.toBeInTheDocument()
    })

    it('narrows to one type when a chip is lit, and widens again when it is tapped off', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(searchBox(), 'dragon')
      await user.click(chip('Monsters'))

      expect(chip('Monsters')).toHaveAttribute('aria-pressed', 'true')
      expect(group('Monsters (1)')).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Spells (1)' })).not.toBeInTheDocument()

      await user.click(chip('Monsters'))

      expect(chip('Monsters')).toHaveAttribute('aria-pressed', 'false')
      expect(group('Spells (1)')).toBeInTheDocument()
      expect(group('Monsters (1)')).toBeInTheDocument()
    })

    it('says when the lit type has no hits and offers the rest in one tap', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(searchBox(), 'dragon')
      await user.click(chip('Classes'))

      expect(screen.getByText('No classes match “dragon”.')).toBeInTheDocument()
      expect(screen.queryByRole('region')).not.toBeInTheDocument()

      // Spells, Monsters and Species (Dragonborn) all have one.
      await user.click(screen.getByRole('button', { name: 'Show all 3 results' }))

      expect(chip('Classes')).toHaveAttribute('aria-pressed', 'false')
      expect(group('Spells (1)')).toBeInTheDocument()
      expect(group('Monsters (1)')).toBeInTheDocument()
      expect(group('Species (1)')).toBeInTheDocument()
    })

    it('caps each group at twelve, shows the rest on request, and starts over on a new query', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { items: makeItems('Spell', 20) })
      render(<LibraryPage />)

      await user.type(searchBox(), 'spell')

      const spells = group('Spells (20)')
      expect(within(spells).getByText('Spell 12')).toBeInTheDocument()
      expect(within(spells).queryByText('Spell 13')).not.toBeInTheDocument()

      await user.click(within(spells).getByRole('button', { name: 'Show 8 more' }))

      expect(within(spells).getByText('Spell 20')).toBeInTheDocument()
      expect(within(spells).queryByRole('button', { name: /^Show/ })).not.toBeInTheDocument()

      // Narrowing the query is a new list: back to the first twelve.
      await user.type(searchBox(), ' 1')

      const narrowed = group('Spells (11)')
      expect(within(narrowed).getByText('Spell 1')).toBeInTheDocument()
      expect(within(narrowed).queryByRole('button', { name: /^Show/ })).not.toBeInTheDocument()
    })

    it('names the failed query when nothing matches', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(searchBox(), 'chromatic orb')

      expect(screen.getByText('Nothing matching “chromatic orb”.')).toBeInTheDocument()
    })

    it('says it is still loading rather than claiming a miss', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { isLoading: true })
      render(<LibraryPage />)

      await user.type(searchBox(), 'fire')

      expect(screen.getByText('Loading the reference lists…')).toBeInTheDocument()
      expect(screen.queryByText(/Nothing matching/)).not.toBeInTheDocument()
    })

    it('names a list that failed to load beside the hits from the others', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { error: new Error('down') })
      render(<LibraryPage />)

      await user.type(searchBox(), 'dragon')

      expect(
        screen.getByText('Could not load spells. Those are missing from these results.'),
      ).toBeInTheDocument()
      expect(group('Monsters (1)')).toBeInTheDocument()
    })

    it('opens the detail sheet from a result', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.type(searchBox(), 'gobl')
      await user.click(screen.getByRole('button', { name: 'Goblin' }))

      expect(screen.getByRole('dialog')).toHaveTextContent('detail for goblin')

      await user.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(searchBox()).toHaveValue('gobl')
    })
  })

  describe('browse', () => {
    it('opens a type’s whole list from its chip with an empty box, and closes it on a second tap', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.click(chip('Monsters'))

      expect(chip('Monsters')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Monsters (3)')).toBeInTheDocument()
      expect(screen.getByText('Dragon')).toBeInTheDocument()
      expect(screen.getByText('Goblin')).toBeInTheDocument()

      await user.click(chip('Classes'))

      expect(chip('Monsters')).toHaveAttribute('aria-pressed', 'false')
      // The twelve SRD 5.2.1 classes, read from the bundle.
      expect(screen.getByText('Classes (12)')).toBeInTheDocument()
      expect(screen.getByText('Wizard')).toBeInTheDocument()

      await user.click(chip('Classes'))

      expect(chip('Classes')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.queryByText('Wizard')).not.toBeInTheDocument()
    })

    it('opens the detail sheet from a card', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.click(chip('Monsters'))
      await user.click(screen.getByRole('button', { name: 'View details for Goblin' }))

      expect(screen.getByRole('dialog')).toHaveTextContent('detail for goblin')
    })

    it('caps the list, says so, and shows the rest on request', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { items: makeItems('Spell', 20) })
      render(<LibraryPage />)

      await user.click(chip('Spells'))

      expect(screen.getByText('Spells (20)')).toBeInTheDocument()
      expect(screen.getByText('Showing 12 of 20 spells.')).toBeInTheDocument()
      expect(screen.getByText('Spell 12')).toBeInTheDocument()
      expect(screen.queryByText('Spell 13')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Show 8 more' }))

      expect(screen.getByText('Spell 20')).toBeInTheDocument()
      expect(screen.getByText('Showing all 20 spells.')).toBeInTheDocument()
    })

    it('claims no count while the fetch is in flight', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { isLoading: true })
      render(<LibraryPage />)

      await user.click(chip('Spells'))

      expect(screen.getByText('Loading spells...')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="card-title"]')).toHaveTextContent(/^Spells$/)
      expect(screen.queryByText('Spells (0)')).not.toBeInTheDocument()
    })

    it('shows the failure rather than an empty list when the fetch failed', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { error: new Error('down') })
      render(<LibraryPage />)

      await user.click(chip('Spells'))

      expect(screen.getByText('Error loading spells')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="card-title"]')).toHaveTextContent(/^Spells$/)
    })

    it('distinguishes an empty list from a loading one', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { items: [] })
      render(<LibraryPage />)

      await user.click(chip('Spells'))

      expect(screen.getByText('No spells in the reference data.')).toBeInTheDocument()
      expect(screen.queryByText('Loading spells...')).not.toBeInTheDocument()
    })

    it('names a row the data left nameless rather than printing a blank card', async () => {
      const user = userEvent.setup()
      setList(mockSpells, { items: [{ index: 'nameless', name: '' }] })
      render(<LibraryPage />)

      await user.click(chip('Spells'))

      expect(screen.getByText('Unknown Spell')).toBeInTheDocument()
    })

    it('keeps the lit chip when a query is typed and then cleared', async () => {
      const user = userEvent.setup()
      render(<LibraryPage />)

      await user.click(chip('Monsters'))
      await user.type(searchBox(), 'gobl')

      expect(group('Monsters (2)')).toBeInTheDocument()
      expect(screen.queryByText('Monsters (3)')).not.toBeInTheDocument()

      await user.clear(searchBox())

      expect(screen.getByText('Monsters (3)')).toBeInTheDocument()
    })
  })
})
