// A campaign's session notes: list them, write one (DND-058).
//
// Authority lives in the data layer's queries — `campaigns.dm_user_id` folded
// into every WHERE clause — so a campaign someone else runs 404s here exactly
// like one that never existed, the same shape the encounters routes use.
//
// No version guard and no 409: notes are not contested state, so a save is a
// save (DND-058's acceptance says so explicitly). The concurrency guard stays
// on `characters`, where two phones really do race.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createCampaignNote, listCampaignNotes } from '@/lib/db/notes'
import { createNoteSchema } from '@/lib/notes/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

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
  const notes = await listCampaignNotes(user.id, id)

  return notes ? NextResponse.json({ notes }) : notFound()
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = createNoteSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That note is not valid' },
      { status: 400 },
    )
  }

  const note = await createCampaignNote(user.id, id, parsed.data)

  return note ? NextResponse.json({ note }, { status: 201 }) : notFound()
}
