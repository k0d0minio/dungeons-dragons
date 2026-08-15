import { render, screen } from '@testing-library/react'
import Home from '../app/page'

// Mock SWR hooks
jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useSpells: () => ({ 
    spells: [{ index: 'fireball', name: 'Fireball' }], 
    isLoading: false, 
    error: null 
  }),
  useClasses: () => ({ 
    classes: [{ index: 'wizard', name: 'Wizard' }], 
    isLoading: false, 
    error: null 
  }),
  useRaces: () => ({ 
    races: [{ index: 'human', name: 'Human' }], 
    isLoading: false, 
    error: null 
  }),
  useEquipment: () => ({ 
    equipment: [{ index: 'sword', name: 'Sword' }], 
    isLoading: false, 
    error: null 
  }),
  useMonsters: () => ({ 
    monsters: [{ index: 'dragon', name: 'Dragon' }], 
    isLoading: false, 
    error: null 
  }),
  searchSpells: () => [],
  searchEquipment: () => [],
  searchMonsters: () => []
}))

describe('Home Page', () => {
  // DND-022: the page opens on the search box. The heading is still in the
  // document for structure, but it is not what the eye lands on.
  it('should keep the page heading off-screen', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only')
  })

  it('should render search functionality', () => {
    render(<Home />)

    expect(screen.getByLabelText('Search D&D Content')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search spells, equipment, monsters...')).toBeInTheDocument()
  })

  it('should put search ahead of the category tabs', () => {
    render(<Home />)

    const search = screen.getByLabelText('Search D&D Content')
    const firstTab = screen.getByRole('tab', { name: 'Spells' })

    // Nothing sits between the site header and the search input, so the tabs
    // — and everything else on the page — follow it in document order.
    expect(
      search.compareDocumentPosition(firstTab) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('should no longer render the hero or the stat-card row', () => {
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

  it('should render tabs navigation', () => {
    render(<Home />)
    
    // Check for tab buttons specifically
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
})
