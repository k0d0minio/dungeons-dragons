import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock fetch
global.fetch = jest.fn()

const mockRequest = {
  url: 'http://localhost:3000/api/dnd5e/equipment-categories/weapon',
  method: 'GET',
  headers: new Map(),
  json: jest.fn(),
} as unknown as NextRequest

describe('/api/dnd5e/equipment-categories/[index]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return an equipment category successfully', async () => {
    // The category shape `useWeapons()` / `useArmor()` consume: an equipment
    // list under the category's name.
    const mockCategory = {
      index: 'weapon',
      name: 'Weapon',
      equipment: [
        { index: 'longsword', name: 'Longsword', url: '/api/equipment/longsword' },
        { index: 'dagger', name: 'Dagger', url: '/api/equipment/dagger' },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategory),
    })

    const response = await GET(mockRequest, { params: Promise.resolve({ index: 'weapon' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCategory)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.dnd5eapi.co/api/equipment-categories/weapon',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          'User-Agent': 'D&D-Companion-App/1.0',
        }),
        next: { revalidate: 86400 },
      }),
    )
    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=86400, stale-while-revalidate=604800',
    )
  })

  it('should return 400 when index is missing', async () => {
    const response = await GET(mockRequest, { params: Promise.resolve({ index: '' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Equipment category index is required')
  })

  it.each(['equipment-categories/weapon', '../spells/fireball', 'Weapon', 'wea pon', 'weapon?x=1'])(
    'should return 400 without calling upstream for index %p',
    async (index) => {
      const response = await GET(mockRequest, { params: Promise.resolve({ index }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid equipment category index')
      expect(global.fetch).not.toHaveBeenCalled()
    },
  )

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    const response = await GET(mockRequest, { params: Promise.resolve({ index: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch equipment category')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const response = await GET(mockRequest, { params: Promise.resolve({ index: 'weapon' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch equipment category')
  })
})
