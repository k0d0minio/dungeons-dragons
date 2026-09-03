// One session plan: read it whole, edit either layer, or delete it
// (`dm-prep-suite/session-plans`).
//
// Same authority model as its parent route — folded into the data layer's
// queries, so a plan in someone else's campaign 404s like one that never
// existed.
//
// **`revealedAt` is not in `patchSessionPlanSchema`, so this route cannot
// announce a night.** Campaign content starts hidden and revealing is a
// deliberate act with a surface of its own (`dm-run-suite/reveal-controls`);
// until that ships there is no way — through the UI or by hand-rolling a
// request here — to stamp the column.
//
// GET returns the plan **with its scenes, its secrets and its links**, because
// that is the one screen they are read on and three round trips to paint it on
// a phone at a table is three chances to be halfway drawn when play starts.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteSessionPlan, getSessionPlan, updateSessionPlan } from '@/lib/db/session-plans'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'
import { patchSessionPlanSchema } from '@/lib/session-plans/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; planId: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId } = await params
  const detail = await getSessionPlan(user.id, id, planId)

  return detail ? NextResponse.json(detail) : notFound('session plan')
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = patchSessionPlanSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That change is not valid')
  }

  const plan = await updateSessionPlan(user.id, id, planId, parsed.data)

  return plan ? NextResponse.json({ plan }) : notFound('session plan')
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId } = await params
  const deleted = await deleteSessionPlan(user.id, id, planId)

  return deleted ? NextResponse.json({ deleted: true }) : notFound('session plan')
}
