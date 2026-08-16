// One encounter: read it, step it, delete it (DND-031).
//
// Session-gated, with authority folded into the query by
// `src/lib/db/encounters.ts` — an encounter in a campaign this user does not
// run is indistinguishable from one that never existed, which is what a 404
// says. PATCH takes the tracker's three encounter-level changes: rename, set
// the round, set the active turn.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteEncounter, getEncounterForDm, patchEncounter } from '@/lib/db/encounters'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const encounterPatchSchema = z
  .strictObject({
    name: z.string().trim().min(1, 'Give the encounter a name').max(120),
    round: z.number().int().min(1).max(999),
    activeTurn: z.number().int().min(0).max(999),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Nothing to change' })

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such encounter' }, { status: 404 })
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
  const detail = await getEncounterForDm(user.id, id)

  return detail ? NextResponse.json(detail) : notFound()
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

  const parsed = encounterPatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 },
    )
  }

  const encounter = await patchEncounter(user.id, id, parsed.data)

  return encounter ? NextResponse.json({ encounter }) : notFound()
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const deleted = await deleteEncounter(user.id, id)

  return deleted ? NextResponse.json({ deleted: true }) : notFound()
}
