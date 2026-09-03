// One NPC: edit either layer, or delete it (`dm-prep-suite/npc-roster`).
//
// Same authority model as its parent route — folded into the data layer's
// queries, so an NPC in someone else's campaign 404s like one that never
// existed.
//
// **`revealedAt` is not in `patchNpcSchema`, so this route cannot reveal an
// NPC.** Campaign content starts hidden and revealing is a deliberate act with
// an endpoint of its own — `PUT …/npcs/[npcId]/reveal`
// (`dm-run-suite/reveal-controls`) — so no request to *this* one, hand-rolled or
// otherwise, can stamp the column.
//
// **Deleting an NPC takes their portrait out of the store too**
// (`locations-handouts`). The row goes first and the object second — the
// reverse of an upload, and the same principle: whichever step fails, what is
// left is an object nobody references rather than a row pointing at nothing.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteCampaignNpc, updateCampaignNpc } from '@/lib/db/npcs'
import { deleteImage } from '@/lib/images/store'
import { patchNpcSchema } from '@/lib/npcs/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; npcId: string }> }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such NPC' }, { status: 404 })
}

function databaseUnconfigured() {
  return NextResponse.json(
    {
      error:
        'The database is not connected. If you run this app, see the database runbook in the repo docs.',
    },
    { status: 503 },
  )
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, npcId } = await params

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = patchNpcSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 },
    )
  }

  const npc = await updateCampaignNpc(user.id, id, npcId, parsed.data)

  return npc ? NextResponse.json({ npc }) : notFound()
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, npcId } = await params
  const { deleted, portrait } = await deleteCampaignNpc(user.id, id, npcId)

  if (!deleted) return notFound()

  // Best effort, and deliberately after the row: `deleteImage` swallows its own
  // failures, because a few orphaned kilobytes must not turn a completed delete
  // into a 500 that tells the DM the NPC is still there.
  if (portrait) await deleteImage(portrait)

  return NextResponse.json({ deleted: true })
}
