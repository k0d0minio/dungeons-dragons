import { notFound } from 'next/navigation'

import { CampaignGatesForm } from '@/components/campaigns/campaign-gates-form'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Campaign settings',
}

/**
 * How much of the sheet this campaign's players get
 * (`dm-prep-suite/campaign-feature-gates`, D40).
 *
 * Its own page under `/dm/campaigns/[id]/`, like the prep screens, and for the
 * same reason: this is a between-sessions decision made once and revisited when
 * the table has learned something, not a control anyone wants a tap away from
 * the party glance mid-fight.
 *
 * DM-scoped in the query — `campaigns.dm_user_id` and nowhere else — so a
 * campaign someone else runs 404s here like it never existed. There is
 * deliberately no player-facing route near this one: a player's sheet reads
 * the gates, and has nothing to say back.
 */
export default async function CampaignSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Player features"
        subtitle={campaign.name}
        backHref={`/dm/campaigns/${campaign.id}`}
        backLabel={campaign.name}
      />

      <CampaignGatesForm campaignId={campaign.id} gates={campaign.gates} />
    </main>
  )
}
