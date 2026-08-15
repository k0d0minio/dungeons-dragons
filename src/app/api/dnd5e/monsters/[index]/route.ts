// GET /api/dnd5e/monsters/[index] - Get specific monster by index
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
      return referenceError('Monster index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid monster index', 400)
    }

    const data = await fetchFromDndApi(`/monsters/${index}`)
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/monsters/[index]' })
    return referenceError('Failed to fetch monster', 500)
  }
}
