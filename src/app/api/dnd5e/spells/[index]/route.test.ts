import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock fetch
global.fetch = jest.fn()

// Mock NextRequest
const mockRequest = {
  url: 'http://localhost:3000/api/dnd5e/spells/fireball',
  method: 'GET',
  headers: new Map(),
  json: jest.fn()
} as unknown as NextRequest

describe('/api/dnd5e/spells/[index]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return spell data successfully', async () => {
    const mockSpellData = {
      index: 'fireball',
      name: 'Fireball',
      level: 3,
      school: { index: 'evocation', name: 'Evocation', url: '/api/magic-schools/evocation' },
      desc: ['A bright streak flashes from your pointing finger...']
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSpellData)
    })

    const request = mockRequest
    const response = await GET(request, { params: { index: 'fireball' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSpellData)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.dnd5eapi.co/api/spells/fireball',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json',
          'User-Agent': 'D&D-Companion-App/1.0'
        })
      })
    )
  })

  it('should return 400 when index is missing', async () => {
    const request = mockRequest
    const response = await GET(request, { params: { index: '' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Spell index is required')
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    const request = mockRequest
    const response = await GET(request, { params: { index: 'nonexistent' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch spell')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const request = mockRequest
    const response = await GET(request, { params: { index: 'fireball' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch spell')
  })
})
