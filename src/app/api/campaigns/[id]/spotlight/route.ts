// What the table screen is showing (`dm-run-suite/table-screen-cast`).
//
// **Its own endpoint, for `reveal`'s reason and one more.** Casting is not an
// edit: it puts something in front of the whole room within one poll, and for
// prep it also reveals — so it must not be a field on a PATCH that a DM
// touches to fix a typo. And the body names the *state* rather than an act,
// so the request is idempotent: `{"spotlight": null}` clears the screen, and
// two taps that both mean "show the letter" leave one letter on the wall.
//
// `PUT`, like the reveal switch, for exactly that reason.
//
// The 404 covers two things on purpose — a campaign this DM does not run, and
// a target this campaign does not hold — because the data layer answers `null`
// to both and neither may be confirmed to whoever asked.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { parseSpotlightTarget } from '@/lib/campaigns/spotlight'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setCampaignSpotlight } from '@/lib/db/table'
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

  const payload = body.payload as { spotlight?: unknown }

  // `null` is the clear, and it has to be told apart from a body that forgot
  // the field: clearing the screen mid-scene is a deliberate act and a typo
  // must not do it silently.
  if (!('spotlight' in payload)) {
    return badRequest('Say what to show, or null to clear the screen')
  }

  const target = payload.spotlight === null ? null : parseSpotlightTarget(payload.spotlight)

  if (payload.spotlight !== null && !target) {
    return badRequest('That is not something the table screen can show')
  }

  const { id } = await params
  const campaign = await setCampaignSpotlight(user.id, id, target)

  return campaign ? NextResponse.json({ campaign }) : notFound('campaign')
}
