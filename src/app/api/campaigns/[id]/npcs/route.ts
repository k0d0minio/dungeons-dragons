// A campaign's NPC roster: list it, add to it (`dm-prep-suite/npc-roster`).
//
// Authority lives in the data layer's queries — `campaigns.dm_user_id` folded
// into every WHERE clause — so a campaign someone else runs 404s here exactly
// like one that never existed, the same shape the notes and encounters routes
// use. **This route answers to the DM and returns both layers**; the public
// half of an NPC reaches a player only through the reads in
// `src/lib/db/discovered.ts`, which select `npcPublicColumns` and never come
// through here.
//
// No version guard and no 409: prep is not contested state.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createCampaignNpc, listCampaignNpcs } from '@/lib/db/npcs'
import { createNpcSchema } from '@/lib/npcs/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such campaign' }, { status: 404 })
}

function databaseUnconfigured() {
  return NextResponse.json(
    {
      error:
        'The database is not connected. If you run this app, see the database runbook in the repo docs.',
    },
    { status: 503 },
  )
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const npcs = await listCampaignNpcs(user.id, id)

  return npcs ? NextResponse.json({ npcs }) : notFound()
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = createNpcSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That NPC is not valid' },
      { status: 400 },
    )
  }

  const npc = await createCampaignNpc(user.id, id, parsed.data)

  return npc ? NextResponse.json({ npc }, { status: 201 }) : notFound()
}
