import { renderHook } from '@testing-library/react'
import { useSpells, useSpell, useClasses, useClass, useRaces, useRace } from '@/lib/dnd-api/swr-hooks'

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockUseSWR = jest.mocked(require('swr').default)

describe('D&D 5e API SWR Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useSpells', () => {
    it('should return spells data when successful', async () => {
      const mockData = {
        count: 2,
        results: [
          { index: 'fireball', name: 'Fireball', url: '/api/spells/fireball' },
          { index: 'magic-missile', name: 'Magic Missile', url: '/api/spells/magic-missile' }
        ]
      }

      mockUseSWR.mockReturnValue({
        data: mockData,
        error: null,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useSpells())

      expect(result.current.spells).toEqual(mockData.results)
      expect(result.current.count).toBe(2)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle loading state', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useSpells())

      expect(result.current.spells).toEqual([])
      expect(result.current.isLoading).toBe(true)
    })

    it('should handle error state', () => {
      const mockError = new Error('Failed to fetch spells')
      
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useSpells())

      expect(result.current.error).toBe(mockError)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useSpell', () => {
    it('should return spell data when index is provided', () => {
      const mockSpell = {
        index: 'fireball',
        name: 'Fireball',
        level: 3,
        school: { index: 'evocation', name: 'Evocation', url: '/api/magic-schools/evocation' },
        desc: ['A bright streak flashes from your pointing finger...']
      }

      mockUseSWR.mockReturnValue({
        data: mockSpell,
        error: null,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useSpell('fireball'))

      expect(result.current.spell).toEqual(mockSpell)
      expect(result.current.isLoading).toBe(false)
    })

    it('should not fetch when index is null', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useSpell(null))

      expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object))
      expect(result.current.spell).toBeUndefined()
    })
  })

  describe('useClasses', () => {
    it('should return classes data when successful', () => {
      const mockData = {
        count: 2,
        results: [
          { index: 'wizard', name: 'Wizard', url: '/api/classes/wizard' },
          { index: 'fighter', name: 'Fighter', url: '/api/classes/fighter' }
        ]
      }

      mockUseSWR.mockReturnValue({
        data: mockData,
        error: null,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useClasses())

      expect(result.current.classes).toEqual(mockData.results)
      expect(result.current.count).toBe(2)
    })
  })

  describe('useClass', () => {
    it('should return class data when index is provided', () => {
      const mockClass = {
        index: 'wizard',
        name: 'Wizard',
        hit_die: 6,
        proficiencies: [
          { index: 'daggers', name: 'Daggers', url: '/api/proficiencies/daggers' }
        ]
      }

      mockUseSWR.mockReturnValue({
        data: mockClass,
        error: null,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useClass('wizard'))

      expect(result.current.class).toEqual(mockClass)
    })
  })

  describe('useRaces', () => {
    it('should return races data when successful', () => {
      const mockData = {
        count: 2,
        results: [
          { index: 'human', name: 'Human', url: '/api/races/human' },
          { index: 'elf', name: 'Elf', url: '/api/races/elf' }
        ]
      }

      mockUseSWR.mockReturnValue({
        data: mockData,
        error: null,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useRaces())

      expect(result.current.races).toEqual(mockData.results)
      expect(result.current.count).toBe(2)
    })
  })

  describe('useRace', () => {
    it('should return race data when index is provided', () => {
      const mockRace = {
        index: 'human',
        name: 'Human',
        speed: 30,
        ability_bonuses: [
          { ability_score: { index: 'str', name: 'Strength', url: '/api/ability-scores/str' }, bonus: 1 }
        ]
      }

      mockUseSWR.mockReturnValue({
        data: mockRace,
        error: null,
        isLoading: false,
        mutate: jest.fn()
      })

      const { result } = renderHook(() => useRace('human'))

      expect(result.current.race).toEqual(mockRace)
    })
  })
})
