// One checkable line: reword it, tick it, untick it, or throw it away
// (`dm-prep-suite/session-plans`).
//
// **This is the route that runs during play.** Ticking a secret off is one tap
// on a phone, so it is its own tiny PATCH — `{ checked: true }`, one row, no
// form around it — and never a save of the whole plan. Nothing here touches
// `revealed_at`: a tick is the DM's own bookkeeping and tells the party
// nothing, which is why `checkStamp` in the data layer is a separate function
// from `revealStamp` rather than a second caller of it.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteSessionPlanItem, updateSessionPlanItem } from '@/lib/db/session-plans'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'
import { patchSessionPlanItemSchema } from '@/lib/session-plans/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; planId: string; itemId: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId, itemId } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = patchSessionPlanItemSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That change is not valid')
  }

  const item = await updateSessionPlanItem(user.id, id, planId, itemId, parsed.data)

  return item ? NextResponse.json({ item }) : notFound('line')
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId, itemId } = await params
  const deleted = await deleteSessionPlanItem(user.id, id, planId, itemId)

  return deleted ? NextResponse.json({ deleted: true }) : notFound('line')
}
