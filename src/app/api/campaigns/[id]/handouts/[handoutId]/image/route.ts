// A handout's picture: serve it, replace it, remove it
// (`dm-prep-suite/locations-handouts`).
//
// **This route is why the blob is private.** An unrevealed handout is a secret,
// and the store holds no address anyone could fetch — the only way to the bytes
// is this handler, which asks who is signed in and then asks the database
// whether they run the campaign the handout belongs to. A handout in someone
// else's campaign 404s exactly like one that never existed.
//
// Everything that carries a safety property — the ordering, the size and type
// rails, the response headers — is in `src/lib/images/`; what is here is the
// session check and the two functions that name this entity's column.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadHandoutImage, setHandoutImage, type HandoutForDm } from '@/lib/db/handouts'
import { attachSlotImage, clearSlotImage, serveSlotImage, type ImageSlot } from '@/lib/images/slot'
import { databaseUnconfigured, unauthorized } from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; handoutId: string }> }

function handoutSlot(dmUserId: string, campaignId: string, handoutId: string) {
  return {
    noun: 'handout',
    campaignId,
    key: `handouts/${handoutId}`,
    load: () => loadHandoutImage(dmUserId, campaignId, handoutId),
    set: (image) => setHandoutImage(dmUserId, campaignId, handoutId, image),
  } satisfies ImageSlot<HandoutForDm>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, handoutId } = await params

  return serveSlotImage(handoutSlot(user.id, id, handoutId))
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, handoutId } = await params
  const result = await attachSlotImage(request, handoutSlot(user.id, id, handoutId))

  if ('response' in result) return result.response

  return NextResponse.json({ handout: result.entity })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, handoutId } = await params
  const result = await clearSlotImage(handoutSlot(user.id, id, handoutId))

  if ('response' in result) return result.response

  return NextResponse.json({ handout: result.entity })
}
