// Delete an account (`triage/account-deletion-from-users-page`).
//
// DM-only, and **never on yourself** — the same two guards as the role route
// next door, for a sharper reason: a DM who deleted their own account would
// take the one `dm` row with it and leave a table nobody can administer at
// all. Handing the DM's hat to someone else first and letting *them* do it is
// the deliberate two-step.
//
// What "delete" means, in what order, and which partial states that order was
// chosen to produce is `deleteUserAccount`'s doc in `src/lib/db/users.ts`; the
// privilege evidence under it is
// `.icm/docs/2026-09-04-account-deletion-privileges.md`.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'
import { deleteUserAccount } from '@/lib/db/users'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

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
    return NextResponse.json({ error: 'Only the DM can delete an account' }, { status: 403 })
  }

  const { id } = await params

  if (id === user.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account. Make someone else the DM first.' },
      { status: 403 },
    )
  }

  const result = await deleteUserAccount(id)

  if (result.outcome === 'missing') {
    return NextResponse.json({ error: 'That account is already gone' }, { status: 404 })
  }

  // 409 rather than 403: nothing about the DM's authority is in question, the
  // account is simply not in a state that can be deleted yet. Nothing was
  // deleted before this answer.
  if (result.outcome === 'runs-campaigns') {
    return NextResponse.json(
      {
        error:
          result.campaigns === 1
            ? 'This account runs a campaign. Delete it or hand it to another DM first.'
            : `This account runs ${result.campaigns} campaigns. Delete them or hand them to another DM first.`,
      },
      { status: 409 },
    )
  }

  return NextResponse.json({ deleted: { id }, tally: result.tally })
}
