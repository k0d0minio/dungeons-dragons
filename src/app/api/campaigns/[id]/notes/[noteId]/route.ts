// One session note: edit it, share it with the party, or delete it (DND-058).
//
// Same authority model as its parent route — folded into the data layer's
// queries, so a note in someone else's campaign 404s like one that never
// existed. `sharedWithPlayers` is the register's visibility rule, and this
// PATCH is the only way it is ever turned on.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { deleteCampaignNote, updateCampaignNote } from '@/lib/db/notes'
import { patchNoteSchema } from '@/lib/notes/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; noteId: string }> }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such note' }, { status: 404 })
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

  const { id, noteId } = await params

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = patchNoteSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 },
    )
  }

  const note = await updateCampaignNote(user.id, id, noteId, parsed.data)

  return note ? NextResponse.json({ note }) : notFound()
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, noteId } = await params
  const deleted = await deleteCampaignNote(user.id, id, noteId)

  return deleted ? NextResponse.json({ deleted: true }) : notFound()
}
