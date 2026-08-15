// GET /api/dnd5e/classes - Get all classes
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/classes')
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/classes' })
    return referenceError('Failed to fetch classes', 500)
  }
}
