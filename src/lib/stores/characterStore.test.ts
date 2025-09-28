import { renderHook, act } from '@testing-library/react'
import { useCharacterStore } from '../stores/characterStore'

// Mock the persist middleware
jest.mock('zustand/middleware', () => ({
  devtools: (fn) => fn,
  persist: (fn) => fn,
}))

describe('useCharacterStore', () => {
  beforeEach(() => {
    // Reset store state
    useCharacterStore.setState({
      characters: [],
      activeCharacter: null,
      isLoading: false,
      error: null,
    })
  })

  it('should have initial state', () => {
    const { result } = renderHook(() => useCharacterStore())
    
    expect(result.current.characters).toEqual([])
    expect(result.current.activeCharacter).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should add a character', () => {
    const { result } = renderHook(() => useCharacterStore())
    
    const newCharacter = {
      name: 'Test Character',
      class: 'Fighter',
      level: 1,
      race: 'Human',
      stats: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 11,
        charisma: 10,
      },
      hitPoints: {
        current: 10,
        maximum: 10,
        temporary: 0,
      },
      armorClass: 16,
      speed: 30,
      spells: [],
      equipment: [],
    }

    act(() => {
      result.current.addCharacter(newCharacter)
    })

    expect(result.current.characters).toHaveLength(1)
    expect(result.current.characters[0].name).toBe('Test Character')
    expect(result.current.activeCharacter).toEqual(result.current.characters[0])
  })

  it('should update a character', () => {
    const { result } = renderHook(() => useCharacterStore())
    
    // Add a character first
    const newCharacter = {
      name: 'Test Character',
      class: 'Fighter',
      level: 1,
      race: 'Human',
      stats: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 11,
        charisma: 10,
      },
      hitPoints: {
        current: 10,
        maximum: 10,
        temporary: 0,
      },
      armorClass: 16,
      speed: 30,
      spells: [],
      equipment: [],
    }

    act(() => {
      result.current.addCharacter(newCharacter)
    })

    const characterId = result.current.characters[0].id

    act(() => {
      result.current.updateCharacter(characterId, { level: 2 })
    })

    expect(result.current.characters[0].level).toBe(2)
    expect(result.current.activeCharacter?.level).toBe(2)
  })

  it('should delete a character', () => {
    const { result } = renderHook(() => useCharacterStore())
    
    // Add a character first
    const newCharacter = {
      name: 'Test Character',
      class: 'Fighter',
      level: 1,
      race: 'Human',
      stats: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 11,
        charisma: 10,
      },
      hitPoints: {
        current: 10,
        maximum: 10,
        temporary: 0,
      },
      armorClass: 16,
      speed: 30,
      spells: [],
      equipment: [],
    }

    act(() => {
      result.current.addCharacter(newCharacter)
    })

    const characterId = result.current.characters[0].id

    act(() => {
      result.current.deleteCharacter(characterId)
    })

    expect(result.current.characters).toHaveLength(0)
    expect(result.current.activeCharacter).toBeNull()
  })

  it('should set active character', () => {
    const { result } = renderHook(() => useCharacterStore())
    
    const character = {
      id: 'test-id',
      name: 'Test Character',
      class: 'Fighter',
      level: 1,
      race: 'Human',
      stats: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 11,
        charisma: 10,
      },
      hitPoints: {
        current: 10,
        maximum: 10,
        temporary: 0,
      },
      armorClass: 16,
      speed: 30,
      spells: [],
      equipment: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    act(() => {
      result.current.setActiveCharacter(character)
    })

    expect(result.current.activeCharacter).toEqual(character)
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useCharacterStore())
    
    // Set an error first
    act(() => {
      useCharacterStore.setState({ error: 'Test error' })
    })

    expect(result.current.error).toBe('Test error')

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })
})
