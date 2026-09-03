// Hand this out to the party, or take it back
// (`dm-run-suite/reveal-controls`).
//
// The one reveal with a second consequence: `revealed_at` is also what the
// player-facing image route asks about before it serves a handout's bytes, so
// this route publishes the picture and un-revealing withdraws it — the file
// itself goes back behind the check, not merely off a list.
import { setHandoutRevealed } from '@/lib/db/handouts'
import { handleReveal } from '@/lib/prep/reveal'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; handoutId: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const { id, handoutId } = await params

  return handleReveal(request, 'handout', 'handout', (userId, revealed) =>
    setHandoutRevealed(userId, id, handoutId, revealed),
  )
}
