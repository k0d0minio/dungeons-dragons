import { GET } from './route'

// Mock fetch
global.fetch = jest.fn()

describe('/api/dnd5e/magic-items', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return magic items data successfully', async () => {
    const mockMagicItemsData = {
      count: 2,
      results: [
        { index: 'bag-of-holding', name: 'Bag of Holding', url: '/api/magic-items/bag-of-holding' },
        { index: 'holy-avenger', name: 'Holy Avenger', url: '/api/magic-items/holy-avenger' },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMagicItemsData),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockMagicItemsData)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.dnd5eapi.co/api/magic-items',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          'User-Agent': 'D&D-Companion-App/1.0',
        }),
        next: { revalidate: 86400 },
      }),
    )
  })

  it('should let the CDN serve repeat lookups', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0, results: [] }),
    })

    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=86400, stale-while-revalidate=604800',
    )
  })

  it('should handle API errors gracefully, without caching them', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch magic items')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch magic items')
  })
})
