import Link from 'next/link'

import { CreateCampaignForm } from '@/components/campaigns/create-campaign-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { listCampaignsForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { getUserRole } from '@/lib/db/roles'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DM',
}

/**
 * The DM surface's home (DND-029 D16, campaigns DND-046, role gate D19).
 *
 * The tab stays visible to everyone — the bar deliberately never changes
 * shape under a learned thumb — but the tools only render for the global
 * `dm` role. A player who taps through sees whose screen this is, not a 404:
 * the *existence* of DM tools is no secret at a table of friends, only their
 * use is gated. Everything the tools can actually do is enforced again on the
 * API routes and in the queries.
 */
export default async function DmHomePage() {
  const user = await requireSessionUser()

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              The DM tools need <code>DATABASE_URL</code>. The runbook is{' '}
              <code>.icm/docs/neon-database-setup.md</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const role = await getUserRole(user.id)

  if (role !== 'dm') {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">DM</h2>
          <p className="text-muted-foreground text-sm">Behind the screen.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This side of the screen is the DM&apos;s</CardTitle>
            <CardDescription>
              You&apos;re signed in as a player. Your characters live on{' '}
              <Link href="/characters" className="underline underline-offset-4">
                your characters
              </Link>
              ; if you&apos;ve been given a campaign join link, opening it is all you need to do.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const campaigns = await listCampaignsForDm(user.id)

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">DM</h2>
        <p className="text-muted-foreground text-sm">
          Behind the screen. Campaigns first — the party glance and encounters build on them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaigns</CardTitle>
          <CardDescription>
            One table, one campaign. Players join with the link on the campaign&apos;s page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaigns.length > 0 ? (
            <ul className="space-y-2">
              {campaigns.map((campaign) => (
                <li key={campaign.id}>
                  <Link
                    href={`/dm/campaigns/${campaign.id}`}
                    className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{campaign.name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {campaign.memberCount} {campaign.memberCount === 1 ? 'member' : 'members'} ·{' '}
                        {campaign.characterCount}{' '}
                        {campaign.characterCount === 1 ? 'character' : 'characters'}
                      </span>
                    </span>
                    <span aria-hidden className="text-muted-foreground">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No campaigns yet. Create the one your table plays.
            </p>
          )}

          <CreateCampaignForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Party at a glance</CardTitle>
          <CardDescription>
            Every character in a campaign you run on one screen — HP, AC, conditions and passive
            Perception, without opening six sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Not built yet (DND-030).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encounters and initiative</CardTitle>
          <CardDescription>
            An encounter you can step through by round, with each monster instance holding its own
            hit points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Not built yet (DND-031).</p>
        </CardContent>
      </Card>
    </main>
  )
}
