// Show this NPC to the party, or take it back (`dm-run-suite/reveal-controls`).
//
// Its own route rather than a field on the NPC's PATCH — see
// `src/lib/prep/reveal.ts` for why, and for everything this file does not
// repeat. `PUT` because the body names the state the DM wants rather than an
// increment: two taps that both mean "revealed" leave one timestamp.
import { setNpcRevealed } from '@/lib/db/npcs'
import { handleReveal } from '@/lib/prep/reveal'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; npcId: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const { id, npcId } = await params

  return handleReveal(request, 'NPC', 'npc', (userId, revealed) =>
    setNpcRevealed(userId, id, npcId, revealed),
  )
}
