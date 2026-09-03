// Unlink one thing from a plan (`dm-prep-suite/session-plans`).
//
// Deleting the link deletes nothing else: the NPC, the place or the encounter
// it pointed at is untouched, which is the whole reason a plan links rather
// than copies. The cascade runs the other way — delete the NPC and the link
// goes with it.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteSessionPlanLink } from '@/lib/db/session-plans'
import { databaseUnconfigured, notFound, unauthorized } from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; planId: string; linkId: string }> }

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, planId, linkId } = await params
  const deleted = await deleteSessionPlanLink(user.id, id, planId, linkId)

  return deleted ? NextResponse.json({ deleted: true }) : notFound('link')
}
