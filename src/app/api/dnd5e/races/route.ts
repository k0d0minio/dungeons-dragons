// GET /api/dnd5e/races - Get all races
import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

export async function GET() {
  try {
    const data = await fetchFromDndApi('/races')
    return referenceJson(data)
  } catch {
    return referenceError('Failed to fetch races', 500)
  }
}
