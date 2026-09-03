// What tonight touches: point a plan at an NPC, a place or an encounter
// (`dm-prep-suite/session-plans`).
//
// The target has to be in the same campaign as the plan, and the data layer
// establishes that in the same statement as the DM's authority — so a link to
// another table's NPC 404s rather than quietly showing that campaign's prep on
// this campaign's night.
//
// Linking the same thing twice is a success, not an error: the data layer hands
// back the link that already exists. A double tap on a phone does not deserve a
// message.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { addSessionPlanLink } from '@/lib/db/session-plans'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'
import { createSessionPlanLinkSchema } from '@/lib/session-plans/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; planId: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId } = await params
  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = createSessionPlanLinkSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That link is not valid')
  }

  const link = await addSessionPlanLink(user.id, id, planId, parsed.data.kind, parsed.data.targetId)

  return link ? NextResponse.json({ link }, { status: 201 }) : notFound('session plan')
}
