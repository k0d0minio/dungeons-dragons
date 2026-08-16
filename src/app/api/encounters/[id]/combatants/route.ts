// Add combatants to an encounter (DND-031): the party by character id, or a
// batch of monster instances by reference index.
//
// The body's keys say which it is — the two shapes share none. Character adds
// are re-scoped in SQL to the encounter's own campaign (a character id from
// anywhere else is dropped, not an error); monster adds mint per-instance
// rows labelled "Name 1..N" with HP seeded (D17).
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  addCharacterCombatants,
  addMonsterCombatants,
  MAX_MONSTER_BATCH,
} from '@/lib/db/encounters'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const addCharactersSchema = z.strictObject({
  characterIds: z.array(z.string().uuid()).min(1).max(20),
})

const addMonstersSchema = z.strictObject({
  monsterIndex: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  count: z.number().int().min(1).max(MAX_MONSTER_BATCH),
  maxHitPoints: z.number().int().min(1).max(999).nullable(),
})

const addCombatantsSchema = z.union([addCharactersSchema, addMonstersSchema])

export async function POST(request: Request, { params }: RouteContext) {
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

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = addCombatantsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'That is not something this route can add' }, { status: 400 })
  }

  const combatants =
    'characterIds' in parsed.data
      ? await addCharacterCombatants(user.id, id, parsed.data.characterIds)
      : await addMonsterCombatants(user.id, id, parsed.data)

  return combatants
    ? NextResponse.json({ combatants }, { status: 201 })
    : NextResponse.json({ error: 'No such encounter' }, { status: 404 })
}
