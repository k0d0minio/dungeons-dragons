// A campaign's session plans: list them, start one
// (`dm-prep-suite/session-plans`).
//
// Authority lives in the data layer's queries — `campaigns.dm_user_id` folded
// into every WHERE clause — so a campaign someone else runs 404s here exactly
// like one that never existed. **This route answers to the DM and returns both
// layers**; the public half of a plan reaches a player only through
// `dm-run-suite/reveal-controls`, which selects `sessionPlanPublicColumns` and
// never comes through here.
//
// No version guard and no 409: prep is not contested state.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createSessionPlan, listSessionPlans } from '@/lib/db/session-plans'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'
import { createSessionPlanSchema } from '@/lib/session-plans/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const plans = await listSessionPlans(user.id, id)

  return plans ? NextResponse.json({ plans }) : notFound('campaign')
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = createSessionPlanSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That plan is not valid')
  }

  const plan = await createSessionPlan(user.id, id, parsed.data)

  return plan ? NextResponse.json({ plan }, { status: 201 }) : notFound('campaign')
}
