// Show this place to the party, or take it back
// (`dm-run-suite/reveal-controls`).
//
// The NPC reveal route's twin; `src/lib/prep/reveal.ts` holds the shape and the
// reasoning both share.
import { setLocationRevealed } from '@/lib/db/locations'
import { handleReveal } from '@/lib/prep/reveal'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; locationId: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const { id, locationId } = await params

  return handleReveal(request, 'location', 'location', (userId, revealed) =>
    setLocationRevealed(userId, id, locationId, revealed),
  )
}
