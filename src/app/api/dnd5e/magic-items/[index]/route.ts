// GET /api/dnd5e/magic-items/[index] - Get specific magic item by index
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
      return referenceError('Magic item index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid magic item index', 400)
    }

    const data = await fetchFromDndApi(`/magic-items/${index}`)
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/magic-items/[index]' })
    return referenceError('Failed to fetch magic item', 500)
  }
}
