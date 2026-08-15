// GET /api/dnd5e/classes/[index]/levels - The class's level-by-level table
//
// `docs/rules/06-spellcasting.md` and `docs/rules/04-classes.md` have cited this
// endpoint since they were written; until DND-032 nothing had needed it, so it
// was never proxied. Level-up needs it: the features a class gains at a given
// level are the one part of levelling up that is not derivable from the static
// tables in `src/lib/characters/rules.ts`.
//
// Cached like every other reference handler — the shared window and headers come
// from `src/lib/dnd-api/proxy.ts` (DND-020), so this route cannot drift from the
// eleven that came before it. Errors go to the same sink they do, via
// `captureError` (DND-025).
import type { NextRequest } from 'next/server'
import { fetchFromDndApi, isValidIndex, referenceError, referenceJson } from '@/lib/dnd-api/proxy'
import { captureError } from '@/lib/observability/sentry'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const { index } = await params

    if (!index) {
      return referenceError('Class index is required', 400)
    }

    if (!isValidIndex(index)) {
      return referenceError('Invalid class index', 400)
    }

    const data = await fetchFromDndApi(`/classes/${index}/levels`)
    return referenceJson(data)
  } catch (error) {
    captureError(error, { route: '/api/dnd5e/classes/[index]/levels' })
    return referenceError('Failed to fetch class levels', 500)
  }
}
