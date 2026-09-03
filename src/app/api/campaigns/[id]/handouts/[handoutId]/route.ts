// One handout: edit either layer, or delete it
// (`dm-prep-suite/locations-handouts`).
//
// **Deleting takes the picture with it.** A handout is often a secret, and a
// secret whose row is gone but whose bytes are still in the store is still in
// the store. The row goes first and the object second — the reverse of an
// upload, and the same principle: whichever step fails, what is left behind is
// an orphaned object nobody references, never a row pointing at nothing.
//
// **`revealedAt` is not in `patchHandoutSchema`**, so this route cannot reveal
// a handout. Revealing has its own endpoint one segment along — `PUT
// …/handouts/[handoutId]/reveal` — because an edit and a reveal have different
// consequences and should not share a request shape.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteCampaignHandout, updateCampaignHandout } from '@/lib/db/handouts'
import { patchHandoutSchema } from '@/lib/handouts/schema'
import { deleteImage } from '@/lib/images/store'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; handoutId: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, handoutId } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = patchHandoutSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That change is not valid')
  }

  const handout = await updateCampaignHandout(user.id, id, handoutId, parsed.data)

  return handout ? NextResponse.json({ handout }) : notFound('handout')
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, handoutId } = await params
  const { deleted, image } = await deleteCampaignHandout(user.id, id, handoutId)

  if (!deleted) return notFound('handout')

  // Best effort, and deliberately after the row: `deleteImage` swallows its own
  // failures, because a few orphaned kilobytes must not turn a completed delete
  // into a 500 that tells the DM their handout is still there.
  if (image) await deleteImage(image)

  return NextResponse.json({ deleted: true })
}
