// The DM's note on a character (`first-table/dm-character-notes`).
//
// Its own route under the campaign, not a field on `PATCH /api/characters/[id]`:
// that route's viewer predicate admits the owner, and the owner may never
// read or write this. `saveCharacterDmNote` scopes on the campaign in the URL
// being this user's *and* the character being on its roster — so a character
// this user does not run, in a campaign they do not run, or a stale link
// naming the wrong table, all answer the same 404.
//
// A plain save with no version to guard: one DM, one note, nothing to race.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { saveCharacterDmNote } from '@/lib/db/dm-notes'
import { characterNotesSchema } from '@/lib/notes/schema'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; characterId: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = characterNotesSchema.safeParse(body.payload)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That note is not valid')
  }

  const { id, characterId } = await params
  const note = await saveCharacterDmNote(user.id, id, characterId, parsed.data.body)

  return note ? NextResponse.json({ note }) : notFound('character')
}
