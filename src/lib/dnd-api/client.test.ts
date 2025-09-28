import { dndApiClient, DndApiError, handleDndApiError } from '../dnd-api/client'

// Mock fetch
global.fetch = jest.fn()

describe('D&D API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    dndApiClient.clearCache()
  })

  describe('dndApiClient', () => {
    it('should fetch spells successfully', async () => {
      const mockResponse = {
        count: 1,
        results: [
          {
            index: 'fireball',
            name: 'Fireball',
            url: '/api/spells/fireball',
          },
        ],
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await dndApiClient.getSpells()

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith('https://www.dnd5eapi.co/api/spells')
    })

    it('should fetch spell by index', async () => {
      const mockSpell = {
        index: 'fireball',
        name: 'Fireball',
        level: 3,
        school: 'Evocation',
        desc: ['A bright streak flashes from your pointing finger.'],
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSpell),
      })

      const result = await dndApiClient.getSpellByIndex('fireball')

      expect(result).toEqual(mockSpell)
      expect(fetch).toHaveBeenCalledWith('https://www.dnd5eapi.co/api/spells/fireball')
    })

    it('should fetch equipment successfully', async () => {
      const mockResponse = {
        count: 1,
        results: [
          {
            index: 'longsword',
            name: 'Longsword',
            url: '/api/equipment/longsword',
          },
        ],
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await dndApiClient.getEquipment()

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith('https://www.dnd5eapi.co/api/equipment')
    })

    it('should fetch equipment by index', async () => {
      const mockEquipment = {
        index: 'longsword',
        name: 'Longsword',
        equipment_category: {
          index: 'weapon',
          name: 'Weapon',
          url: '/api/equipment-categories/weapon',
        },
        cost: {
          quantity: 15,
          unit: 'gp',
        },
        weight: 3,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEquipment),
      })

      const result = await dndApiClient.getEquipmentByIndex('longsword')

      expect(result).toEqual(mockEquipment)
      expect(fetch).toHaveBeenCalledWith('https://www.dnd5eapi.co/api/equipment/longsword')
    })

    it('should handle fetch errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(dndApiClient.getSpells()).rejects.toThrow('Network error')
    })

    it('should handle HTTP errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(dndApiClient.getSpells()).rejects.toThrow('HTTP error! status: 404')
    })

    it('should cache responses', async () => {
      const mockResponse = {
        count: 1,
        results: [
          {
            index: 'fireball',
            name: 'Fireball',
            url: '/api/spells/fireball',
          },
        ],
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      // First call
      await dndApiClient.getSpells()
      expect(fetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await dndApiClient.getSpells()
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should clear cache', () => {
      const stats = dndApiClient.getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.keys).toEqual([])
    })
  })

  describe('DndApiError', () => {
    it('should create error with message', () => {
      const error = new DndApiError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('DndApiError')
      expect(error.status).toBeUndefined()
      expect(error.url).toBeUndefined()
    })

    it('should create error with status and url', () => {
      const error = new DndApiError('Not found', 404, '/api/spells/invalid')
      expect(error.message).toBe('Not found')
      expect(error.status).toBe(404)
      expect(error.url).toBe('/api/spells/invalid')
    })
  })

  describe('handleDndApiError', () => {
    it('should return DndApiError as is', () => {
      const originalError = new DndApiError('Original error')
      const handledError = handleDndApiError(originalError)
      expect(handledError).toBe(originalError)
    })

    it('should convert Error to DndApiError', () => {
      const originalError = new Error('Test error')
      const handledError = handleDndApiError(originalError)
      expect(handledError).toBeInstanceOf(DndApiError)
      expect(handledError.message).toBe('Test error')
    })

    it('should handle unknown errors', () => {
      const handledError = handleDndApiError('unknown error')
      expect(handledError).toBeInstanceOf(DndApiError)
      expect(handledError.message).toBe('Unknown error occurred')
    })
  })
})
