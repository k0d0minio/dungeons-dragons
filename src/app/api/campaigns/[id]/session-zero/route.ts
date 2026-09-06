// Write the one page the table agreed on (`first-table/session-zero-one-pager`).
//
// The players read this straight off the campaign row, so it is the one thing
// the DM writes that has no DM-only half — which is why it is a column on
// `campaigns` with its own route, rather than a note with a kind: a note
// carries `shared_with_players`, and a page that is player-facing by
// definition should not have a switch that could be off.
//
// `PUT` for the notes route's reason: the body is the page as the DM is
// looking at it, not a delta. An empty page is a legitimate save — it clears
// the card off the players' screens — and the data layer stores it as `null`.
// Authority is the data layer's; another DM's campaign answers 404.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { setCampaignSessionZero } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { MAX_PREP_TEXT_LENGTH } from '@/lib/prep/fields'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

const sessionZeroSchema = z.object({
  body: z
    .string({ error: 'Expected the page as text' })
    .trim()
    .max(
      MAX_PREP_TEXT_LENGTH,
      `Keep the page under ${MAX_PREP_TEXT_LENGTH.toLocaleString()} characters — it is one page`,
    ),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = sessionZeroSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That page is not valid')
  }

  const { id } = await params
  const campaign = await setCampaignSessionZero(user.id, id, parsed.data.body || null)

  return campaign ? NextResponse.json({ campaign }) : notFound('campaign')
}
