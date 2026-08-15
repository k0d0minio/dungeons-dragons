// GET /api/dnd5e/equipment/[index] - Get specific equipment by index
import type { NextRequest } from 'next/server'
import { fetchFromDndApi, isValidIndex, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const { index } = await params

    if (!index) {
      return referenceError('Equipment index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid equipment index', 400)
    }

    const data = await fetchFromDndApi(`/equipment/${index}`)
    return referenceJson(data)
  } catch (error) {
    console.error('Failed to fetch equipment:', error)
    return referenceError('Failed to fetch equipment', 500)
  }
}
