// A campaign's encounters: list them, start a new one (DND-031).
//
// A create may arrive with the encounter already assembled
// (`dm-prep-suite/encounter-builder`): the party who are turning up, and the
// monster lines the builder priced against them. Both are optional, so the bare
// `{ name }` this route has always taken still means "an empty encounter".
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
import {
  addCharacterCombatants,
  addMonsterCombatants,
  createEncounter,
  listEncounters,
} from '@/lib/db/encounters'
import { MAX_MONSTER_INSTANCES, MAX_MONSTER_LINES } from '@/lib/encounters/budget'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** One stat block and how many of it, as the builder's line saves. */
const monsterLineSchema = z.strictObject({
  monsterIndex: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  count: z.number().int().min(1).max(MAX_MONSTER_INSTANCES),
  maxHitPoints: z.number().int().min(1).max(999).nullable(),
})

const createEncounterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the encounter a name')
    .max(120, 'Keep the name under 120 characters'),

  // The seed. Character ids are re-scoped to this campaign in SQL by the data
  // layer, so an id from someone else's table is dropped rather than trusted.
  characterIds: z.array(z.string().uuid()).max(20).optional(),
  monsters: z.array(monsterLineSchema).max(MAX_MONSTER_LINES).optional(),
})

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
  if (!encounter) return notFound()

  // The party first, so the PCs sit at the top of the insertion order the
  // tracker falls back to before anyone has rolled initiative.
  //
  // Sequential, not `Promise.all`: each add reads the encounter's existing rows
  // to pick the next `sort_order` and to number a second wave of goblins from
  // where the first left off, so overlapping adds would mint two "Goblin 1"s.
  // `neon-http` has no transactions either way (D-note in the epic breakdown) —
  // a seed that fails half way leaves a real encounter with some of its bodies
  // in it, which the DM lands on and can see, rather than a silent nothing.
  if (parsed.data.characterIds && parsed.data.characterIds.length > 0) {
    await addCharacterCombatants(user.id, encounter.id, parsed.data.characterIds)
  }

  for (const monster of parsed.data.monsters ?? []) {
    await addMonsterCombatants(user.id, encounter.id, monster)
  }

  return NextResponse.json({ encounter }, { status: 201 })
}
