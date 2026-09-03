import { notFound } from 'next/navigation'

import { HandoutBoard } from '@/components/campaigns/handout-board'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listCampaignHandouts } from '@/lib/db/handouts'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Handouts',
}

/**
 * A campaign's handouts (`dm-prep-suite/locations-handouts`).
 *
 * DM-scoped in the query, like every other prep page. The pictures never come
 * down with this render: `listCampaignHandouts` returns image *metadata*, so
 * the RSC payload this page ships carries no store address — the browser asks
 * the authed image route for each picture it actually shows.
 */
export default async function CampaignHandoutsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  const handouts = await listCampaignHandouts(user.id, id)
  if (!handouts) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Handouts"
        subtitle={`${campaign.name} · ${handouts.length} ${handouts.length === 1 ? 'handout' : 'handouts'}`}
        backHref={`/dm/campaigns/${campaign.id}`}
        backLabel={campaign.name}
      />

      <HandoutBoard campaignId={campaign.id} handouts={handouts} />
    </main>
  )
}
