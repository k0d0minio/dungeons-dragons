import Link from 'next/link'

import { CreateCampaignForm } from '@/components/campaigns/create-campaign-form'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { listCampaignsForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DM',
}

/**
 * The DM surface's home (DND-029 D16, campaigns DND-046, role gate D19).
 *
 * Reached only by the global `dm` role: `src/app/dm/layout.tsx` sends a
 * player to their characters before any page under `/dm/` renders, and the
 * tab itself is not drawn for them (`user-management/invites-and-roles`).
 * Everything the tools can actually do is enforced again on the API routes
 * and in the queries.
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
              The DM tools need <code>DATABASE_URL</code> to be set. If you run this app, see the
              database runbook in the repo docs.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const campaigns = await listCampaignsForDm(user.id)

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="DM"
        subtitle="Behind the screen. Campaigns first — the party glance and encounters build on them."
      />

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

      {/* Between the campaigns and the note about where the tools live,
          because that is where a thumb already is mid-session — the crib is
          the one thing on this screen reached *during* play rather than
          before it (`dm-run-suite/dm-rules-crib`). */}
      <Card className="focus-within:ring-ring hover:bg-accent/40 relative focus-within:ring-2">
        <CardHeader>
          <CardTitle className="text-base">
            {/* The link is stretched over the whole card rather than the card
                being a link: the description below is part of the target, and
                a card-sized <a> would read its two sentences as the link. */}
            <Link
              href="/dm/crib"
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              The crib
            </Link>
          </CardTitle>
          <CardDescription>
            The tables you reach for mid-ruling — conditions, cover, DCs, what to do when someone
            hits 0. Also in the header of every encounter.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Accounts, not rosters: who has signed up at all, what they are, and
          the invite links that bring the next friend in
          (`user-management/invites-and-roles`). */}
      <Card className="focus-within:ring-ring hover:bg-accent/40 relative focus-within:ring-2">
        <CardHeader>
          <CardTitle className="text-base">
            <Link
              href="/dm/users"
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              Players &amp; invites
            </Link>
          </CardTitle>
          <CardDescription>
            Everyone with an account, whether or not they have joined a campaign yet. Make an invite
            link for the next friend, and set who is a player and who is a DM.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The party and the fights</CardTitle>
          <CardDescription>
            The party at a glance and the encounter tracker live on each campaign&apos;s page — open
            the campaign above to run the table.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
