// Carry a table forward into this campaign (`triage/carry-forward-rerun`).
//
// The carry used to live inside `POST /api/campaigns` as a `carryFrom` on the
// body, which made it un-runnable on its own: `neon-http` has no transactions,
// so a failure between the passes left a campaign standing with fewer people
// on it, and the only way to ask for the carry again was to submit the create
// form again — which made a *second* campaign. It is its own act here, and
// running it twice is the same as running it once.
//
// `PUT` for the gates and milestone routes' reason, and one more: the body
// says which table carries on, not a delta, and the endpoint is idempotent —
// the passes are `ON CONFLICT DO NOTHING` inserts and one settled update, so
// the same request repeated leaves the same rows.
//
// **Two ids, both checked against `dm_user_id`, neither a permission.** The
// campaign being carried into is the path's; the source is the body's. The
// data layer re-reads both under the DM's id, so a pointer at someone else's
// campaign — either end — answers the 404 a fictional one answers, having
// written nothing.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { carryCampaignForward } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

const carryFromSchema = z.object({
  campaignId: z.uuid('That is not a campaign'),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = carryFromSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Name the campaign to carry forward')
  }

  const { id } = await params

  // A no-op in the data layer (every pass is idempotent), but nothing a DM can
  // ask for on purpose: a client that sent it is confused about which campaign
  // it is on, and a silent 200 would hide that.
  if (parsed.data.campaignId === id) {
    return badRequest('A campaign cannot carry itself forward')
  }

  const campaign = await carryCampaignForward(user.id, id, parsed.data.campaignId)

  return campaign ? NextResponse.json({ campaign }) : notFound('campaign')
}
