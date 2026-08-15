// A character's inventory: list it, add to it (DND-035).
//
// Session-gated like the character routes, answering 401 rather than
// redirecting. Authority is folded into the query by `src/lib/db/items.ts` —
// the viewer is the owner or the DM of a campaign the character is in (D13),
// and anyone else's character id 404s here exactly as it does on
// `/api/characters/[id]`.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { ATTUNEMENT_LIMIT, itemInputSchema } from '@/lib/characters/items'
import { addItem, listItems } from '@/lib/db/items'
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
    { status: 503 },
  )
}

/** The attunement cap is a rule of the game, so 409 — the request was well-formed. */
function attunementLimit() {
  return NextResponse.json(
    { error: `Only ${ATTUNEMENT_LIMIT} items can be attuned at once — unattune one first` },
    { status: 409 },
  )
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const items = await listItems(user.id, id)

  return items ? NextResponse.json({ items }) : notFound()
}

export async function POST(request: Request, { params }: RouteContext) {
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

  const parsed = itemInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That item is not valid' },
      { status: 400 },
    )
  }

  const result = await addItem(user.id, id, parsed.data)

  if (result.outcome === 'written') return NextResponse.json({ item: result.item }, { status: 201 })
  if (result.outcome === 'attunement-limit') return attunementLimit()
  return notFound()
}
