// An NPC's portrait: serve it, replace it, remove it
// (`dm-prep-suite/locations-handouts`).
//
// The slot `npc-roster` deferred, wired to the storage this ticket chose. It is
// the same three verbs as a handout's image against a different column, which
// is exactly why the verbs live in `src/lib/images/slot.ts` and this file is
// the session check and two closures.
//
// A portrait is **public layer** — it is the face the party sees when the NPC
// is revealed — but nothing player-facing exists yet, so like every other prep
// route here it answers only to the DM who runs the campaign, and 404s for
// everyone else.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadNpcPortrait, setNpcPortrait, type NpcForDm } from '@/lib/db/npcs'
import { attachSlotImage, clearSlotImage, serveSlotImage, type ImageSlot } from '@/lib/images/slot'
import { databaseUnconfigured, unauthorized } from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; npcId: string }> }

function portraitSlot(dmUserId: string, campaignId: string, npcId: string) {
  return {
    noun: 'NPC',
    campaignId,
    key: `npcs/${npcId}`,
    load: () => loadNpcPortrait(dmUserId, campaignId, npcId),
    set: (image) => setNpcPortrait(dmUserId, campaignId, npcId, image),
  } satisfies ImageSlot<NpcForDm>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, npcId } = await params

  return serveSlotImage(portraitSlot(user.id, id, npcId))
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, npcId } = await params
  const result = await attachSlotImage(request, portraitSlot(user.id, id, npcId))

  if ('response' in result) return result.response

  return NextResponse.json({ npc: result.entity })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, npcId } = await params
  const result = await clearSlotImage(portraitSlot(user.id, id, npcId))

  if ('response' in result) return result.response

  return NextResponse.json({ npc: result.entity })
}
