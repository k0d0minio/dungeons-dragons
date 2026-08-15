// GET /api/dnd5e/classes/[index]/spells - Get spells for specific class
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
      return referenceError('Class index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid class index', 400)
    }

    const data = await fetchFromDndApi(`/classes/${index}/spells`)
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/classes/[index]/spells' })
    return referenceError('Failed to fetch class spells', 500)
  }
}
