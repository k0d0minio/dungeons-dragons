// GET /api/dnd5e/monsters - Get all monsters
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/monsters')
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/monsters' })
    return referenceError('Failed to fetch monsters', 500)
  }
}
