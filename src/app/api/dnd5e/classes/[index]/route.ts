// GET /api/dnd5e/classes/[index] - Get specific class by index
import type { NextRequest } from 'next/server'
import { fetchFromDndApi, isValidIndex, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const { index } = await params

    if (!index) {
      return referenceError('Class index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid class index', 400)
    }

    const data = await fetchFromDndApi(`/classes/${index}`)
    return referenceJson(data)
  } catch (error) {
    console.error('Failed to fetch class:', error)
    return referenceError('Failed to fetch class', 500)
  }
}
