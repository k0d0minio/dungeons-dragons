// The campaign's table screen link (`dm-run-suite/table-screen-cast`).
//
// `POST` mints one where there is none and replaces one where there is — the
// encounter share token's route, applied to the campaign, and the same reason
// it is one verb: the DM's control says "Create link" or "New link" and both
// are the same write. The old link stops working the moment this returns,
// which is the only way to shut a screen someone carried off.
//
// DM-scoped in the statement, so a campaign someone else runs answers the same
// 404 as one that never existed — never 403.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { regenerateTableToken } from '@/lib/db/table'
import { databaseUnconfigured, notFound, unauthorized } from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const campaign = await regenerateTableToken(user.id, id)

  return campaign ? NextResponse.json({ campaign }) : notFound('campaign')
}
