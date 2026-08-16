// GET /api/dnd5e/equipment-categories/[index] - Get an equipment category
// (e.g. 'weapon', 'armor') with its item list.
//
// Built for DND-035: `useWeapons()` / `useArmor()` in
// `src/lib/dnd-api/swr-hooks.ts` have pointed here since DND-008 and 404'd
// until now. Same caching + validation pattern as every other proxy handler
// (DND-020).
import type { NextRequest } from 'next/server'
import { fetchFromDndApi, isValidIndex, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> },
) {
  try {
    const { index } = await params

    if (!index) {
      return referenceError('Equipment category index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid equipment category index', 400)
    }

    const data = await fetchFromDndApi(`/equipment-categories/${index}`)
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/equipment-categories/[index]' })
    return referenceError('Failed to fetch equipment category', 500)
  }
}
