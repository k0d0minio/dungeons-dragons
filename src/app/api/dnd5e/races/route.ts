// GET /api/dnd5e/races - Get all races
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/races')
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/races' })
    return referenceError('Failed to fetch races', 500)
  }
}
