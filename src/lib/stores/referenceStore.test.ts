import { renderHook, act } from '@testing-library/react'
import { useReferenceStore } from '../stores/referenceStore'

// Mock the persist middleware
jest.mock('zustand/middleware', () => ({
  devtools: (fn) => fn,
  persist: (fn) => fn,
}))

describe('useReferenceStore', () => {
  beforeEach(() => {
    // Reset store state
    useReferenceStore.setState({
      spells: [],
      equipment: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
    })
  })

  it('should have initial state', () => {
    const { result } = renderHook(() => useReferenceStore())
    
    expect(result.current.spells).toEqual([])
    expect(result.current.equipment).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.lastUpdated).toBeNull()
  })

  it('should load spells', async () => {
    const { result } = renderHook(() => useReferenceStore())
    
    await act(async () => {
      await result.current.loadSpells()
    })

    expect(result.current.spells).toHaveLength(1)
    expect(result.current.spells[0].name).toBe('Fireball')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
  })

  it('should load equipment', async () => {
    const { result } = renderHook(() => useReferenceStore())
    
    await act(async () => {
      await result.current.loadEquipment()
    })

    expect(result.current.equipment).toHaveLength(1)
    expect(result.current.equipment[0].name).toBe('Longsword')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
  })

  it('should search spells', () => {
    const { result } = renderHook(() => useReferenceStore())
    
    // Set up mock spells
    const mockSpells = [
      {
        id: 'fireball',
        name: 'Fireball',
        level: 3,
        school: 'Evocation',
        castingTime: '1 action',
        range: '150 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'A bright streak flashes from your pointing finger.',
        classes: ['Wizard', 'Sorcerer'],
        ritual: false,
        concentration: false,
      },
      {
        id: 'heal',
        name: 'Heal',
        level: 6,
        school: 'Evocation',
        castingTime: '1 action',
        range: '60 feet',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'Choose a creature within range.',
        classes: ['Cleric', 'Druid'],
        ritual: false,
        concentration: false,
      },
    ]

    act(() => {
      useReferenceStore.setState({ spells: mockSpells })
    })

    const searchResults = result.current.searchSpells('fire')
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].name).toBe('Fireball')

    const schoolResults = result.current.searchSpells('evocation')
    expect(schoolResults).toHaveLength(2)
  })

  it('should search equipment', () => {
    const { result } = renderHook(() => useReferenceStore())
    
    // Set up mock equipment
    const mockEquipment = [
      {
        id: 'longsword',
        name: 'Longsword',
        type: 'Weapon',
        cost: '15 gp',
        weight: 3,
        description: 'A versatile melee weapon.',
        properties: ['Versatile'],
        damage: {
          dice: '1d8',
          type: 'slashing',
        },
      },
      {
        id: 'shield',
        name: 'Shield',
        type: 'Armor',
        cost: '10 gp',
        weight: 6,
        description: 'A defensive item.',
        armorClass: 2,
      },
    ]

    act(() => {
      useReferenceStore.setState({ equipment: mockEquipment })
    })

    const searchResults = result.current.searchEquipment('sword')
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].name).toBe('Longsword')

    const typeResults = result.current.searchEquipment('weapon')
    expect(typeResults).toHaveLength(1)
  })

  it('should get spell by id', () => {
    const { result } = renderHook(() => useReferenceStore())
    
    const mockSpells = [
      {
        id: 'fireball',
        name: 'Fireball',
        level: 3,
        school: 'Evocation',
        castingTime: '1 action',
        range: '150 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'A bright streak flashes from your pointing finger.',
        classes: ['Wizard', 'Sorcerer'],
        ritual: false,
        concentration: false,
      },
    ]

    act(() => {
      useReferenceStore.setState({ spells: mockSpells })
    })

    const spell = result.current.getSpellById('fireball')
    expect(spell).toEqual(mockSpells[0])

    const notFound = result.current.getSpellById('not-found')
    expect(notFound).toBeUndefined()
  })

  it('should get equipment by id', () => {
    const { result } = renderHook(() => useReferenceStore())
    
    const mockEquipment = [
      {
        id: 'longsword',
        name: 'Longsword',
        type: 'Weapon',
        cost: '15 gp',
        weight: 3,
        description: 'A versatile melee weapon.',
        properties: ['Versatile'],
        damage: {
          dice: '1d8',
          type: 'slashing',
        },
      },
    ]

    act(() => {
      useReferenceStore.setState({ equipment: mockEquipment })
    })

    const equipment = result.current.getEquipmentById('longsword')
    expect(equipment).toEqual(mockEquipment[0])

    const notFound = result.current.getEquipmentById('not-found')
    expect(notFound).toBeUndefined()
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useReferenceStore())
    
    // Set an error first
    act(() => {
      useReferenceStore.setState({ error: 'Test error' })
    })

    expect(result.current.error).toBe('Test error')

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })
})
