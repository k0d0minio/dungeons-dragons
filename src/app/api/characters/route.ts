// Character data is per-user, so this route is session-gated. It answers 401
// rather than redirecting, which is why `/api/characters` is left out of the
// proxy matcher.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { characterFormSchema, fieldErrorsOf } from '@/lib/characters/schema'
import { createCharacter, listCharacters } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

/**
 * Say so rather than answering with an empty list — "you have no characters"
 * and "the database isn't wired up yet" are very different answers, and only
 * one of them should be quiet.
 */
function databaseUnconfigured() {
  return NextResponse.json(
    { error: 'Database is not configured.' },
    { status: 503 }
  )
}

export async function GET() {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDatabaseConfigured()) {
    return databaseUnconfigured()
  }

  return NextResponse.json({ characters: await listCharacters(user.id) })
}

/**
 * Create a character owned by the signed-in user (DND-008).
 *
 * The body is validated against the same zod object the form uses, so the two
 * cannot drift. Reference indexes are taken on trust: checking that a spell
 * really is on the chosen class's list would mean a server-side round trip to
 * dnd5eapi.co on every save, and the worst case is a friend-and-family player
 * writing down a spell their class cannot cast — which is their table's ruling
 * to make, not this route's.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDatabaseConfigured()) {
    return databaseUnconfigured()
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = characterFormSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'That character is not valid', fieldErrors: fieldErrorsOf(parsed.error) },
      { status: 400 }
    )
  }

  const { knownSpellIndexes, ...character } = parsed.data

  const stored = await createCharacter(user.id, {
    ...character,
    // A duplicate would render twice on the sheet. The picker cannot produce
    // one; a hand-rolled request can.
    knownSpellIndexes: Array.from(new Set(knownSpellIndexes)),
  })

  return NextResponse.json({ character: stored }, { status: 201 })
}
