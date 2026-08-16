// One inventory item: change it or drop it (DND-035).
//
// Same posture as the parent route: session-gated, 401 not redirect,
// authority in the query (owner or campaign DM, D13), and a foreign or
// fictional id is a 404 either way. The attunement cap answers 409 — the
// request was fine, the rules were not.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { ATTUNEMENT_LIMIT, itemPatchSchema } from '@/lib/characters/items'
import { deleteItem, updateItem } from '@/lib/db/items'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; itemId: string }> }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such item' }, { status: 404 })
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

  const { id, itemId } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = itemPatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 },
    )
  }

  const result = await updateItem(user.id, id, itemId, parsed.data)

  if (result.outcome === 'written') return NextResponse.json({ item: result.item })

  if (result.outcome === 'attunement-limit') {
    return NextResponse.json(
      { error: `Only ${ATTUNEMENT_LIMIT} items can be attuned at once — unattune one first` },
      { status: 409 },
    )
  }

  return notFound()
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, itemId } = await params
  const deleted = await deleteItem(user.id, id, itemId)

  return deleted ? NextResponse.json({ deleted: true }) : notFound()
}
