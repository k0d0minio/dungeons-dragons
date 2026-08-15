// GET /api/dnd5e/equipment - Get all equipment
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/equipment')
    return referenceJson(data)
  } catch {
    return referenceError('Failed to fetch equipment', 500)
  }
}
