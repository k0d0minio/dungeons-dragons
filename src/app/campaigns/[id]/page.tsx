import { notFound } from 'next/navigation'

import { DiscoveredHandouts } from '@/components/campaigns/discovered-handouts'
import { DiscoveredList } from '@/components/campaigns/discovered-list'
import { DiscoveredRefresh } from '@/components/campaigns/discovered-refresh'
import { NextNightCard } from '@/components/campaigns/next-night-card'
import { OnePageCard } from '@/components/campaigns/one-page-card'
import { PartyRoster } from '@/components/campaigns/party-roster'
import { RecapCard } from '@/components/campaigns/recap-card'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  getCampaignForMember,
  listDiscoveredHandouts,
  listDiscoveredLocations,
  listDiscoveredNpcs,
  listPartyForMember,
  nextAnnouncedNight,
} from '@/lib/db/discovered'
import { listCampaignRecaps } from '@/lib/db/notes'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Your campaign',
}

/**
 * The player's campaign view (`dm-run-suite/player-campaign-view`).
 *
 * Players have had no campaign surface at all — they join by code and then see
 * only their own sheet — and reveals need somewhere to land. This is that
 * place, and it is deliberately modest: who you play with, and what your DM has
 * shown you. Read-only, because everything on it belongs to someone else.
 *
 * **It is not a tab and not the home screen.** Jamie chose character-first as
 * the front door, so the only way here is the link at the foot of the sheet of
 * a character that is actually on this campaign. The URL is guessable, which is
 * why the page's first act is `getCampaignForMember`.
 *
 * Membership is asked in the data layer, not here: every query on this page
 * folds `campaign_members` into its own WHERE clause, so a campaign the reader
 * is not seated at 404s and each individual list would come back empty even if
 * this page forgot to check. The DM-only layers are not withheld by this page
 * either — they were never selected. See `src/lib/db/discovered.ts`.
 *
 * The top of the page is what a player reads *before* a session, in the order
 * they need it: **the one page** the table agreed on
 * (`first-table/session-zero-one-pager`, a column on the campaign row this page
 * already holds), **the next night** as the DM announced it
 * (`first-table/announce-the-night` — the title and the date, from a read that
 * selects nothing else), and the recap (`dm-run-suite/session-log-recap`).
 * Everything under those is reference the party browses. Players see
 * **recaps**, not the DM's notes: `listCampaignRecaps` selects three columns of
 * a note that is both shared and closed.
 *
 * **A closed campaign is its recap** (`first-table/one-night-campaign`): the
 * tutorial that ended on Thursday keeps this page, so "previously on…" has
 * somewhere to be read, and shows nothing else — no party, no discoveries, no
 * next night. The campaign has already left the player's sheet; this is the
 * one link that still reaches it, from the shared notes.
 *
 * **The lists are newest-first** (`dm-run-suite/reveal-controls`), decided in
 * the queries rather than here, and `DiscoveredRefresh` re-runs this page every
 * 15 s so the DM's reveal — or announcement — arrives on the phone without
 * anyone reloading. The page has no client-side data of its own: what refreshes
 * is this render, three arms and all.
 */
export default async function PlayerCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForMember(user.id, id)
  if (!campaign) notFound()

  if (campaign.closedAt !== null) {
    const recaps = await listCampaignRecaps(user.id, campaign.id)

    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
        <PageHeader
          title={campaign.name}
          subtitle="Your campaign"
          backHref="/characters"
          backLabel="Your character"
        />

        <p className="text-muted-foreground text-sm">This campaign has ended.</p>

        <RecapCard recaps={recaps} />
      </main>
    )
  }

  const [party, npcs, locations, handouts, recaps, nextNight] = await Promise.all([
    listPartyForMember(user.id, campaign.id),
    listDiscoveredNpcs(user.id, campaign.id),
    listDiscoveredLocations(user.id, campaign.id),
    listDiscoveredHandouts(user.id, campaign.id),
    listCampaignRecaps(user.id, campaign.id),
    nextAnnouncedNight(user.id, campaign.id),
  ])

  const discoveries = npcs.length + locations.length + handouts.length

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
      <PageHeader
        title={campaign.name}
        subtitle="Your campaign"
        backHref="/characters"
        backLabel="Your character"
      />

      <DiscoveredRefresh />

      <OnePageCard body={campaign.sessionZero} />

      <NextNightCard night={nextNight} />

      <RecapCard recaps={recaps} />

      <PartyRoster campaignId={campaign.id} party={party} />

      <DiscoveredList
        title="People you have met"
        description="Everyone your DM has introduced so far."
        entries={npcs}
      />

      <DiscoveredList
        title="Places you have found"
        description="Where you have been, as your DM described it."
        entries={locations}
      />

      <DiscoveredHandouts campaignId={campaign.id} handouts={handouts} />

      {/* One empty state for all three sections rather than three. A campaign
          before its first session has nothing revealed, and that is the normal
          state of this page rather than a fault to apologise for. */}
      {discoveries === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing discovered yet</CardTitle>
            <CardDescription>
              People you meet, places you find and anything your DM hands you will show up here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Your DM decides when. Until then this is just the party.
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}
