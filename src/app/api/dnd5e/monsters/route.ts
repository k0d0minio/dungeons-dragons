// GET /api/dnd5e/monsters - Get all monsters
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/monsters')
    return referenceJson(data)
  } catch {
    return referenceError('Failed to fetch monsters', 500)
  }
}
