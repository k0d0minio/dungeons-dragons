// Close this campaign (`first-table/one-night-campaign`): publish the recap the
// session log drafted, and stamp `closed_at`.
//
// Two writes on a driver with no transactions, so their order is the design.
// **The recap goes first.** `publishSessionRecap` already stamps a shared,
// closed note — the same row the session-log close writes — and if the second
// write then fails, what is left is a published recap and an open campaign:
// the players have their "previously on…", and the DM presses the same button
// again. Pressing it again with an *empty* recap is the recovery path, and
// this route accepts it for exactly that reason — a recap is optional here,
// and an empty one publishes nothing rather than a blank note. The reverse
// order would leave a closed campaign whose players were told nothing, and no
// button to press.
//
// `PUT` because the body names the state the DM wants — closed, with this
// recap — and closing twice keeps the first stamp (see `closeCampaign`).
// Authority is the data layer's: both writes fold `dm_user_id` into their
// statements, so a campaign someone else runs answers 404 before anything is
// published.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { closeCampaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { publishSessionRecap } from '@/lib/db/notes'
import { MAX_NOTE_LENGTH } from '@/lib/notes/schema'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

/** The recap to publish on the way out, or nothing — the second press. */
const closeCampaignSchema = z.object({
  recap: z
    .string()
    .trim()
    .max(MAX_NOTE_LENGTH, `Keep the recap under ${MAX_NOTE_LENGTH.toLocaleString()} characters`)
    .optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = closeCampaignSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That is not a recap')
  }

  const { id } = await params
  const recap = parsed.data.recap ?? ''

  if (recap) {
    const published = await publishSessionRecap(user.id, id, recap)
    if (!published) return notFound('campaign')
  }

  const campaign = await closeCampaign(user.id, id)

  return campaign ? NextResponse.json({ campaign }) : notFound('campaign')
}
