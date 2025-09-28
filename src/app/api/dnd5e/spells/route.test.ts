import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock fetch
global.fetch = jest.fn()

// Mock NextRequest
const mockRequest = {
  url: 'http://localhost:3000/api/dnd5e/spells',
  method: 'GET',
  headers: new Map(),
  json: jest.fn()
} as unknown as NextRequest

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

    const request = mockRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSpellsData)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.dnd5eapi.co/api/spells',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json',
          'User-Agent': 'D&D-Companion-App/1.0'
        })
      })
    )
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    const request = mockRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch spells')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const request = mockRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch spells')
  })
})
