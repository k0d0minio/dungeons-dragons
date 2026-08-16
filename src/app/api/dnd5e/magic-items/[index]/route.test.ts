import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock fetch
global.fetch = jest.fn()

// Mock NextRequest
const mockRequest = {
  url: 'http://localhost:3000/api/dnd5e/magic-items/bag-of-holding',
  method: 'GET',
  headers: new Map(),
  json: jest.fn(),
} as unknown as NextRequest

describe('/api/dnd5e/magic-items/[index]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return magic item data successfully', async () => {
    const mockMagicItemData = {
      index: 'bag-of-holding',
      name: 'Bag of Holding',
      equipment_category: { index: 'wondrous-items', name: 'Wondrous Items', url: '' },
      rarity: { name: 'Uncommon' },
      desc: ['Wondrous item, uncommon', 'This bag has an interior space...'],
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMagicItemData),
    })

    const request = mockRequest
    const response = await GET(request, { params: Promise.resolve({ index: 'bag-of-holding' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockMagicItemData)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.dnd5eapi.co/api/magic-items/bag-of-holding',
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
    const request = mockRequest
    const response = await GET(request, { params: Promise.resolve({ index: '' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Magic item index is required')
  })

  it.each([
    'magic-items/bag-of-holding',
    '../monsters/goblin',
    'Bag of Holding',
    'bag of holding',
    'bag-of-holding?x=1',
  ])('should return 400 without calling upstream for index %p', async (index) => {
    const request = mockRequest
    const response = await GET(request, { params: Promise.resolve({ index }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid magic item index')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully, without caching them', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    const request = mockRequest
    const response = await GET(request, { params: Promise.resolve({ index: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch magic item')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const request = mockRequest
    const response = await GET(request, { params: Promise.resolve({ index: 'bag-of-holding' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch magic item')
  })
})
