// One location: edit either layer, or delete it
// (`dm-prep-suite/locations-handouts`).
//
// Same authority model as its parent route — folded into the data layer's
// queries, so a location in someone else's campaign 404s like one that never
// existed.
//
// **`revealedAt` is not in `patchLocationSchema`, so this route cannot reveal a
// place.** Campaign content starts hidden and revealing is a deliberate act
// with a surface of its own (`dm-run-suite/reveal-controls`); until that ships
// there is no way — through the UI or by hand-rolling a request here — to stamp
// the column.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteCampaignLocation, updateCampaignLocation } from '@/lib/db/locations'
import { patchLocationSchema } from '@/lib/locations/schema'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; locationId: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, locationId } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = patchLocationSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That change is not valid')
  }

  const location = await updateCampaignLocation(user.id, id, locationId, parsed.data)

  return location ? NextResponse.json({ location }) : notFound('place')
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, locationId } = await params
  const deleted = await deleteCampaignLocation(user.id, id, locationId)

  return deleted ? NextResponse.json({ deleted: true }) : notFound('place')
}
