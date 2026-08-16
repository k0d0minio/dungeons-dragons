// A campaign's encounters: list them, start a new one (DND-031).
//
// Authority lives in the query — the data layer folds `dm_user_id` into every
// WHERE clause — so a campaign someone else runs 404s here exactly like one
// that never existed. No role check: running encounters in a campaign is what
// being its DM *is*, and `campaigns.dm_user_id` already says who that is.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createEncounter, listEncounters } from '@/lib/db/encounters'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const createEncounterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the encounter a name')
    .max(120, 'Keep the name under 120 characters'),
})

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such campaign' }, { status: 404 })
}

function databaseUnconfigured() {
  return NextResponse.json(
    { error: 'Database is not configured. See .icm/docs/neon-database-setup.md' },
    { status: 503 },
  )
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params

  // The scoped campaign read settles authority: a foreign campaign 404s here
  // rather than answering an empty (and falsely reassuring) list.
  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) return notFound()

  const encounters = await listEncounters(user.id, id)
  return NextResponse.json({ encounters })
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = createEncounterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That encounter is not valid' },
      { status: 400 },
    )
  }

  const encounter = await createEncounter(user.id, id, parsed.data.name)

  return encounter ? NextResponse.json({ encounter }, { status: 201 }) : notFound()
}
