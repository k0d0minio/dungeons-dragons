// Quick capture (DND-058): one line, appended to tonight's session note.
//
// Its own route rather than a second body shape on `../notes` because it is a
// different verb on a different target — "add a line to whichever note tonight
// is" versus "create this note" — and the surfaces that call it (the campaign
// page and the encounter tracker) are typing one-handed mid-session and want
// the smallest possible request. `append` is a static segment, so it never
// collides with the sibling `[noteId]` route: note ids are uuids.
//
// Which note the line lands in is the data layer's rule, documented on
// `appendToSessionNote` — `session_date = current_date`, and nothing else.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { appendToSessionNote } from '@/lib/db/notes'
import { appendNoteSchema } from '@/lib/notes/schema'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

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

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = appendNoteSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That note is not valid' },
      { status: 400 },
    )
  }

  const note = await appendToSessionNote(user.id, id, parsed.data.text)

  return note
    ? NextResponse.json({ note })
    : NextResponse.json({ error: 'No such campaign' }, { status: 404 })
}
