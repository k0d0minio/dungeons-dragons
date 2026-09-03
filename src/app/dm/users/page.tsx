import { InviteManager, type InviteView } from '@/components/dm/invite-manager'
import { UserRoster, type RosterUser } from '@/components/dm/user-roster'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { inviteStatus, listInvites } from '@/lib/db/invites'
import { listUsers } from '@/lib/db/users'

// Reads the session and the whole user list, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Players & invites',
}

/**
 * The DM's people page (`user-management/invites-and-roles`).
 *
 * Every account, not every roster: a friend who has signed up and joined
 * nothing yet is exactly who the DM is looking for here. Two cards — the
 * invites out and the accounts in — and one control on each row. The DM
 * gate is the layout's (`src/app/dm/layout.tsx`); this page needs the
 * session only to know which row is the DM's own.
 */
export default async function DmUsersPage() {
  const user = await requireSessionUser()

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <PageHeader title="Players & invites" backHref="/dm" backLabel="DM" />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not connected to a database yet</CardTitle>
            <CardDescription>
              The user list needs <code>DATABASE_URL</code> to be set. If you run this app, see the
              database runbook in the repo docs.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const [users, invites] = await Promise.all([listUsers(), listInvites()])
  const namesById = new Map(users.map((row) => [row.id, row.name]))

  const roster: RosterUser[] = users.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    role: row.role,
    characterCount: row.characterCount,
    campaignCount: row.campaignCount,
  }))

  const inviteViews: InviteView[] = invites.map((row) => ({
    id: row.id,
    token: row.token,
    role: row.role === 'dm' ? 'dm' : 'player',
    label: row.label,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status: inviteStatus(row),
    claimedByName: row.claimedByUserId ? (namesById.get(row.claimedByUserId) ?? null) : null,
  }))

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Players & invites"
        subtitle="Who is at the table, and how the next friend gets in."
        backHref="/dm"
        backLabel="DM"
      />

      <InviteManager invites={inviteViews} />
      <UserRoster users={roster} selfId={user.id} />
    </main>
  )
}
