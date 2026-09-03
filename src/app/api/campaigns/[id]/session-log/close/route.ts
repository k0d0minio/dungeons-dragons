// Close the session: publish the DM's edited recap
// (`dm-run-suite/session-log-recap`, D41).
//
// One POST, one act, and the act is both halves at once — the recap goes to
// the party and the log's window moves to now. They are not separable here on
// purpose: a "closed but unpublished" session would be a state with nothing to
// show for it, and a recap published without closing would leave tomorrow's
// log still carrying tonight's fights.
//
// Not a PATCH on `../notes/[noteId]`, even though what it writes is a campaign
// note. That route edits a note the DM already has; this one is the end of an
// evening, and it is the only way a row is ever written with
// `session_closed_at` on it. Naming the act keeps the write in one place, and
// it means "publish a recap" is a thing a reviewer can grep for.
//
// Authority is the data layer's: a campaign this user does not run answers 404,
// like every other campaign-scoped route.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { publishSessionRecap } from '@/lib/db/notes'
import { publishRecapSchema } from '@/lib/notes/schema'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = publishRecapSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That recap is not valid')
  }

  const { id } = await params
  const recap = await publishSessionRecap(user.id, id, parsed.data.body)

  return recap ? NextResponse.json({ recap }, { status: 201 }) : notFound('campaign')
}
