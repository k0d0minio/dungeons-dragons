// The level a campaign's party has reached, as the DM's card writes it
// (D35, `dm-run-suite/milestone-leveling`).
//
// `PUT` rather than `PATCH`, for the gates route's reason: the body is the
// number the DM is looking at, not a delta against a row a second tab may have
// moved. One column, one write, no character touched — the whole feature.
//
// Authority is the data layer's — `dm_user_id` folded into the WHERE clause —
// so a campaign someone else runs answers the same 404 as a fictional one.
//
// Validation is stricter here than on the gates route, and deliberately so: an
// unknown gate key is a switch this build has not shipped, while a milestone of
// `50` is a number that would put a level-up prompt on five phones. It is
// refused rather than clamped.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { parseMilestoneLevel } from '@/lib/campaigns/milestone'
import { setCampaignMilestone } from '@/lib/db/campaigns'
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

  if (typeof payload !== 'object' || payload === null || !('milestoneLevel' in payload)) {
    return badRequest('Expected a milestoneLevel')
  }

  const wanted = payload.milestoneLevel

  // `null` is the one non-number accepted, and it is not an absence: it is the
  // DM saying this table does not level by milestone, which has to be storable
  // or a number set by mistake could never be taken back.
  const milestoneLevel = wanted === null ? null : parseMilestoneLevel(wanted)

  if (wanted !== null && milestoneLevel === null) {
    return badRequest('A milestone is a level from 1 to 20, or null')
  }

  const { id } = await params
  const campaign = await setCampaignMilestone(user.id, id, milestoneLevel)

  return campaign ? NextResponse.json({ campaign }) : notFound('campaign')
}
