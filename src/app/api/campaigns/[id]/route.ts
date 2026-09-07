// One campaign: the roster the DM's glance polls (DND-030, D25), and the name
// the settings page renames (`dm-chronology/campaign-settings`).
//
// Session-gated like every character route, and DM-scoped in the query — a
// campaign someone else runs answers the same 404 as one that never existed.
// The party glance re-reads the GET every ~15 seconds so a player's HP change
// reaches the DM's screen without anyone refreshing.
//
// PATCH is the campaign row itself, and the only method here that writes. It
// lives on this route rather than a `name/` one of its own because it changes
// the resource this path *is* — every other campaign write has a route because
// it is a distinct act (close, regenerate the join code, call a milestone),
// and a rename is not.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { getCampaignRoster, renameCampaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** The name's rules, character for character the ones `POST /api/campaigns` uses. */
const renameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the campaign a name')
    .max(120, 'Keep the name under 120 characters'),
})

export async function GET(_request: Request, { params }: RouteContext) {
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
  const roster = await getCampaignRoster(user.id, id)

  return roster
    ? NextResponse.json(roster)
    : NextResponse.json({ error: 'No such campaign' }, { status: 404 })
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = renameSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That name is not valid' },
      { status: 400 },
    )
  }

  const { id } = await params

  // No `isDm` check, and none is missing: the write is scoped to
  // `campaigns.dm_user_id`, so a player holds no campaign this can name and
  // gets the 404 a stranger's id gets. The role gate belongs on creation,
  // where there is no row to scope by.
  const campaign = await renameCampaign(user.id, id, parsed.data.name)

  return campaign
    ? NextResponse.json({ campaign })
    : NextResponse.json({ error: 'No such campaign' }, { status: 404 })
}
