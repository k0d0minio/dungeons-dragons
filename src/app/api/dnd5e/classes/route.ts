// GET /api/dnd5e/classes - Get all classes
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/classes')
    return referenceJson(data)
  } catch {
    return referenceError('Failed to fetch classes', 500)
  }
}
