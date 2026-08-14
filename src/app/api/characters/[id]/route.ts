// One character: read it, or change what a session changes (DND-009).
//
// Session-gated like `/api/characters`, and 401s rather than redirecting for
// the same reason. Ownership is not checked here — it is folded into the query
// by `src/lib/db/characters.ts`, so a character belonging to someone else is
// indistinguishable from one that does not exist, which is what a 404 says.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { combatPatchSchema, normaliseCombatPatch } from '@/lib/characters/combat'
import { getCharacter, updateCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such character' }, { status: 404 })
}

function databaseUnconfigured() {
  return NextResponse.json(
    { error: 'Database is not configured. See .icm/docs/neon-database-setup.md' },
    { status: 503 }
  )
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const character = await getCharacter(user.id, id)

  return character ? NextResponse.json({ character }) : notFound()
}

/**
 * Apply a combat-state change and answer with the stored row.
 *
 * The response body is the character as the database now holds it, not an echo
 * of the request: the sheet renders optimistically and then reconciles against
 * this, so a value the server clamped (healing past maximum, a slot spent twice
 * from two devices) corrects itself on screen instead of drifting.
 */
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

  const parsed = combatPatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 }
    )
  }

  // Read before write: clamping current HP needs *this* character's maximum,
  // and it also settles ownership before anything is written.
  const existing = await getCharacter(user.id, id)
  if (!existing) return notFound()

  const character = await updateCharacter(
    user.id,
    id,
    normaliseCombatPatch(parsed.data, existing)
  )

  return character ? NextResponse.json({ character }) : notFound()
}
