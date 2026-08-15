// GET /api/dnd5e/spells/[index] - Get specific spell by index
import type { NextRequest } from 'next/server'
import { fetchFromDndApi, isValidIndex, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const { index } = await params

    if (!index) {
      return referenceError('Spell index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid spell index', 400)
    }

    const data = await fetchFromDndApi(`/spells/${index}`)
    return referenceJson(data)
  } catch (error) {
    console.error('Failed to fetch spell:', error)
    return referenceError('Failed to fetch spell', 500)
  }
}
