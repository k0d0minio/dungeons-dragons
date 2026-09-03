// Revoke an invite link (`user-management/invites-and-roles`). The link stops
// working the moment this returns. DM-only (D19); an invite that is not open
// — already used, already revoked, expired, or not there — answers 404 alike.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { revokeInvite } from '@/lib/db/invites'
import { isDm } from '@/lib/db/roles'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(_request: Request, { params }: RouteContext) {
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

  if (!(await isDm(user.id))) {
    return NextResponse.json({ error: 'Only the DM can revoke invites' }, { status: 403 })
  }

  const { id } = await params
  const invite = UUID_PATTERN.test(id) ? await revokeInvite(id) : null

  return invite
    ? NextResponse.json({ invite })
    : NextResponse.json({ error: 'No open invite with that id' }, { status: 404 })
}
