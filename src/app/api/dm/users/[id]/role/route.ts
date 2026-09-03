// Set a user's global role (`user-management/invites-and-roles`, D19).
//
// DM-only, and **never on yourself**: the one `dm` row is what makes this
// route reachable, and a DM who could demote themself would be one mis-tap
// from a table with no DM and no way back short of SQL. Promoting someone
// else to DM first and letting *them* demote you is the deliberate two-step.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'
import { isUserRole, setUserRole } from '@/lib/db/users'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
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
    return NextResponse.json({ error: 'Only the DM can change roles' }, { status: 403 })
  }

  const { id } = await params

  if (id === user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role. Make someone else the DM first.' },
      { status: 403 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const role =
    typeof body === 'object' && body !== null && 'role' in body
      ? (body as { role: unknown }).role
      : undefined

  if (!isUserRole(role)) {
    return NextResponse.json({ error: 'A role is dm or player' }, { status: 400 })
  }

  await setUserRole(id, role)

  return NextResponse.json({ user: { id, role } })
}
