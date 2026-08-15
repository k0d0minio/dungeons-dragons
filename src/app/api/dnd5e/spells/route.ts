// API Routes for D&D 5e Content
// These routes mirror the actual D&D 5e API structure and handle URL parameters

import { fetchFromDndApi, referenceError, referenceJson } from '@/lib/dnd-api/proxy'

// ============================================================================
// SPELLS API ROUTES
// ============================================================================

// GET /api/dnd5e/spells - Get all spells
export async function GET() {
  try {
    const data = await fetchFromDndApi('/spells')
    return referenceJson(data)
  } catch {
    return referenceError('Failed to fetch spells', 500)
  }
}
