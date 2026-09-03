// A campaign's feature gates, as the DM's settings screen writes them
// (`dm-prep-suite/campaign-feature-gates`).
//
// `PUT` rather than `PATCH`: the body is the four switches as the screen is
// showing them, so what lands is the state the DM was looking at rather than a
// diff against a row a second tab may have moved. Authority is the data
// layer's — `dm_user_id` folded into the WHERE clause — so a campaign someone
// else runs answers the same 404 as a fictional one.
//
// Validation is `parseGates`, which keeps known keys with boolean values and
// drops everything else rather than refusing: a body carrying a gate this
// build has not shipped yet is not a reason to fail a DM's four switches, and
// a gate is not an access control that has to be strict about its inputs.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { parseGates } from '@/lib/campaigns/gates'
import { setCampaignGates } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const payload = body.payload

  // The one thing that is refused: a body with no `gates` object at all, which
  // is a client bug rather than a DM turning everything off — and turning
  // everything off is `{ gates: {} }`, which is accepted.
  if (typeof payload !== 'object' || payload === null || !('gates' in payload)) {
    return badRequest('Expected a gates object')
  }

  const { id } = await params
  const campaign = await setCampaignGates(user.id, id, parseGates(payload.gates))

  return campaign ? NextResponse.json({ campaign }) : notFound('campaign')
}
