// GET /api/dnd5e/races/[index] - Get specific race by index
import type { NextRequest } from 'next/server'
import { fetchFromDndApi, isValidIndex, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> },
) {
  try {
    const { index } = await params

    if (!index) {
      return referenceError('Race index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid race index', 400)
    }

    const data = await fetchFromDndApi(`/races/${index}`)
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/races/[index]' })
    return referenceError('Failed to fetch race', 500)
  }
}
