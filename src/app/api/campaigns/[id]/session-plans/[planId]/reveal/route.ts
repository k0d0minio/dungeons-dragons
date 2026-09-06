// Announce this night to the party, or take it back
// (`first-table/announce-the-night`).
//
// The plan's reveal switch, on the same route shape every other revealable
// uses — see `src/lib/prep/reveal.ts` for why a reveal is its own endpoint and
// not a field on the plan's PATCH. What crosses is the title and the date:
// `listAnnouncedPlans` selects `sessionPlanPublicColumns` and nothing else, so
// the strong start, the scenes and the secrets stay behind the screen whether
// or not the night is announced.
import { setSessionPlanRevealed } from '@/lib/db/session-plans'
import { handleReveal } from '@/lib/prep/reveal'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; planId: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const { id, planId } = await params

  return handleReveal(request, 'session plan', 'plan', (userId, revealed) =>
    setSessionPlanRevealed(userId, id, planId, revealed),
  )
}
