// A campaign's handouts: list them, add one
// (`dm-prep-suite/locations-handouts`).
//
// Authority is the data layer's — `campaigns.dm_user_id` in every WHERE — so a
// campaign someone else runs 404s like one that never existed.
//
// **A handout is created as text and gets its picture afterwards.** There is no
// image field in the body this route accepts: bytes go to
// `/handouts/[handoutId]/image`, which validates them and writes the column
// itself. A client that could name the object to attach would be a client that
// could name someone else's, so no client ever names one.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createCampaignHandout, listCampaignHandouts } from '@/lib/db/handouts'
import { createHandoutSchema } from '@/lib/handouts/schema'
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
  const handouts = await listCampaignHandouts(user.id, id)

  return handouts ? NextResponse.json({ handouts }) : notFound('campaign')
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = createHandoutSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That handout is not valid')
  }

  const handout = await createCampaignHandout(user.id, id, parsed.data)

  return handout ? NextResponse.json({ handout }, { status: 201 }) : notFound('campaign')
}
