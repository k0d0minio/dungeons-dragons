// A player's private notes for one character (DND-058).
//
// **Owner-only, and that is the whole point of this route existing.** It does
// not go through `PATCH /api/characters/[id]`, which uses the DND-027 viewer
// predicate — a DM may edit a party member's hit points (D13) and may not read
// their notes, so the two cannot share a query. `saveCharacterNotes` scopes on
// `characters.owner_id`, and a character this user does not own answers the
// same 404 as one that never existed.
//
// A plain save, not the DND-028 concurrency path: there is no version to guard
// and nothing to contend over, so this route never answers 409.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { saveCharacterNotes } from '@/lib/db/notes'
import { characterNotesSchema } from '@/lib/notes/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

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

  const { id } = await params

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = characterNotesSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 },
    )
  }

  const saved = await saveCharacterNotes(user.id, id, parsed.data.body)

  return saved
    ? NextResponse.json({ notes: saved })
    : NextResponse.json({ error: 'No such character' }, { status: 404 })
}
