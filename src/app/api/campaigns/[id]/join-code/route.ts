// Replace a campaign's join code (DND-046). Old links stop working the moment
// this returns — that is the point. Scoped to the campaign's DM in the query,
// so a foreign campaign id answers the same 404 as a fictional one.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { regenerateJoinCode } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'The database is not connected. If you run this app, see the database runbook in the repo docs.',
      },
      { status: 503 },
    )
  }

  const { id } = await params
  const campaign = await regenerateJoinCode(user.id, id)

  return campaign
    ? NextResponse.json({ campaign })
    : NextResponse.json({ error: 'No such campaign' }, { status: 404 })
}
