// Apply a level change to one character (DND-032).
//
// Its own route rather than a third shape on `PATCH /api/characters/[id]`: a
// level change is the one edit that spans both halves of the row. `level` and
// `maxHitPoints` are build fields the DND-018 form owns; `spellSlots` is live
// session state the sheet owns; and that route tells the two apart by their
// keys, refusing a body that mixes them. Rather than blur a discriminator that
// exists to keep a mid-combat phone from rewriting ability scores, a level
// change gets a door of its own — and still lands as a single write, which
// matters on `neon-http`, where there are no transactions to make two writes
// atomic.
//
// Session-gated and owner-scoped exactly like its neighbours: ownership is
// folded into the query by `src/lib/db/characters.ts`, so someone else's id
// answers the same 404 as an id that was never real.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { levelChangeSchema, normaliseLevelChange } from '@/lib/characters/level-up'
import { fieldErrorsOf } from '@/lib/characters/schema'
import { getCharacter, updateCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Level a character up — or back down, which is the same request with a smaller
 * number, because the first thing anyone does with a level-up button is press
 * it by mistake.
 *
 * The response is the stored row rather than an echo of the request, like the
 * sheet's own patches: what the server clamped (current hit points against a
 * maximum that just dropped) is what the page re-renders against.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. See .icm/docs/neon-database-setup.md' },
      { status: 503 }
    )
  }

  const { id } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = levelChangeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'That level change is not valid', fieldErrors: fieldErrorsOf(parsed.error) },
      { status: 400 }
    )
  }

  // Read before write: clamping current hit points needs *this* character's
  // numbers, and a miss here is a 404 before anything has been written.
  const existing = await getCharacter(user.id, id)

  if (!existing) return NextResponse.json({ error: 'No such character' }, { status: 404 })

  const character = await updateCharacter(
    user.id,
    id,
    normaliseLevelChange(parsed.data, existing)
  )

  return character
    ? NextResponse.json({ character })
    : NextResponse.json({ error: 'No such character' }, { status: 404 })
}
