// Replace an encounter's share token (D24). The old table-screen link stops
// working the moment this returns — that is the point. DM-scoped in the
// query, so a foreign encounter id answers the same 404 as a fictional one.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { regenerateShareToken } from '@/lib/db/encounters'

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
  const encounter = await regenerateShareToken(user.id, id)

  return encounter
    ? NextResponse.json({ encounter })
    : NextResponse.json({ error: 'No such encounter' }, { status: 404 })
}
