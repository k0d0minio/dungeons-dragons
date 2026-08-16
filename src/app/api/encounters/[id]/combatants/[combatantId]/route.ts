// One combatant: change it or remove it (DND-031).
//
// PATCH is the tracker's per-row surface — initiative, monster HP, temp HP,
// conditions, label, sort order. **PC hit points are not writable here**: the
// data layer strips HP fields from a patch aimed at a character row, because
// the character is the single source of truth (D13) and the tracker writes PC
// damage through `PATCH /api/characters/[id]` with the version guard instead.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { removeCombatant, updateCombatant } from '@/lib/db/encounters'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; combatantId: string }> }

const combatantPatchSchema = z
  .strictObject({
    initiative: z.number().int().min(-99).max(99).nullable(),
    currentHitPoints: z.number().int().min(0).max(999),
    temporaryHitPoints: z.number().int().min(0).max(999),
    conditions: z.array(z.string().min(1)).max(20),
    label: z.string().trim().min(1).max(120),
    sortOrder: z.number().int().min(0).max(999),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Nothing to change' })

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such combatant' }, { status: 404 })
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, combatantId } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = combatantPatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 },
    )
  }

  const combatant = await updateCombatant(user.id, id, combatantId, parsed.data)

  return combatant ? NextResponse.json({ combatant }) : notFound()
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, combatantId } = await params
  const deleted = await removeCombatant(user.id, id, combatantId)

  return deleted ? NextResponse.json({ deleted: true }) : notFound()
}
