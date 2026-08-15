import {
  REFERENCE_CACHE_CONTROL,
  REFERENCE_REVALIDATE_SECONDS,
  fetchFromDndApi,
  isValidIndex,
  referenceError,
  referenceJson,
} from './proxy'

// Mock fetch
global.fetch = jest.fn()

describe('dnd-api proxy helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isValidIndex', () => {
    it('accepts lowercase slugs', () => {
      expect(isValidIndex('fireball')).toBe(true)
      expect(isValidIndex('adult-red-dragon')).toBe(true)
      expect(isValidIndex('shield-2')).toBe(true)
    })

    it('rejects anything that could reach another upstream path', () => {
      expect(isValidIndex('')).toBe(false)
      expect(isValidIndex('spells/fireball')).toBe(false)
      expect(isValidIndex('../monsters/goblin')).toBe(false)
      expect(isValidIndex('Fireball')).toBe(false)
      expect(isValidIndex('fire ball')).toBe(false)
      expect(isValidIndex('fireball?cachebust=1')).toBe(false)
      expect(isValidIndex('fireball%2Fx')).toBe(false)
    })
  })

  describe('fetchFromDndApi', () => {
    it('caches the upstream request for a day', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ index: 'fireball' }),
      })

      await fetchFromDndApi('/spells/fireball')

      expect(REFERENCE_REVALIDATE_SECONDS).toBe(86400)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.dnd5eapi.co/api/spells/fireball',
        expect.objectContaining({
          next: { revalidate: REFERENCE_REVALIDATE_SECONDS },
        }),
      )
    })

    it('throws when the upstream responds with an error status', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })

      await expect(fetchFromDndApi('/spells')).rejects.toThrow('D&D API error: 503')
    })
  })

  describe('responses', () => {
    it('marks reference data as CDN-cacheable', async () => {
      const response = referenceJson({ index: 'fireball' })

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe(REFERENCE_CACHE_CONTROL)
      expect(REFERENCE_CACHE_CONTROL).toContain('s-maxage=86400')
      expect(await response.json()).toEqual({ index: 'fireball' })
    })

    it('never caches errors', async () => {
      const response = referenceError('Failed to fetch spell', 500)

      expect(response.status).toBe(500)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(await response.json()).toEqual({ error: 'Failed to fetch spell' })
    })
  })
})
