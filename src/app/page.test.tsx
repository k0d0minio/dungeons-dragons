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
  searchSpells: (spells: unknown[], query: string) => spells,
  searchEquipment: (equipment: unknown[], query: string) => equipment,
  searchMonsters: (monsters: unknown[], query: string) => monsters
}))

describe('Home Page', () => {
  it('should render hero section', () => {
    render(<Home />)
    
    expect(screen.getByText('Dungeons & Dragons')).toBeInTheDocument()
    expect(screen.getByText('Your comprehensive D&D 5e companion. Explore spells, classes, races, equipment, and monsters with detailed information and powerful search capabilities.')).toBeInTheDocument()
  })

  it('should render search functionality', () => {
    render(<Home />)
    
    expect(screen.getByLabelText('Search D&D Content')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search spells, equipment, monsters...')).toBeInTheDocument()
  })

  it('should render stats cards', () => {
    render(<Home />)
    
    // Check for stats cards by looking for the specific text patterns
    expect(screen.getAllByText('Spells')).toHaveLength(2) // One in stats, one in tabs
    expect(screen.getAllByText('Classes')).toHaveLength(2) // One in stats, one in tabs
    expect(screen.getAllByText('Races')).toHaveLength(2) // One in stats, one in tabs
    expect(screen.getAllByText('Equipment')).toHaveLength(2) // One in stats, one in tabs
    expect(screen.getAllByText('Monsters')).toHaveLength(2) // One in stats, one in tabs
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
