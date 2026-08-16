// GET /api/dnd5e/magic-items - Get all magic items
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/magic-items')
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/magic-items' })
    return referenceError('Failed to fetch magic items', 500)
  }
}
