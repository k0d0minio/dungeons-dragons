import { notFound } from 'next/navigation'

import { LocationRoster } from '@/components/campaigns/location-roster'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listCampaignLocations } from '@/lib/db/locations'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Places',
}

/**
 * A campaign's places (`dm-prep-suite/locations-handouts`).
 *
 * Its own page under `/dm/campaigns/[id]/`, reached from the Prep card, for the
 * reason the NPC roster is: the campaign page is what a DM opens mid-session to
 * see the party or start an encounter, and prep is a different visit.
 *
 * DM-scoped in the query — `campaigns.dm_user_id` and nowhere else — so someone
 * else's campaign id 404s here like it never existed. There is deliberately no
 * player route anywhere near this one: the party reads revealed places at
 * `/campaigns/[id]` (`dm-run-suite/player-campaign-view`), public layer only.
 * Nothing sets `revealed_at` yet — that is `dm-run-suite/reveal-controls`.
 */
export default async function CampaignLocationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  const locations = await listCampaignLocations(user.id, id)
  if (!locations) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Places"
        subtitle={`${campaign.name} · ${locations.length} ${locations.length === 1 ? 'place' : 'places'}`}
        backHref={`/dm/campaigns/${campaign.id}`}
        backLabel={campaign.name}
      />

      <LocationRoster campaignId={campaign.id} locations={locations} />
    </main>
  )
}
