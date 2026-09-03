// A campaign's places: list them, add one (`dm-prep-suite/locations-handouts`).
//
// Authority lives in the data layer's queries — `campaigns.dm_user_id` folded
// into every WHERE clause — so a campaign someone else runs 404s here exactly
// like one that never existed. **This route answers to the DM and returns both
// layers**; the public half of a location reaches a player only through the
// reads in `src/lib/db/discovered.ts`, which select `locationPublicColumns` and
// never come through here.
//
// No version guard and no 409: prep is not contested state.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createCampaignLocation, listCampaignLocations } from '@/lib/db/locations'
import { createLocationSchema } from '@/lib/locations/schema'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const locations = await listCampaignLocations(user.id, id)

  return locations ? NextResponse.json({ locations }) : notFound('campaign')
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = createLocationSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That place is not valid')
  }

  const location = await createCampaignLocation(user.id, id, parsed.data)

  return location ? NextResponse.json({ location }, { status: 201 }) : notFound('campaign')
}
