// One campaign's roster, as the DM's glance polls it (DND-030, D25).
//
// Session-gated like every character route, and DM-scoped in the query — a
// campaign someone else runs answers the same 404 as one that never existed.
// The party glance re-reads this every ~15 seconds so a player's HP change
// reaches the DM's screen without anyone refreshing.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. See .icm/docs/neon-database-setup.md' },
      { status: 503 },
    )
  }

  const { id } = await params
  const roster = await getCampaignRoster(user.id, id)

  return roster
    ? NextResponse.json(roster)
    : NextResponse.json({ error: 'No such campaign' }, { status: 404 })
}
