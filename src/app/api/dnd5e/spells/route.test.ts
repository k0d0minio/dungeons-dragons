import { GET } from './route'

// Mock fetch
global.fetch = jest.fn()

describe('/api/dnd5e/spells', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return spells data successfully', async () => {
    const mockSpellsData = {
      count: 2,
      results: [
        { index: 'fireball', name: 'Fireball', url: '/api/spells/fireball' },
        { index: 'magic-missile', name: 'Magic Missile', url: '/api/spells/magic-missile' }
      ]
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSpellsData)
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSpellsData)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.dnd5eapi.co/api/spells',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json',
          'User-Agent': 'D&D-Companion-App/1.0'
        }),
        next: { revalidate: 86400 }
      })
    )
  })

  it('should let the CDN serve repeat lookups', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0, results: [] })
    })

    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=86400, stale-while-revalidate=604800'
    )
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch spells')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch spells')
  })
})
