// A plan's checkable lines, as a collection: add one, or put a whole list back
// in order (`dm-prep-suite/session-plans`).
//
// Authority is the plan's, which is the campaign's, folded into the data
// layer's queries through `ownedPlan` — a plan id from someone else's table is
// a miss here, and a miss is 404.
//
// **PATCH on the collection is the reorder**, and it takes the whole list of
// ids for one kind rather than "move this one up". The full order is
// idempotent, it heals ties, and the data layer refuses a set that is not
// exactly the plan's current one — which is what makes reordering safe on a
// driver with no transactions.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { addSessionPlanItem, reorderSessionPlanItems } from '@/lib/db/session-plans'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'
import {
  createSessionPlanItemSchema,
  reorderSessionPlanItemsSchema,
} from '@/lib/session-plans/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; planId: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = createSessionPlanItemSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That line is not valid')
  }

  const item = await addSessionPlanItem(user.id, id, planId, parsed.data)

  return item ? NextResponse.json({ item }, { status: 201 }) : notFound('session plan')
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = reorderSessionPlanItemsSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That order is not valid')
  }

  const items = await reorderSessionPlanItems(
    user.id,
    id,
    planId,
    parsed.data.kind,
    parsed.data.ids,
  )

  return items ? NextResponse.json({ items }) : notFound('session plan')
}
