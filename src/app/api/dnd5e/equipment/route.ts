// GET /api/dnd5e/equipment - Get all equipment
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/equipment')
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/equipment' })
    return referenceError('Failed to fetch equipment', 500)
  }
}
